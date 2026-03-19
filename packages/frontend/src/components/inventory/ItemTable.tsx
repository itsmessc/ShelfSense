import type { Item, AlertStatus } from '../../types/index.js';

interface Props {
  items: Item[];
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onLogUsage: (item: Item) => void;
  onViewDetail: (item: Item) => void;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  onToggleAll?: (allIds: number[]) => void;
}

const STATUS_CONFIG: Record<AlertStatus, { label: string; cls: string }> = {
  critical: { label: '🔴 Critical', cls: 'bg-red-100 text-red-700' },
  warning:  { label: '🟡 Warning',  cls: 'bg-amber-100 text-amber-700' },
  normal:   { label: '🟢 Normal',   cls: 'bg-green-100 text-green-700' },
};

function ExpiryBadge({ expiry_date }: { expiry_date: string | null }) {
  if (!expiry_date) return <span className="text-gray-400 text-xs">—</span>;
  const days = Math.round((new Date(expiry_date).getTime() - Date.now()) / 86400000);
  if (days < 0) return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Expired</span>;
  if (days <= 3) return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{days}d</span>;
  if (days <= 7) return <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{days}d</span>;
  if (days <= 30) return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{days}d</span>;
  
  const formatted = new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: '2-digit', 
    year: 'numeric' 
  }).format(new Date(expiry_date));
  
  return <span className="text-xs text-gray-500">{formatted}</span>;
}

function SortBtn({ col, current, order, onSort }: { col: string; current?: string; order?: string; onSort?: (k: string) => void }) {
  const active = current === col;
  return (
    <button onClick={() => onSort?.(col)} className="ml-1 text-gray-400 hover:text-gray-700 text-xs">
      {active ? (order === 'asc' ? '▲' : '▼') : '⇅'}
    </button>
  );
}

export function ItemTable({ items, onEdit, onDelete, onLogUsage, onViewDetail, sortKey, sortOrder, onSort, selectedIds, onToggleSelect, onToggleAll }: Props) {
  const hasBulk   = !!onToggleSelect;
  const allSelected = hasBulk && items.length > 0 && items.every((i) => selectedIds?.has(i.id));

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">📦</div>
        <p className="font-medium">No items found</p>
        <p className="text-sm mt-1">Try a different filter or add your first item</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50/50">
          <tr className="border-b text-left text-gray-500 text-[11px] font-bold uppercase tracking-wider">
            {hasBulk && (
              <th className="py-4 pl-6 pr-3 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onToggleAll?.(items.map((i) => i.id))}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
              </th>
            )}
            <th className="py-4 pr-4 min-w-[150px]">
              <div className="flex items-center">
                Name <SortBtn col="name" current={sortKey} order={sortOrder} onSort={onSort} />
              </div>
            </th>
            <th className="py-4 pr-4">Status</th>
            <th className="py-4 pr-4">Category</th>
            <th className="py-4 pr-4">
              <div className="flex items-center">
                Qty <SortBtn col="quantity" current={sortKey} order={sortOrder} onSort={onSort} />
              </div>
            </th>
            <th className="py-4 pr-4">
              <div className="flex items-center">
                Expiry <SortBtn col="expiry_date" current={sortKey} order={sortOrder} onSort={onSort} />
              </div>
            </th>
            <th className="py-4 pr-4">Supplier</th>
            <th className="py-4 pr-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const status  = item.alert_status ?? 'normal';
            const sc      = STATUS_CONFIG[status];
            const checked = selectedIds?.has(item.id) ?? false;
            return (
              <tr key={item.id} className={`group hover:bg-brand-50/30 transition-all duration-150 ${checked ? 'bg-brand-50' : ''}`}>
                {hasBulk && (
                  <td className="py-4 pl-6 pr-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleSelect?.(item.id)}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
                    />
                  </td>
                )}
                <td className="py-4 pr-4 max-w-[200px]">
                  <button
                    onClick={() => onViewDetail(item)}
                    title={item.name}
                    className="font-semibold text-gray-900 hover:text-brand-700 text-left block truncate w-full transition-colors"
                  >
                    {item.name}
                  </button>
                  {item.cost_per_unit != null && (
                    <p className="text-[10px] font-medium text-gray-400 mt-0.5">${Number(item.cost_per_unit).toFixed(2)}/{item.unit}</p>
                  )}
                </td>
                <td className="py-4 pr-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${sc.cls}`}>
                    {sc.label}
                  </span>
                </td>
                <td className="py-4 pr-4">
                  <span className="bg-white border border-brand-100 text-brand-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm truncate max-w-[100px] inline-block">
                    {item.category}
                  </span>
                </td>
                <td className="py-4 pr-4 text-gray-700 font-medium whitespace-nowrap">
                  {Number(item.quantity).toLocaleString()} <span className="text-gray-400 text-[10px] uppercase">{item.unit}</span>
                  {Number(item.reorder_threshold) > 0 && (
                    <p className="text-[10px] text-gray-400 font-normal">min {Number(item.reorder_threshold)}</p>
                  )}
                </td>
                <td className="py-4 pr-4 whitespace-nowrap"><ExpiryBadge expiry_date={item.expiry_date} /></td>
                <td className="py-4 pr-4 text-[11px] text-gray-500 italic max-w-[120px]">
                  <div className="truncate" title={item.supplier ?? ''}>
                    {item.supplier ?? '—'}
                  </div>
                </td>
                <td className="py-4 pr-6">
                  <div className="flex gap-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button onClick={() => onLogUsage(item)} className="p-1.5 text-brand-600 hover:bg-brand-100 rounded-lg transition-colors" title="Log Usage">
                      📝
                    </button>
                    <button onClick={() => onEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Edit">
                      ✏️
                    </button>
                    <button onClick={() => onDelete(item)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="Delete">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
