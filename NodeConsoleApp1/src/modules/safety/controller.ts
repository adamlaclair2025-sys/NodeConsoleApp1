import { Request, Response } from 'express';
import { buildQuickExitPayload } from './service';

export class SafetyController {
  getQuickExit(_req: Request, res: Response): void {
    const payload = buildQuickExitPayload();
    res.json({ success: true, data: payload });
  }
}

export const safetyController = new SafetyController();
