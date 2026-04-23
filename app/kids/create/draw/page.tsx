import { Card, CardTitle } from '@/components/ui/Card';
import { DrawClient } from './DrawClient';

export default function DrawPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">🎨 おえかき</p>
        <CardTitle className="mt-1">じぶんで かいてみよう</CardTitle>
        <p className="mt-2 text-sm text-kid-ink/80">
          指でも、Apple Pencil でも かけるよ。
          筆の ふとさや 色は 下で かえられるよ。
        </p>
      </Card>
      <div className="mt-4">
        <DrawClient />
      </div>
    </main>
  );
}
