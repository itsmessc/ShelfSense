import { request } from './base.js';

export async function sendChatMessage(
  message: string,
): Promise<{ reply: string; ai_generated: boolean }> {
  return request('/api/chat', { method: 'POST', body: JSON.stringify({ message }) });
}
