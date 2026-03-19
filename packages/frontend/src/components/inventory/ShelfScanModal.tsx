import { useRef, useState } from 'react';
import { Modal } from '../common/Modal.js';
import { scanShelf, type ScannedItem } from '../../api/client.js';

interface Props {
  onConfirm: (items: ScannedItem[]) => void;
  onClose: () => void;
}

const CONFIDENCE_CLS: Record<string, string> = {
  high:   'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low:    'bg-gray-50  text-gray-500  border-gray-200',
};

// Editable version of ScannedItem stored in state
type EditableItem = ScannedItem & { _selected: boolean; expiry_date: string };

function updateField<K extends keyof ScannedItem>(
  items: EditableItem[],
  index: number,
  field: K,
  value: ScannedItem[K],
): EditableItem[] {
  return items.map((item, i) => i === index ? { ...item, [field]: value } : item);
}

export function ShelfScanModal({ onConfirm, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview,      setPreview]      = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanning,     setScanning]     = useState(false);
  const [error,        setError]        = useState('');
  const [items,        setItems]        = useState<EditableItem[] | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setItems(null);
    setError('');
    setPreview(URL.createObjectURL(file));
  }

  async function handleScan() {
    if (!selectedFile) return;
    setScanning(true);
    setError('');
    try {
      const res = await scanShelf(selectedFile);
      setItems(res.items.map((item) => ({ ...item, _selected: true, expiry_date: '' })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  function toggleItem(i: number) {
    setItems((prev) => prev?.map((item, idx) =>
      idx === i ? { ...item, _selected: !item._selected } : item
    ) ?? null);
  }

  function removeItem(i: number) {
    setItems((prev) => prev?.filter((_, idx) => idx !== i) ?? null);
  }

  function addBlankRow() {
    const blank: EditableItem = {
      name: '', estimated_quantity: 1, unit: 'pcs', confidence: 'low', notes: '', expiry_date: '', _selected: true,
    };
    setItems((prev) => [...(prev ?? []), blank]);
  }

  function handleConfirm() {
    if (!items) return;
    const toAdd = items
      .filter((item) => item._selected && item.name.trim())
      .map(({ _selected: _, expiry_date, ...rest }) => ({
        ...rest,
        expiry_date: expiry_date?.trim() || null,
      }));
    onConfirm(toAdd);
  }

  const selectedCount = items?.filter((i) => i._selected && i.name.trim()).length ?? 0;

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">📷 Scan Shelf</h2>
            <p className="text-xs text-gray-500 mt-0.5">Upload a photo — AI detects items. Edit anything before adding.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Upload zone */}
          <div
            onClick={() => !items && fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
              items ? 'border-gray-200 cursor-default' : 'border-gray-300 cursor-pointer hover:border-brand-400 hover:bg-brand-50'
            }`}
          >
            {preview ? (
              <div className="flex items-center gap-4">
                <img src={preview} alt="shelf" className="h-28 rounded-lg object-contain border" />
                <div className="text-left text-sm">
                  <p className="font-medium text-gray-700 truncate max-w-[260px]">{selectedFile?.name}</p>
                  <p className="text-xs text-gray-400">{((selectedFile?.size ?? 0) / 1024).toFixed(0)} KB</p>
                  {!items && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreview(null); setSelectedFile(null); }}
                      className="text-xs text-red-400 hover:text-red-600 mt-1"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                <p className="text-4xl">🖼️</p>
                <p className="text-sm font-medium text-gray-700">Click to upload a shelf photo</p>
                <p className="text-xs text-gray-400">JPEG, PNG, WEBP supported</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Detected + editable items */}
          {items !== null && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                  {items.length === 0
                    ? 'No items detected — add manually below'
                    : `${items.length} item${items.length !== 1 ? 's' : ''} detected · edit before adding`}
                </h3>
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">🤖 AI-generated</span>
              </div>

              {/* Column headers */}
              {items.length > 0 && (
                <div className="grid grid-cols-[24px_1fr_88px_72px_80px_24px] gap-2 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <div />
                  <div>Name</div>
                  <div>Quantity</div>
                  <div>Unit</div>
                  <div>Confidence</div>
                  <div />
                </div>
              )}

              {items.map((item, i) => (
                <div
                  key={i}
                  className={`rounded-xl border px-3 py-2.5 transition-all space-y-2 ${
                    item._selected ? 'border-brand-300 bg-brand-50/50' : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  {/* Row 1: main fields */}
                  <div className="grid grid-cols-[24px_1fr_88px_72px_80px_24px] gap-2 items-center">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={item._selected}
                      onChange={() => toggleItem(i)}
                      className="accent-brand-600 w-4 h-4"
                    />

                    {/* Name */}
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => setItems((prev) => prev && updateField(prev, i, 'name', e.target.value))}
                      placeholder="Item name"
                      className="text-sm font-medium text-gray-900 bg-transparent border-b border-dashed border-gray-300 focus:border-brand-500 focus:outline-none w-full py-0.5 placeholder:text-gray-400"
                    />

                    {/* Quantity */}
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.estimated_quantity}
                      onChange={(e) => setItems((prev) => prev && updateField(prev, i, 'estimated_quantity', Number(e.target.value)))}
                      className="text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-brand-400 text-center"
                    />

                    {/* Unit */}
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => setItems((prev) => prev && updateField(prev, i, 'unit', e.target.value))}
                      placeholder="unit"
                      className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-brand-400 text-center"
                    />

                    {/* Confidence badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium text-center ${CONFIDENCE_CLS[item.confidence]}`}>
                      {item.confidence}
                    </span>

                    {/* Remove row */}
                    <button
                      onClick={() => removeItem(i)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-sm leading-none"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Row 2: expiry date */}
                  <div className="flex items-center gap-2 pl-7">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Expiry date
                    </label>
                    <input
                      type="date"
                      value={item.expiry_date}
                      onChange={(e) => setItems((prev) =>
                        prev?.map((r, idx) => idx === i ? { ...r, expiry_date: e.target.value } : r) ?? null
                      )}
                      className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                    {item.expiry_date && (
                      <button
                        onClick={() => setItems((prev) =>
                          prev?.map((r, idx) => idx === i ? { ...r, expiry_date: '' } : r) ?? null
                        )}
                        className="text-[10px] text-gray-400 hover:text-red-400"
                      >
                        clear
                      </button>
                    )}
                    {!item.expiry_date && (
                      <span className="text-[10px] text-gray-400 italic">optional</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Notes row (shown only for low confidence items as a hint) */}
              {items.some((i) => i.confidence === 'low' && i._selected) && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  ⚠️ Some items have low confidence — review names and quantities carefully before adding.
                </p>
              )}

              {/* Add row manually */}
              <button
                onClick={addBlankRow}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-2 text-sm text-gray-400 hover:border-brand-300 hover:text-brand-600 transition-colors"
              >
                + Add item manually
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            Cancel
          </button>
          <div className="flex gap-2">
            {selectedFile && !items && (
              <button
                onClick={handleScan}
                disabled={scanning}
                className="text-sm bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium flex items-center gap-2"
              >
                {scanning
                  ? <><span className="animate-spin">⏳</span> Scanning…</>
                  : '🔍 Scan with AI'}
              </button>
            )}
            {items !== null && (
              <>
                <button
                  onClick={() => { setItems(null); setPreview(null); setSelectedFile(null); setError(''); }}
                  className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Scan Again
                </button>
                {selectedCount > 0 && (
                  <button
                    onClick={handleConfirm}
                    className="text-sm bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 font-medium"
                  >
                    ✓ Add {selectedCount} item{selectedCount !== 1 ? 's' : ''} to Inventory
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
