'use client';

import { useRef, useState, useTransition } from 'react';
import { addKnowledgeCard } from '@/lib/actions/bot';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input, Label, Textarea } from '@/components/ui/Input';

export function AddKnowledgeForm({ botId }: { botId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    kind: 'ok' | 'err';
    text: string;
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await addKnowledgeCard(fd);
      if (result.ok) {
        setMessage({ kind: 'ok', text: '1まい たしたよ!' });
        formRef.current?.reset();
      } else {
        setMessage({ kind: 'err', text: result.message });
      }
    });
  }

  return (
    <Card>
      <CardTitle>➕ あたらしい Q&A を たす</CardTitle>
      <form ref={formRef} onSubmit={onSubmit} className="mt-4 space-y-4">
        <input type="hidden" name="botId" value={botId} />
        <div>
          <Label>❓ しつもん(なくても OK)</Label>
          <Input name="question" maxLength={300} />
        </div>
        <div>
          <Label>🤖 こたえ(児童の ことばで)</Label>
          <Textarea name="answer" required rows={3} maxLength={1500} />
        </div>

        <fieldset className="rounded-2xl bg-kid-soft p-4">
          <legend className="px-2 text-sm font-semibold">
            📚 どこから しらべた?(必ず 書いてね)
          </legend>
          <div className="mt-2 space-y-3">
            <div>
              <Label>しゅるい</Label>
              <select
                name="sourceKind"
                defaultValue="book"
                className="w-full rounded-xl border-2 border-kid-ink/10 bg-white px-4 py-3 outline-none focus:border-kid-primary"
              >
                <option value="book">本・図鑑</option>
                <option value="url">ネット</option>
                <option value="interview">取材・インタビュー</option>
                <option value="observation">自分で観察</option>
                <option value="other">その他</option>
              </select>
            </div>
            <div>
              <Label>タイトル(本の名前・サイト名・取材相手)</Label>
              <Input name="sourceTitle" required maxLength={200} />
            </div>
            <div>
              <Label>著者・取材した人(なくても OK)</Label>
              <Input name="sourceAuthor" maxLength={200} />
            </div>
            <div>
              <Label>URL(ネットなら)</Label>
              <Input name="sourceUrl" type="url" />
            </div>
          </div>
        </fieldset>

        {message && (
          <p
            className={`rounded-xl p-3 text-sm ${
              message.kind === 'ok'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'ほぞん中…' : 'ほぞんする'}
        </Button>
      </form>
    </Card>
  );
}
