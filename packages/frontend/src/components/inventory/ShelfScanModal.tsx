import { useRef, useState } from 'react';
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

export function ShelfScanModal({ onConfirm, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState<ScannedItem[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setScanned(null);
    setError('');
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  async function handleScan() {
    if (!selectedFile) return;
    setScanning(true);
    setError('');
    try {
      const res = await scanShelf(selectedFile);
      setScanned(res.items);
      setSelected(new Set(res.items.map((_, i) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  function toggleItem(i: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function handleConfirm() {
    if (!scanned) return;
    onConfirm(scanned.filter((_, i) => selected.has(i)));
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">📷 Scan Shelf</h2>
            <p className="text-xs text-gray-500 mt-0.5">Upload a photo — Gemini AI will identify items automatically</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Upload zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors"
          >
            {preview ? (
              <img src={preview} alt="shelf preview" className="max-h-48 mx-auto rounded-lg object-contain" />
            ) : (
              <div className="space-y-2">
                <p className="text-4xl">🖼️</p>
                <p className="text-sm font-medium text-gray-700">Click to upload a shelf photo</p>
                <p className="text-xs text-gray-400">JPEG, PNG, WEBP supported</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {selectedFile && !scanned && (
            <p className="text-xs text-gray-400 text-center">{selectedFile.name} · {(selectedFile.size / 1024).toFixed(0)} KB</p>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Detected items */}
          {scanned && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                  {scanned.length === 0 ? 'No items detected' : `${scanned.length} item${scanned.length !== 1 ? 's' : ''} detected`}
                </h3>
                {scanned.length > 0 && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">🤖 AI-generated</span>
                )}
              </div>

              {scanned.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  AI couldn't identify any items. Try a clearer photo with better lighting.
                </p>
              )}

              {scanned.map((item, i) => (
                <label
                  key={i}
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                    selected.has(i) ? 'border-brand-400 bg-brand-50' : 'border-gray-200 bg-white opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={() => toggleItem(i)}
                    className="mt-0.5 accent-brand-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${CONFIDENCE_CLS[item.confidence]}`}>
                        {item.confidence} confidence
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      ~{item.estimated_quantity} {item.unit}
                      {item.notes && <span className="ml-1 text-gray-400">· {item.notes}</span>}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            Cancel
          </button>
          <div className="flex gap-2">
            {selectedFile && !scanned && (
              <button
                onClick={handleScan}
                disabled={scanning}
                className="text-sm bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium"
              >
                {scanning ? '🔍 Scanning…' : '🔍 Scan with AI'}
              </button>
            )}
            {scanned && selected.size > 0 && (
              <button
                onClick={handleConfirm}
                className="text-sm bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 font-medium"
              >
                ✓ Add {selected.size} item{selected.size !== 1 ? 's' : ''} to Inventory
              </button>
            )}
            {scanned && (
              <button
                onClick={() => { setScanned(null); setPreview(null); setSelectedFile(null); }}
                className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Scan Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
