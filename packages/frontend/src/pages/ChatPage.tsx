import { useEffect, useRef, useState } from 'react';
import { request } from '../api/client.js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ai_generated?: boolean;
}

const STARTERS = [
  "What items are running critically low?",
  "Which items expire this week?",
  "What should I reorder today?",
  "How can I reduce waste in my inventory?",
  "Which categories have the most items?",
];

async function sendChat(message: string): Promise<{ reply: string; ai_generated: boolean }> {
  return request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm ShelfSense AI — your sustainable inventory assistant. I have full access to your current inventory. Ask me anything!",
      ai_generated: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await sendChat(msg);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.reply, ai_generated: res.ai_generated },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', ai_generated: false },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
          <span className="bg-brand-100 p-2 rounded-2xl">💬</span> AI Assistant
        </h1>
        <p className="text-sm font-medium text-gray-500 mt-2 flex items-center gap-2 italic">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          Powered by Gemini AI — ask about stock, expiry, or waste tips
        </p>
      </div>

      {/* Chat window */}
      <div className="flex-1 overflow-y-auto bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 space-y-6 min-h-0 bg-gradient-to-b from-white to-brand-50/20">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {msg.role === 'assistant' && (
              <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center text-lg shadow-lg shadow-brand-200 shrink-0 mb-2">
                🌿
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-3xl px-6 py-4 text-sm font-medium leading-relaxed shadow-sm break-words border ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white border-brand-500 rounded-br-lg'
                  : 'bg-white text-gray-800 border-gray-100 rounded-bl-lg'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <div className="flex items-center justify-between mt-3 opacity-60">
                <p className="text-[10px] font-black uppercase tracking-widest">
                  {msg.role === 'assistant' ? (msg.ai_generated ? '🤖 Gemini Insight' : '⚡ System') : '👤 You'}
                </p>
                <p className="text-[10px]">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start items-end gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-100 flex items-center justify-center text-lg shrink-0 mb-2 animate-pulse">
              🌿
            </div>
            <div className="bg-white border border-gray-100 rounded-3xl rounded-bl-lg px-6 py-4 shadow-sm">
              <div className="flex gap-1.5 item-center h-4">
                <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer Actions */}
      <div className="space-y-4">
        {/* Starter prompts */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2.5 px-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="text-xs font-bold bg-white text-brand-700 border border-brand-100 px-5 py-2.5 rounded-2xl hover:bg-brand-50 hover:border-brand-200 transition-all shadow-sm active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-3 bg-white p-3 rounded-[32px] border border-gray-100 shadow-2xl shadow-gray-200/50">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask anything about your inventory performance..."
            disabled={loading}
            className="flex-1 bg-transparent border-none rounded-full px-6 py-2 text-sm font-semibold focus:ring-0 placeholder:text-gray-400 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="bg-brand-600 text-white p-4 rounded-full hover:bg-brand-700 disabled:opacity-50 transition-all shadow-lg shadow-brand-200 active:scale-95 flex items-center justify-center min-w-[56px]"
          >
            <span className="text-xl">🚀</span>
          </button>
        </div>
      </div>
    </div>
  );
}
