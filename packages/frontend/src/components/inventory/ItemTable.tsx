import type { Item } from '../../types/index.js';

interface Props {
  items: Item[];
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onLogUsage: (item: Item) => void;
}

function expiryBadge(expiry_date: string | null) {
  if (!expiry_date) return null;
  const days = Math.round((new Date(expiry_date).getTime() - Date.now()) / 86400000);
  if (days < 0) return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Expired</span>;
  if (days <= 7) return <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{days}d left</span>;
  if (days <= 30) return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{days}d left</span>;
  return <span className="text-xs text-gray-400">{expiry_date}</span>;
}

function stockBadge(item: Item) {
  if (Number(item.reorder_threshold) === 0) return null;
  if (Number(item.quantity) <= 0) return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Out of stock</span>;
  if (Number(item.quantity) <= Number(item.reorder_threshold)) return <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Low stock</span>;
  return null;
}

export function ItemTable({ items, onEdit, onDelete, onLogUsage }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">📦</div>
        <p className="font-medium">No items found</p>
        <p className="text-sm mt-1">Add your first item to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
            <th className="pb-3 pr-4 font-medium">Name</th>
            <th className="pb-3 pr-4 font-medium">Category</th>
            <th className="pb-3 pr-4 font-medium">Quantity</th>
            <th className="pb-3 pr-4 font-medium">Expiry</th>
            <th className="pb-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-3 pr-4">
                <div className="font-medium text-gray-900">{item.name}</div>
                {stockBadge(item)}
              </td>
              <td className="py-3 pr-4">
                <span className="bg-brand-100 text-brand-700 text-xs px-2 py-0.5 rounded-full">
                  {item.category}
                </span>
              </td>
              <td className="py-3 pr-4 text-gray-700">
                {Number(item.quantity).toLocaleString()} {item.unit}
              </td>
              <td className="py-3 pr-4">{expiryBadge(item.expiry_date)}</td>
              <td className="py-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => onLogUsage(item)}
                    className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                    title="Log usage"
                  >
                    Use
                  </button>
                  <button
                    onClick={() => onEdit(item)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
