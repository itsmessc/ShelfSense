import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export interface AuditEntry {
  id: number;
  entity_type: string;
  entity_id: number | null;
  action: string;
  summary: string;
  created_at: string;
}

export async function logAction(
  pool: Pool,
  entityType: string,
  entityId: number | null,
  action: string,
  summary: string,
): Promise<void> {
  await pool.execute<ResultSetHeader>(
    'INSERT INTO audit_logs (entity_type, entity_id, action, summary) VALUES (?, ?, ?, ?)',
    [entityType, entityId, action, summary],
  );
}

export async function findRecent(pool: Pool, limit = 100): Promise<AuditEntry[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, entity_type, entity_id, action, summary, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ${Number(limit)}`,
  );
  return rows as AuditEntry[];
}
