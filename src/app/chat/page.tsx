'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Taskbar from '@/components/Taskbar';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const systemPrompt = 'You are GPT 5 mini, a helpful assistant for the Black Swan project.';

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId(),
      role: 'assistant',
      content: 'Hi there! I am GPT 5 mini, ready to help you brainstorm, plan, or debug. What can I do for you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending) {
      return;
    }

    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    setError(null);

    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content: trimmed,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...nextMessages.map(({ role, content }) => ({ role, content })),
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as { reply?: string; error?: string };
      const assistantReply = data.reply;

      if (!assistantReply) {
        throw new Error(data.error ?? 'No reply from GPT 5 mini.');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: 'assistant',
          content: assistantReply,
        },
      ]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="p-6">
        <h1 className="text-white text-2xl font-bold">BLACK SWAN</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32">
        <div className="max-w-3xl mx-auto w-full space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed max-w-[85%] ${
                  message.role === 'user'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-900 text-gray-100 border border-gray-800'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-gray-800 bg-black/80 backdrop-blur">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto w-full px-6 pb-6 pt-4">
          <div className="flex gap-3">
            <textarea
              className="flex-1 resize-none rounded-xl bg-gray-900 border border-gray-800 text-gray-100 placeholder-gray-500 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500/60"
              placeholder="Ask GPT 5 mini anything..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={1}
              disabled={isSending}
            />
            <button
              type="submit"
              className="rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium px-5 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isSending || input.trim().length === 0}
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
          {error && (
            <p className="text-red-400 text-sm mt-3" role="alert">
              {error}
            </p>
          )}
        </form>

        <Taskbar showTopBorder />
      </div>
    </div>
  );
}
