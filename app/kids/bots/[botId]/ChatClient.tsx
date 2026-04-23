'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';

type Msg = {
  role: 'user' | 'assistant';
  content: string;
  /** サーバーで moderation が hard-block / soft-flag の際のフラグ */
  blocked?: boolean;
  flag?: string;
  mocked?: boolean;
};

export function ChatClient({
  botId,
  botName,
}: {
  botId: string;
  botName: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content: `こんにちは。${botName} だよ。なんでも きいてみてね。`,
    },
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    setError(null);
    setInput('');
    const newUser: Msg = { role: 'user', content: text };
    setMessages((prev) => [...prev, newUser, { role: 'assistant', content: '' }]);
    setPending(true);

    try {
      const res = await fetch(`/api/chat/${botId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          history: messages.filter((m) => !m.blocked),
          message: text,
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        if (data?.blocked) {
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 2] = { ...newUser, blocked: true, flag: data.reason };
            copy[copy.length - 1] = {
              role: 'assistant',
              content:
                'そのことばは、せんせいや おうちの ひとに 相談してみようね。',
              blocked: true,
            };
            return copy;
          });
          return;
        }
        throw new Error(data?.error ?? '通信できなかったよ');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let mocked = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE 簡易パーサ
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const evt of events) {
          const line = evt.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const data = JSON.parse(payload);
            if (data.type === 'delta') {
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1]!;
                copy[copy.length - 1] = {
                  ...last,
                  content: last.content + data.delta,
                };
                return copy;
              });
            } else if (data.type === 'done') {
              mocked = data.mocked ?? false;
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1]!;
                copy[copy.length - 1] = {
                  ...last,
                  content: data.finalText ?? last.content,
                  mocked,
                };
                return copy;
              });
            } else if (data.type === 'error') {
              setError(data.message ?? 'うまく こたえられなかったよ');
            }
          } catch {
            // ignore malformed chunk
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        });
      });
    }
  }

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-kid-ink/5">
      <div
        ref={scrollRef}
        className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto px-2 py-2"
        aria-live="polite"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm sm:text-base ${
                m.role === 'user'
                  ? 'bg-kid-primary text-white'
                  : m.blocked
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-kid-soft text-kid-ink'
              }`}
            >
              {m.content || (m.role === 'assistant' && pending ? '…' : '')}
              {m.mocked && (
                <div className="mt-1 text-[10px] opacity-60">
                  (API キー未設定:開発モックの返答)
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-2 rounded-xl bg-red-50 p-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="mt-3 flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder="ここに きいてみよう"
          disabled={pending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button
          type="button"
          onClick={send}
          disabled={pending || input.trim().length === 0}
        >
          {pending ? '…' : '送信'}
        </Button>
      </div>
    </div>
  );
}
