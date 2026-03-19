import { request } from './base.js';

export interface AuditEntry {
  id: number;
  entity_type: string;
  entity_id: number | null;
  action: string;
  summary: string;
  created_at: string;
}

export async function getAuditLog(): Promise<{ data: AuditEntry[] }> {
  return request('/api/audit');
}
