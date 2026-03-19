/**
 * Barrel re-export — keeps backward compatibility with pages that still
 * import from `api/client`. New code should import from the domain module directly.
 *
 * e.g.  import { getItems } from '../api/items.js'
 *       import { getDashboard } from '../api/dashboard.js'
 */
export { request }                            from './base.js';
export type { ItemFilters, ScannedItem }      from './items.js';
export { getItems, getItem, createItem, updateItem, deleteItem, exportItems, importItems, scanShelf } from './items.js';
export { getRecentLogs, logUsage, getUsageHistory, batchLogUsage } from './usage.js';
export type { RecentLog }                                           from './usage.js';
export { getAuditLog }                                             from './audit.js';
export type { AuditEntry }                                         from './audit.js';
export { getDashboard }                                  from './dashboard.js';
export { getAnalytics }                                  from './analytics.js';
export type { AnalyticsData }                            from './analytics.js';
export { sendChatMessage }                               from './chat.js';
export { getReorderQueue }                               from './reorder.js';
export type { ReorderItem }                              from './reorder.js';
export { getSupplierSuggestions, generateForecast }      from './procurement.js';
