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
  return <span className="text-xs text-gray-500">{expiry_date}</span>;
}

function SortBtn({ col, current, order, onSort }: { col: string; current?: string; order?: string; onSort?: (k: string) => void }) {
  const active = current === col;
  return (
    <button onClick={() => onSort?.(col)} className="ml-1 text-gray-400 hover:text-gray-700 text-xs">
      {active ? (order === 'asc' ? '▲' : '▼') : '⇅'}
    </button>
  );
}

export function ItemTable({ items, onEdit, onDelete, onLogUsage, onViewDetail, sortKey, sortOrder, onSort }: Props) {
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
        <thead>
          <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
            <th className="pb-3 pr-4 font-medium">
              Name <SortBtn col="name" current={sortKey} order={sortOrder} onSort={onSort} />
            </th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 pr-4 font-medium">Category</th>
            <th className="pb-3 pr-4 font-medium">
              Quantity <SortBtn col="quantity" current={sortKey} order={sortOrder} onSort={onSort} />
            </th>
            <th className="pb-3 pr-4 font-medium">
              Expiry <SortBtn col="expiry_date" current={sortKey} order={sortOrder} onSort={onSort} />
            </th>
            <th className="pb-3 pr-4 font-medium">Supplier</th>
            <th className="pb-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const status = item.alert_status ?? 'normal';
            const sc = STATUS_CONFIG[status];
            return (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 pr-4">
                  <button
                    onClick={() => onViewDetail(item)}
                    className="font-medium text-gray-900 hover:text-brand-700 text-left"
                  >
                    {item.name}
                  </button>
                  {item.cost_per_unit != null && (
                    <p className="text-xs text-gray-400">${Number(item.cost_per_unit).toFixed(2)}/{item.unit}</p>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>{sc.label}</span>
                </td>
                <td className="py-3 pr-4">
                  <span className="bg-brand-100 text-brand-700 text-xs px-2 py-0.5 rounded-full">{item.category}</span>
                </td>
                <td className="py-3 pr-4 text-gray-700">
                  {Number(item.quantity).toLocaleString()} {item.unit}
                  {Number(item.reorder_threshold) > 0 && (
                    <span className="text-xs text-gray-400 ml-1">(min {Number(item.reorder_threshold)})</span>
                  )}
                </td>
                <td className="py-3 pr-4"><ExpiryBadge expiry_date={item.expiry_date} /></td>
                <td className="py-3 pr-4 text-xs text-gray-500 truncate max-w-[120px]">{item.supplier ?? '—'}</td>
                <td className="py-3">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => onLogUsage(item)} className="text-xs text-brand-600 hover:text-brand-800 font-medium">Use</button>
                    <button onClick={() => onEdit(item)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                    <button onClick={() => onDelete(item)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
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
