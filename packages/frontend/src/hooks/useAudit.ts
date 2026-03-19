import { useState, useCallback } from 'react';
import { getAuditLog } from '../api/audit.js';
import type { AuditEntry } from '../api/audit.js';

export function useAudit() {
  const [entries, setEntries]     = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await getAuditLog();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { entries, isLoading, error, fetchAudit };
}
