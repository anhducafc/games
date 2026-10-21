// Phía cổng game của SDK: nhận tin từ game trong iframe, gửi lệnh xuống game.
import { savedName, rememberName } from './leaderboard';

const SCORES_KEY = 'grc.scores.v1';

export function getHighScore(gameId: string): number {
  try {
    const all = JSON.parse(localStorage.getItem(SCORES_KEY) || '{}');
    return Number(all[gameId]) || 0;
  } catch {
    return 0;
  }
}

function saveScore(gameId: string, score: number): boolean {
  try {
    const all = JSON.parse(localStorage.getItem(SCORES_KEY) || '{}');
    if (score > (Number(all[gameId]) || 0)) {
      all[gameId] = score;
      localStorage.setItem(SCORES_KEY, JSON.stringify(all));
      return true;
    }
  } catch {
    /* bỏ qua: chơi được nhưng không lưu điểm */
  }
  return false;
}

export interface Bridge {
  send(type: 'pause' | 'resume' | 'timeUp'): void;
  dispose(): void;
}

export function connectGame(
  iframe: HTMLIFrameElement,
  gameId: string,
  hooks: { onNewHighScore?: (score: number) => void; onScore?: (score: number) => void } = {},
): Bridge {
  const post = (type: string, data: unknown = null) => {
    iframe.contentWindow?.postMessage({ grc: 1, type, data }, '*');
  };

  const onMessage = (ev: MessageEvent) => {
    // chỉ nhận tin từ đúng iframe đang chơi (iframe sandbox có origin "null")
    if (ev.source !== iframe.contentWindow) return;
    const msg = ev.data;
    if (!msg || msg.grc !== 1 || typeof msg.type !== 'string') return;
    if (msg.type === 'ready') {
      post('init', { highScore: getHighScore(gameId), name: savedName() });
    } else if (msg.type === 'score') {
      const s = Math.max(0, Math.floor(Number(msg.data?.score) || 0));
      if (s > 0 && saveScore(gameId, s)) hooks.onNewHighScore?.(s);
      if (s > 0) hooks.onScore?.(s);
    } else if (msg.type === 'name') {
      // game nhiều người cho phép nhớ tên đã đặt (chỉ tên, tối đa 12 ký tự)
      const n = typeof msg.data?.name === 'string' ? Array.from(msg.data.name.replace(/[<>&"'`\\]/g, '').trim()).slice(0, 12).join('') : '';
      if (n) rememberName(n);
    }
  };

  window.addEventListener('message', onMessage);
  return {
    send: (type) => post(type),
    dispose: () => window.removeEventListener('message', onMessage),
  };
}
