'use client';

import { useState, useTransition } from 'react';
import { createFieldNote } from '@/lib/actions/notebook';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Label, Textarea } from '@/components/ui/Input';

type Artwork = {
  id: string;
  kind: string;
  title: string;
  imageUrl: string | null;
  audioUrl: string | null;
  audioTranscript: string | null;
  createdAt: string;
};

export function NewNotebookClient({
  recentArtworks,
}: {
  recentArtworks: Artwork[];
}) {
  const [title, setTitle] = useState('');
  const [locationNote, setLocationNote] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const photos = recentArtworks.filter((a) => a.kind === 'photo');
  const drawings = recentArtworks.filter((a) => a.kind === 'drawing');
  const audios = recentArtworks.filter((a) => a.kind === 'audio');

  function toggle(id: string, isAudio = false) {
    setSelectedIds((prev) => {
      if (isAudio) {
        const withoutAudios = prev.filter((x) => !audios.some((a) => a.id === x));
        if (prev.includes(id)) return withoutAudios;
        return [...withoutAudios, id];
      }
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) {
      setErr('タイトルを 書いてね');
      return;
    }
    startTransition(async () => {
      const res = await createFieldNote({
        title,
        locationNote: locationNote || undefined,
        notes: notes || undefined,
        artworkIds: selectedIds,
      });
      if (res && !res.ok) setErr(res.message);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card>
        <div className="space-y-3">
          <div>
            <Label>タイトル(ひつよう)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="例:商店街の パンやさんの 話"
              required
            />
          </div>
          <div>
            <Label>場所メモ(自由)</Label>
            <Input
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              maxLength={200}
              placeholder="例:学校の となりの 商店街"
            />
          </div>
          <div>
            <Label>気づき(自由)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="今日 気づいたこと・話したこと・気になったこと…"
            />
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-sm font-semibold">🔗 さくひんを つける</p>
        <p className="mt-1 text-xs text-kid-ink/60">
          さきに 作った しゃしん・ろくおん・おえかき を ここに 束ねるよ。
        </p>

        {recentArtworks.length === 0 && (
          <p className="mt-3 rounded-xl bg-kid-soft p-3 text-sm text-kid-ink/70">
            まだ さくひんが ないよ。
            <a href="/kids/create/photo" className="ml-2 text-kid-primary underline">
              📷
            </a>
            ・
            <a href="/kids/create/audio" className="text-kid-primary underline">
              🎙️
            </a>
            ・
            <a href="/kids/create/draw" className="text-kid-primary underline">
              🎨
            </a>
            で 作ってから もどってきてね。
          </p>
        )}

        {photos.length > 0 && (
          <Section title="📷 しゃしん">
            <Grid cols={4}>
              {photos.map((a) => (
                <Pick
                  key={a.id}
                  selected={selectedIds.includes(a.id)}
                  onClick={() => toggle(a.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.imageUrl ?? ''}
                    alt=""
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                  <p className="mt-1 truncate text-[11px]">{a.title}</p>
                </Pick>
              ))}
            </Grid>
          </Section>
        )}

        {drawings.length > 0 && (
          <Section title="🎨 おえかき">
            <Grid cols={4}>
              {drawings.map((a) => (
                <Pick
                  key={a.id}
                  selected={selectedIds.includes(a.id)}
                  onClick={() => toggle(a.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.imageUrl ?? ''}
                    alt=""
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                  <p className="mt-1 truncate text-[11px]">{a.title}</p>
                </Pick>
              ))}
            </Grid>
          </Section>
        )}

        {audios.length > 0 && (
          <Section title="🎙️ ろくおん(1 つだけ)">
            <Grid cols={2}>
              {audios.map((a) => (
                <Pick
                  key={a.id}
                  selected={selectedIds.includes(a.id)}
                  onClick={() => toggle(a.id, true)}
                  padded
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🎙️</span>
                    <span className="truncate text-sm">{a.title}</span>
                  </div>
                  {a.audioTranscript && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-kid-ink/60">
                      {a.audioTranscript}
                    </p>
                  )}
                </Pick>
              ))}
            </Grid>
          </Section>
        )}
      </Card>

      {err && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'ほぞん中…' : '💾 ノートを ほぞん'}
      </Button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-kid-ink/70">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Grid({ cols, children }: { cols: 2 | 4; children: React.ReactNode }) {
  return (
    <div className={`grid gap-2 ${cols === 4 ? 'grid-cols-3 sm:grid-cols-4' : 'sm:grid-cols-2'}`}>
      {children}
    </div>
  );
}

function Pick({
  selected,
  onClick,
  children,
  padded,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-xl border-2 text-left ${
        selected
          ? 'border-kid-primary ring-2 ring-kid-primary'
          : 'border-kid-ink/10 hover:border-kid-primary/50'
      } ${padded ? 'p-2' : ''}`}
    >
      {children}
      {selected && (
        <span className="absolute right-1 top-1 rounded-full bg-kid-primary px-1.5 text-[10px] text-white">
          ✓
        </span>
      )}
    </button>
  );
}
