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
    <div className="flex flex-col h-screen p-8 space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">💬 AI Assistant</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ask Gemini AI anything about your inventory — stock levels, expiry, reorder suggestions, waste tips
        </p>
      </div>

      {/* Chat window */}
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border shadow-sm p-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs shrink-0 mr-2 mt-1">
                🌿
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-sm'
                  : 'bg-gray-50 text-gray-800 border rounded-bl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.role === 'assistant' && (
                <p className="text-xs mt-1.5 text-gray-400">
                  {msg.ai_generated ? '🤖 Gemini AI' : '⚡ Offline mode'}
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs shrink-0 mr-2">
              🌿
            </div>
            <div className="bg-gray-50 border rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Starter prompts */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2">
          {STARTERS.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              className="text-xs bg-brand-50 text-brand-700 border border-brand-200 px-3 py-1.5 rounded-full hover:bg-brand-100 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask about your inventory…"
          disabled={loading}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="bg-brand-600 text-white px-5 py-3 rounded-xl hover:bg-brand-700 disabled:opacity-50 font-medium text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}
