import { useState, useCallback } from 'react';
import { sendChatMessage } from '../api/chat.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ai_generated?: boolean;
}

export function useChat() {
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);
    try {
      const { reply, ai_generated } = await sendChatMessage(text);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, ai_generated },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}
