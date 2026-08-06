#!/usr/bin/env ts-node
/**
 * Mental Health Platform - Admin CLI
 * Utilities for platform management and operations
 */

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import prisma from '@/database/client';
import { hashPassword } from '@/auth/security';
import { logger } from '@/config/logger';

const argv = yargs(hideBin(process.argv));

// User management commands
const userCommands = {
  'list': async () => {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, status: true, createdAt: true },
      take: 50,
    });

    console.log('\n=== Active Users ===');
    console.table(users);
    process.exit(0);
  },

  'create': async (email: string, password: string, displayName: string) => {
    try {
      const hashedPassword = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          profile: {
            create: {
              displayName,
            },
          },
        },
      });

      console.log(`\n✓ User created: ${user.id}`);
      logger.info({ userId: user.id }, 'User created via CLI');
      process.exit(0);
    } catch (error) {
      console.error('✗ Failed to create user:', error);
      process.exit(1);
    }
  },

  'suspend': async (userId: string) => {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'suspended' },
      });

      console.log(`\n✓ User suspended: ${userId}`);
      logger.warn({ userId }, 'User suspended via CLI');
      process.exit(0);
    } catch (error) {
      console.error('✗ Failed to suspend user:', error);
      process.exit(1);
    }
  },

  'stats': async () => {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      deletedUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { status: 'suspended' } }),
      prisma.user.count({ where: { status: 'deleted' } }),
    ]);

    console.log('\n=== User Statistics ===');
    console.log(`Total Users:     ${totalUsers}`);
    console.log(`Active Users:    ${activeUsers}`);
    console.log(`Suspended Users: ${suspendedUsers}`);
    console.log(`Deleted Users:   ${deletedUsers}`);
    process.exit(0);
  },
};

// Moderation commands
const modCommands = {
  'reports': async () => {
    const [
      openReports,
      totalReports,
      reportsByReason,
    ] = await Promise.all([
      prisma.report.count({ where: { status: 'open' } }),
      prisma.report.count(),
      prisma.report.groupBy({
        by: ['reason'],
        _count: true,
      }),
    ]);

    console.log('\n=== Moderation Reports ===');
    console.log(`Total Reports:  ${totalReports}`);
    console.log(`Open Reports:   ${openReports}`);
    console.log('\nReports by Reason:');
    reportsByReason.forEach(r => {
      console.log(`  ${r.reason}: ${r._count}`);
    });
    process.exit(0);
  },

  'resolve': async (reportId: string) => {
    try {
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
        },
      });

      console.log(`\n✓ Report resolved: ${reportId}`);
      logger.info({ reportId }, 'Report resolved via CLI');
      process.exit(0);
    } catch (error) {
      console.error('✗ Failed to resolve report:', error);
      process.exit(1);
    }
  },
};

// Database commands
const dbCommands = {
  'migrate': async () => {
    console.log('✓ Running migrations...');
    console.log('Note: Run `npm run db:migrate` instead');
    process.exit(0);
  },

  'seed': async () => {
    console.log('✓ Running seed...');
    console.log('Note: Run `npm run db:seed` instead');
    process.exit(0);
  },

  'health': async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('\n✓ Database connection healthy');
      process.exit(0);
    } catch (error) {
      console.error('✗ Database connection failed:', error);
      process.exit(1);
    }
  },
};

// Analytics commands
const analyticsCommands = {
  'summary': async () => {
    const [
      users,
      posts,
      comments,
      communities,
      reports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.comment.count(),
      prisma.community.count(),
      prisma.report.count(),
    ]);

    console.log('\n=== Platform Summary ===');
    console.log(`Users:       ${users}`);
    console.log(`Posts:       ${posts}`);
    console.log(`Comments:    ${comments}`);
    console.log(`Communities: ${communities}`);
    console.log(`Reports:     ${reports}`);
    process.exit(0);
  },
};

// Main CLI setup
argv
  .command('user <action> [args..]', 'Manage users', (yargs) => {
    return yargs
      .positional('action', { choices: ['list', 'create', 'suspend', 'stats'] });
  }, (argv) => {
    const action = argv.action as keyof typeof userCommands;
    if (userCommands[action]) {
      userCommands[action](...(argv.args || []));
    }
  })
  .command('mod <action>', 'Moderation actions', (yargs) => {
    return yargs
      .positional('action', { choices: ['reports', 'resolve'] });
  }, (argv) => {
    const action = argv.action as keyof typeof modCommands;
    if (modCommands[action]) {
      modCommands[action](...(argv.args || []));
    }
  })
  .command('db <action>', 'Database operations', (yargs) => {
    return yargs
      .positional('action', { choices: ['migrate', 'seed', 'health'] });
  }, (argv) => {
    const action = argv.action as keyof typeof dbCommands;
    if (dbCommands[action]) {
      dbCommands[action]();
    }
  })
  .command('analytics <action>', 'Analytics commands', (yargs) => {
    return yargs
      .positional('action', { choices: ['summary'] });
  }, (argv) => {
    const action = argv.action as keyof typeof analyticsCommands;
    if (analyticsCommands[action]) {
      analyticsCommands[action]();
    }
  })
  .option('help', { alias: 'h', describe: 'Show help' })
  .strict()
  .demandCommand(1, 'You need to specify a command')
  .parseAsync();

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Error:', error);
  process.exit(1);
});
