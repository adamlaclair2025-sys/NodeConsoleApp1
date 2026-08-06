import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '@/config/logger';
import { verifyToken } from '@/auth/jwt';
import { messageService } from './message.service';
import { conversationService } from './conversation.service';
import { messageModerationService } from './moderation.service';
import type { JwtPayload } from '@/auth/jwt';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      requestId?: string;
    }
  }
}

interface SocketUser {
  id: string;
  email: string;
  displayName: string;
  connectedAt: Date;
}

interface SocketData {
  user?: SocketUser;
  conversationId?: string;
  typingTimeout?: NodeJS.Timeout;
}

export class WebSocketServer {
  private io: Server;
  private userConnections: Map<string, string[]> = new Map(); // userId -> socketIds[]
  private userTyping: Map<string, Set<string>> = new Map(); // conversationId -> Set of userIds typing

  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingInterval: 25000,
      pingTimeout: 60000,
      maxHttpBufferSize: 1e6, // 1MB
    });

    this.setupMiddleware();
    this.setupConnectionHandlers();
  }

  /**
   * Setup authentication and validation middleware
   */
  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Authentication error'));
        }

        const payload = verifyToken(token) as JwtPayload;
        if (!payload || !payload.userId) {
          return next(new Error('Invalid token'));
        }

        socket.data.user = {
          id: payload.userId,
          email: payload.email,
          displayName: payload.displayName || 'User',
          connectedAt: new Date(),
        };

        next();
      } catch (error) {
        logger.error({ error }, 'WebSocket authentication failed');
        next(new Error('Authentication error'));
      }
    });

    // Rate limiting middleware
    this.io.use((socket, next) => {
      const userId = socket.data.user?.id;
      if (!userId) return next(new Error('No user'));

      // Simple rate limit: max 100 events per minute
      const key = `ratelimit:${userId}`;
      // TODO: Implement with Redis for production
      next();
    });
  }

  /**
   * Setup connection and event handlers
   */
  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.user?.id;
      const displayName = socket.data.user?.displayName;

      logger.info(
        { userId, socketId: socket.id, displayName },
        'User connected'
      );

      // Track user connection
      if (userId) {
        if (!this.userConnections.has(userId)) {
          this.userConnections.set(userId, []);
        }
        this.userConnections.get(userId)!.push(socket.id);
      }

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Broadcast user online status
      this.io.emit('user.online', {
        userId,
        displayName,
        timestamp: new Date(),
      });

      // Setup event listeners
      this.setupMessageHandlers(socket);
      this.setupPresenceHandlers(socket);
      this.setupConversationHandlers(socket);
      this.setupDisconnectionHandler(socket);
    });
  }

  /**
   * Message event handlers
   */
  private setupMessageHandlers(socket: Socket): void {
    const userId = socket.data.user?.id;

    socket.on('message.send', async (payload, callback) => {
      try {
        const { conversationId, content, attachments } = payload;

        if (!conversationId || !content) {
          return callback({ error: 'Missing required fields' });
        }

        // Send to service
        const message = await messageService.sendMessage(userId, {
          conversationId,
          content,
          attachments: attachments || [],
        });

        // Emit to all members of conversation
        this.io.to(`conversation:${conversationId}`).emit('message.send', {
          id: message.id,
          author: message.author,
          content: message.content,
          attachments: message.attachments,
          createdAt: message.createdAt,
          conversationId,
        });

        // Send acknowledgment
        callback({ success: true, messageId: message.id });

        logger.info(
          { userId, conversationId, messageId: message.id },
          'Message sent via WebSocket'
        );
      } catch (error) {
        logger.error({ error, userId }, 'Error sending message');
        callback({ error: (error as Error).message });
      }
    });

    socket.on('message.edit', async (payload, callback) => {
      try {
        const { messageId, content } = payload;

        const message = await messageService.updateMessage(messageId, userId, {
          content,
        });

        // Get conversation ID from message
        const msg = await (await import('@/database/client')).default.message.findUnique({
          where: { id: messageId },
        });

        if (msg) {
          this.io.to(`conversation:${msg.conversationId}`).emit('message.edit', {
            id: message.id,
            content: message.content,
            editedAt: message.editedAt,
          });
        }

        callback({ success: true });
      } catch (error) {
        logger.error({ error, userId }, 'Error editing message');
        callback({ error: (error as Error).message });
      }
    });

    socket.on('message.delete', async (payload, callback) => {
      try {
        const { messageId, conversationId } = payload;

        await messageService.deleteMessage(messageId, userId);

        this.io.to(`conversation:${conversationId}`).emit('message.delete', {
          id: messageId,
        });

        callback({ success: true });
      } catch (error) {
        logger.error({ error, userId }, 'Error deleting message');
        callback({ error: (error as Error).message });
      }
    });

    socket.on('message.read', async (payload) => {
      try {
        const { messageId, conversationId } = payload;

        await messageService.markAsRead(messageId, userId, conversationId);

        // Emit read receipt to conversation
        this.io.to(`conversation:${conversationId}`).emit('message.read', {
          messageId,
          userId,
          readAt: new Date(),
        });
      } catch (error) {
        logger.error({ error, userId }, 'Error marking message as read');
      }
    });
  }

  /**
   * Presence and typing handlers
   */
  private setupPresenceHandlers(socket: Socket): void {
    const userId = socket.data.user?.id;
    const displayName = socket.data.user?.displayName;

    socket.on('presence.join', (payload) => {
      const { conversationId } = payload;

      if (!conversationId) return;

      // Join conversation room
      socket.join(`conversation:${conversationId}`);
      socket.data.conversationId = conversationId;

      // Notify others
      this.io.to(`conversation:${conversationId}`).emit('presence.user-joined', {
        userId,
        displayName,
        conversationId,
      });

      logger.debug(
        { userId, conversationId },
        'User joined conversation'
      );
    });

    socket.on('presence.leave', (payload) => {
      const { conversationId } = payload;

      if (!conversationId) return;

      socket.leave(`conversation:${conversationId}`);

      this.io.to(`conversation:${conversationId}`).emit('presence.user-left', {
        userId,
        conversationId,
      });

      logger.debug(
        { userId, conversationId },
        'User left conversation'
      );
    });

    socket.on('typing.start', (payload) => {
      const { conversationId } = payload;

      if (!conversationId) return;

      // Track typing
      if (!this.userTyping.has(conversationId)) {
        this.userTyping.set(conversationId, new Set());
      }
      this.userTyping.get(conversationId)!.add(userId);

      // Clear existing timeout
      if (socket.data.typingTimeout) {
        clearTimeout(socket.data.typingTimeout);
      }

      // Broadcast typing
      this.io.to(`conversation:${conversationId}`).emit('typing.indicator', {
        userId,
        displayName,
        isTyping: true,
        conversationId,
      });

      // Auto-stop typing after 3 seconds
      socket.data.typingTimeout = setTimeout(() => {
        this.userTyping.get(conversationId)?.delete(userId);
        this.io.to(`conversation:${conversationId}`).emit('typing.indicator', {
          userId,
          isTyping: false,
          conversationId,
        });
      }, 3000);
    });

    socket.on('typing.stop', (payload) => {
      const { conversationId } = payload;

      if (!conversationId) return;

      // Clear typing
      this.userTyping.get(conversationId)?.delete(userId);

      // Clear timeout
      if (socket.data.typingTimeout) {
        clearTimeout(socket.data.typingTimeout);
      }

      // Broadcast stop
      this.io.to(`conversation:${conversationId}`).emit('typing.indicator', {
        userId,
        isTyping: false,
        conversationId,
      });
    });
  }

  /**
   * Conversation manager handlers
   */
  private setupConversationHandlers(socket: Socket): void {
    const userId = socket.data.user?.id;

    socket.on('conversation.subscribe', async (payload, callback) => {
      try {
        const { conversationId } = payload;

        const conversation = await conversationService.getConversation(
          conversationId,
          userId
        );

        socket.join(`conversation:${conversationId}`);

        callback({ success: true, conversation });
      } catch (error) {
        callback({ error: (error as Error).message });
      }
    });

    socket.on('conversation.unsubscribe', (payload) => {
      const { conversationId } = payload;
      socket.leave(`conversation:${conversationId}`);
    });
  }

  /**
   * Disconnect handler
   */
  private setupDisconnectionHandler(socket: Socket): void {
    socket.on('disconnect', () => {
      const userId = socket.data.user?.id;

      logger.info(
        { userId, socketId: socket.id },
        'User disconnected'
      );

      // Remove from user connections
      if (userId) {
        const connections = this.userConnections.get(userId) || [];
        const remaining = connections.filter((id) => id !== socket.id);

        if (remaining.length > 0) {
          this.userConnections.set(userId, remaining);
        } else {
          this.userConnections.delete(userId);

          // Broadcast user offline
          this.io.emit('user.offline', {
            userId,
            timestamp: new Date(),
          });
        }
      }

      // Clear typing
      if (socket.data.conversationId) {
        this.userTyping.get(socket.data.conversationId)?.delete(userId);
      }

      if (socket.data.typingTimeout) {
        clearTimeout(socket.data.typingTimeout);
      }
    });
  }

  /**
   * Broadcast message to specific users
   */
  public notifyUsers(userIds: string[], event: string, data: any): void {
    userIds.forEach((userId) => {
      this.io.to(`user:${userId}`).emit(event, data);
    });
  }

  /**
   * Broadcast message to conversation
   */
  public notifyConversation(conversationId: string, event: string, data: any): void {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }

  /**
   * Get number of active connections for user
   */
  public getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.length || 0;
  }

  /**
   * Get server instance (for integration with Express)
   */
  public getServer(): Server {
    return this.io;
  }
}

export let wsServer: WebSocketServer;

export function initializeWebSocketServer(httpServer: HTTPServer): WebSocketServer {
  wsServer = new WebSocketServer(httpServer);
  logger.info('WebSocket server initialized');
  return wsServer;
}
