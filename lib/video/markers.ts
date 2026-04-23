/**
 * Artwork.videoScript (JSON) に 保存される 動画マーカー の型 + パーサ。
 * Server Action とは別ファイル(Client / Server 両方から呼べる)。
 */

export type VideoMarker = {
  t: number; // 秒
  label: string;
};

export function parseVideoMarkers(videoScript: string | null): VideoMarker[] {
  if (!videoScript) return [];
  try {
    const j = JSON.parse(videoScript) as { markers?: VideoMarker[] };
    if (!Array.isArray(j.markers)) return [];
    return j.markers
      .filter(
        (m): m is VideoMarker =>
          typeof m?.t === 'number' && typeof m?.label === 'string',
      )
      .sort((a, b) => a.t - b.t);
  } catch {
    return [];
  }
}
