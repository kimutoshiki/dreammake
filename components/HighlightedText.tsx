type Mark = { position: { start: number; end: number } };

export function HighlightedText({
  text,
  marks,
}: {
  text: string;
  marks: Mark[];
}) {
  if (marks.length === 0) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  const sorted = [...marks].sort((a, b) => a.position.start - b.position.start);
  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i]!;
    if (m.position.start < cursor) continue;
    parts.push(text.slice(cursor, m.position.start));
    parts.push(
      <mark
        key={`m-${i}`}
        className="rounded bg-kid-primary/15 px-0.5 text-kid-ink"
      >
        {text.slice(m.position.start, m.position.end)}
      </mark>,
    );
    cursor = m.position.end;
  }
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}
