// Bảng xếp hạng top 5 trên máy chủ (Cloudflare Worker + D1). Mọi lỗi mạng đều im lặng bỏ qua:
// khi chạy local không có máy chủ này thì game vẫn chơi bình thường, chỉ không có bảng.
export const TOP_N = 5;
export interface Entry { name: string; score: number }

const NAME_KEY = 'grc.name.v1';
const API = `${import.meta.env.BASE_URL}api/scores`;

export function newSid(): string {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => x.toString(36).padStart(2, '0')).join('').slice(0, 24);
}

export function savedName(): string {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}
export function rememberName(n: string) {
  try { localStorage.setItem(NAME_KEY, n); } catch { /* bỏ qua */ }
}

export async function fetchTop(game: string): Promise<Entry[] | null> {
  try {
    const r = await fetch(`${API}/${game}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j.top) ? j.top : null;
  } catch { return null; }
}

export function qualifies(top: Entry[], score: number): boolean {
  return score > 0 && (top.length < TOP_N || score > top[top.length - 1].score);
}

export async function submitScore(game: string, sid: string, name: string, score: number): Promise<Entry[] | null> {
  try {
    const r = await fetch(API, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ game, sid, name, score }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j.top) ? j.top : null;
  } catch { return null; }
}
