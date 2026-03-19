import React from 'react';
import type { ItemBatch } from '../../types/index.js';

interface BatchManagerProps {
  batches: ItemBatch[];
  unit: string;
}

export function BatchManager({ batches, unit }: BatchManagerProps) {
  if (!batches || batches.length === 0) {
    return (
      <div className="bg-gray-50 rounded-2xl p-6 text-center text-gray-400 border-2 border-dashed border-gray-100 italic text-sm">
        No active batches found for this item.
      </div>
    );
  }

  const sorted = [...batches].sort((a, b) => {
    if (!a.expiry_date) return 1;
    if (!b.expiry_date) return -1;
    return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Batches</h3>
        <span className="text-[10px] font-black text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">{batches.length} BATCHES</span>
      </div>

      <div className="grid gap-2">
        {sorted.map((batch) => {
          const isExpired = batch.expiry_date && new Date(batch.expiry_date) < new Date();
          const isExpiringSoon = batch.expiry_date && !isExpired && (new Date(batch.expiry_date).getTime() - new Date().getTime()) < 86400000 * 7;

          return (
            <div 
              key={batch.id} 
              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all hover:translate-x-1 ${
                isExpired ? 'bg-red-50 border-red-100 opacity-80' : 
                isExpiringSoon ? 'bg-amber-50 border-amber-100' : 
                'bg-white border-gray-50'
              }`}
            >
              <div className="space-y-0.5">
                <p className="text-sm font-black text-gray-900">
                  {batch.quantity} <span className="text-[10px] text-gray-400 uppercase ml-1 font-bold">{unit}</span>
                </p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  RECEIVED {new Date(batch.received_at).toLocaleDateString()}
                </p>
              </div>

              <div className="text-right">
                <p className={`text-[10px] font-black uppercase tracking-widest ${
                  isExpired ? 'text-red-600' : 
                  isExpiringSoon ? 'text-amber-600' : 
                  'text-brand-600'
                }`}>
                  {batch.expiry_date ? `Expires ${batch.expiry_date}` : 'No Expiry'}
                </p>
                {isExpired && <span className="text-[9px] font-black text-red-500 bg-red-100 px-2 py-0.5 rounded-full uppercase">Expired</span>}
                {isExpiringSoon && <span className="text-[9px] font-black text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full uppercase">Soon</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
