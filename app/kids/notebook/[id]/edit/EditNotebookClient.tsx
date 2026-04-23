'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updateFieldNote } from '@/lib/actions/notebook';
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

export function EditNotebookClient({
  note,
  attachedIds: initialAttached,
  recentArtworks,
}: {
  note: {
    id: string;
    title: string;
    notes: string;
    locationNote: string | null;
  };
  attachedIds: string[];
  recentArtworks: Artwork[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [locationNote, setLocationNote] = useState(note.locationNote ?? '');
  const [notes, setNotes] = useState(note.notes);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialAttached);
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
      const res = await updateFieldNote({
        id: note.id,
        title,
        locationNote: locationNote || undefined,
        notes: notes || undefined,
        artworkIds: selectedIds,
      });
      if (!res.ok) {
        setErr(res.message);
      } else {
        router.push(`/kids/notebook/${note.id}`);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card>
        <div className="space-y-3">
          <div>
            <Label>タイトル</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              required
            />
          </div>
          <div>
            <Label>場所メモ</Label>
            <Input
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              maxLength={200}
            />
          </div>
          <div>
            <Label>気づき</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              maxLength={4000}
            />
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-sm font-semibold">🔗 さくひんを つける</p>
        {photos.length > 0 && (
          <Block title="📷 しゃしん">
            {photos.map((a) => (
              <Pick key={a.id} selected={selectedIds.includes(a.id)} onClick={() => toggle(a.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.imageUrl ?? ''} alt="" className="aspect-square w-full rounded-lg object-cover" />
              </Pick>
            ))}
          </Block>
        )}
        {drawings.length > 0 && (
          <Block title="🎨 おえかき">
            {drawings.map((a) => (
              <Pick key={a.id} selected={selectedIds.includes(a.id)} onClick={() => toggle(a.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.imageUrl ?? ''} alt="" className="aspect-square w-full rounded-lg object-cover" />
              </Pick>
            ))}
          </Block>
        )}
        {audios.length > 0 && (
          <Block title="🎙️ ろくおん(1 つだけ)" cols={2}>
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
              </Pick>
            ))}
          </Block>
        )}
      </Card>

      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? 'ほぞん中…' : '💾 ほぞん'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/kids/notebook/${note.id}`)}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}

function Block({
  title,
  cols = 4,
  children,
}: {
  title: string;
  cols?: 2 | 4;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-kid-ink/70">{title}</p>
      <div
        className={`mt-2 grid gap-2 ${
          cols === 4 ? 'grid-cols-3 sm:grid-cols-4' : 'sm:grid-cols-2'
        }`}
      >
        {children}
      </div>
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
