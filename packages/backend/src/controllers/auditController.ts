import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../db/connection.js';
import * as auditRepo from '../repositories/auditRepository.js';

export async function getAuditLog(_req: Request, res: Response, next: NextFunction) {
  try {
    const entries = await auditRepo.findRecent(getPool(), 200);
    res.json({ data: entries });
  } catch (err) { next(err); }
}
