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
  units,
  recentArtworks,
}: {
  note: {
    id: string;
    title: string;
    notes: string;
    unitId: string | null;
    locationNote: string | null;
  };
  attachedIds: string[];
  units: Array<{ id: string; title: string }>;
  recentArtworks: Artwork[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [unitId, setUnitId] = useState(note.unitId ?? '');
  const [locationNote, setLocationNote] = useState(note.locationNote ?? '');
  const [notes, setNotes] = useState(note.notes);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialAttached);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string, audios: Artwork[]) {
    const isAudio = audios.some((a) => a.id === id);
    setSelectedIds((prev) => {
      if (isAudio) {
        const withoutAudio = prev.filter((x) => !audios.some((a) => a.id === x));
        if (prev.includes(id)) return withoutAudio;
        return [...withoutAudio, id];
      }
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!title.trim()) {
      setErr('タイトルを 書いてね');
      return;
    }
    startTransition(async () => {
      const res = await updateFieldNote({
        id: note.id,
        title,
        unitId: unitId || undefined,
        locationNote: locationNote || undefined,
        notes: notes || undefined,
        artworkIds: selectedIds,
      });
      if (!res.ok) {
        setErr(res.message);
      } else {
        setMsg('ほぞんしました');
        router.push(`/kids/notebook/${note.id}`);
        router.refresh();
      }
    });
  }

  const photos = recentArtworks.filter((a) => a.kind === 'photo');
  const drawings = recentArtworks.filter((a) => a.kind === 'drawing');
  const audios = recentArtworks.filter((a) => a.kind === 'audio');

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
            <Label>単元</Label>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full rounded-xl border-2 border-kid-ink/10 bg-white px-4 py-3 outline-none focus:border-kid-primary"
            >
              <option value="">(えらばない)</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.title}
                </option>
              ))}
            </select>
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
        {recentArtworks.length === 0 && (
          <p className="mt-3 text-sm text-kid-ink/70">
            さくひんが ないよ。先に 📷・🎙️・🎨 で 作ってから 戻ってきてね。
          </p>
        )}
        {photos.length > 0 && (
          <Section title="📷 しゃしん">
            <Grid cols={4}>
              {photos.map((a) => (
                <Pick
                  key={a.id}
                  selected={selectedIds.includes(a.id)}
                  onClick={() => toggle(a.id, audios)}
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
                  onClick={() => toggle(a.id, audios)}
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
                  onClick={() => toggle(a.id, audios)}
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
      {msg && (
        <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{msg}</p>
      )}

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
    <div
      className={`grid gap-2 ${cols === 4 ? 'grid-cols-3 sm:grid-cols-4' : 'sm:grid-cols-2'}`}
    >
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
