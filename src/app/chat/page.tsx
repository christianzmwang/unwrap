'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Taskbar from '@/components/Taskbar';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const systemPrompt = 'You are a helpful assistant for the Black Swan project.';

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId(),
      role: 'assistant',
      content: 'What are your questions?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = () => {
    setMessages([
      {
        id: createId(),
        role: 'assistant',
        content: 'What are your questions?',
      },
    ]);
    setInput('');
    setError(null);
  };

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
        throw new Error(data.error ?? 'No reply received.');
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
    <div className="h-screen bg-black flex flex-col">
      {/* Top header - BLACK SWAN */}
      <div className="px-6 py-4">
        <h1 className="text-white text-lg">BLACK SWAN</h1>
      </div>
      
      {/* Separator */}
      <div className="border-b border-gray-800"></div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto w-full space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`px-4 py-3 text-sm sm:text-base leading-relaxed max-w-[85%] ${
                  message.role === 'user'
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-900 text-gray-100 border border-gray-800'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start">
              <div className="bg-gray-900 text-gray-100 border border-gray-800 px-4 py-3 text-sm sm:text-base leading-relaxed max-w-[85%]">
                <div className="flex items-center gap-2">
                  <span>Thinking</span>
                  <div className="flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat input form */}
      <div className="border-t border-gray-800 bg-gray-900/50 backdrop-blur">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto w-full px-6 py-4">
          <div className="flex gap-3 items-center">
            <textarea
              className="flex-1 resize-none bg-gray-900 border border-gray-800 text-gray-100 placeholder-gray-500 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500/60"
              placeholder="Ask anything..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  const form = event.currentTarget.form;
                  if (form) {
                    form.requestSubmit();
                  }
                }
              }}
              rows={1}
              disabled={isSending}
            />
            <button
              type="submit"
              className="bg-gray-700 hover:bg-gray-600 text-white font-medium px-5 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isSending || input.trim().length === 0}
            >
              Send
            </button>
            <button
              type="button"
              onClick={handleNewChat}
              className="bg-gray-700 hover:bg-gray-600 text-white font-medium px-5 py-2 transition-colors"
            >
              New Chat
            </button>
          </div>
          {error && (
            <p className="text-gray-400 text-sm mt-3" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>

      {/* Bottom taskbar */}
      <div className="border-t border-gray-800 bg-black/80 backdrop-blur">
        <Taskbar />
      </div>
    </div>
  );
}
