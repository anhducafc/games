// Bộ đếm thời gian chơi trong ngày, lưu ở localStorage.
// - Chỉ đếm khi đang ở trang chơi game VÀ tab đang hiển thị.
// - Nhiều tab dùng chung một bộ đếm: tab nào vừa đếm trong vòng 900 ms thì tab khác bỏ qua,
//   nên mở 2 tab cùng lúc không bị trừ gấp đôi.
// - Tự reset khi sang ngày mới (theo giờ máy).
// - localStorage bị chặn thì vẫn chạy bằng bộ nhớ tạm (mất khi tải lại trang).

export const DEFAULT_LIMIT_SECONDS = 45 * 60;
export const STORAGE_KEY = 'grc.playtime.v1';

export interface TimerState {
  date: string;
  usedSeconds: number;
  lastTick: number;
  warned: number[]; // các mốc cảnh báo (số phút còn lại) đã hiện trong ngày
}

export type TimerEvent =
  | { type: 'change'; remaining: number }
  | { type: 'warning'; minutesLeft: number }
  | { type: 'timeUp' };

export interface TimerOptions {
  storage?: Storage | null;
  limitSeconds?: number;
  now?: () => number;
  isVisible?: () => boolean;
  warnAtMinutes?: number[];
}

export function localDateString(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export class DailyTimer {
  readonly limitSeconds: number;
  private storage: Storage | null;
  private memory: TimerState | null = null;
  private now: () => number;
  private isVisible: () => boolean;
  private warnAt: number[];
  private playing = false;
  private listeners = new Set<(e: TimerEvent) => void>();
  private timeUpFired = false;

  constructor(opts: TimerOptions = {}) {
    this.limitSeconds = opts.limitSeconds ?? DEFAULT_LIMIT_SECONDS;
    this.now = opts.now ?? (() => Date.now());
    this.isVisible = opts.isVisible ?? (() => typeof document === 'undefined' || document.visibilityState === 'visible');
    this.warnAt = opts.warnAtMinutes ?? [10, 5];
    this.storage = opts.storage === undefined ? safeLocalStorage() : opts.storage;
  }

  on(fn: (e: TimerEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(e: TimerEvent) {
    this.listeners.forEach((fn) => fn(e));
  }

  private fresh(): TimerState {
    return { date: localDateString(this.now()), usedSeconds: 0, lastTick: 0, warned: [] };
  }

  read(): TimerState {
    let s: TimerState | null = null;
    if (this.storage) {
      let raw: string | null = null;
      try {
        raw = this.storage.getItem(STORAGE_KEY);
      } catch {
        this.storage = null; // bị chặn: chuyển sang bộ nhớ tạm
      }
      if (raw) {
        try {
          s = JSON.parse(raw) as TimerState;
        } catch {
          s = null; // dữ liệu hỏng: bắt đầu lại
        }
      }
    }
    if (!this.storage) s = this.memory;
    if (!s || typeof s.usedSeconds !== 'number' || s.date !== localDateString(this.now())) {
      s = this.fresh();
      this.timeUpFired = false;
    }
    if (!Array.isArray(s.warned)) s.warned = [];
    return s;
  }

  private write(s: TimerState) {
    this.memory = s;
    if (this.storage) {
      try {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(s));
      } catch {
        this.storage = null;
      }
    }
  }

  remaining(): number {
    return Math.max(0, this.limitSeconds - this.read().usedSeconds);
  }

  isTimeUp(): boolean {
    return this.remaining() <= 0;
  }

  setPlaying(on: boolean) {
    this.playing = on;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  /** Gọi mỗi giây. Trả về true nếu giây này được tính. */
  tick(): boolean {
    if (!this.playing || !this.isVisible()) return false;
    const s = this.read();
    if (s.usedSeconds >= this.limitSeconds) {
      this.fireTimeUp();
      return false;
    }
    const t = this.now();
    if (t - s.lastTick < 900) return false; // tab khác vừa đếm giây này
    s.usedSeconds = Math.min(this.limitSeconds, s.usedSeconds + 1);
    s.lastTick = t;

    const left = this.limitSeconds - s.usedSeconds;
    const due = this.warnAt.filter((m) => left <= m * 60 && left > 0 && !s.warned.includes(m));
    if (due.length) s.warned.push(...due);
    this.write(s);

    this.emit({ type: 'change', remaining: left });
    if (due.length) this.emit({ type: 'warning', minutesLeft: Math.min(...due) });
    if (left <= 0) this.fireTimeUp();
    return true;
  }

  private fireTimeUp() {
    if (this.timeUpFired) return;
    this.timeUpFired = true;
    this.emit({ type: 'timeUp' });
  }

  /** Cập nhật giao diện khi tab khác thay đổi bộ đếm. */
  syncFromOtherTab() {
    const left = this.remaining();
    this.emit({ type: 'change', remaining: left });
    if (left <= 0) this.fireTimeUp();
  }
}

function safeLocalStorage(): Storage | null {
  try {
    const ls = window.localStorage;
    const k = '__grc_test__';
    ls.setItem(k, '1');
    ls.removeItem(k);
    return ls;
  } catch {
    return null;
  }
}

export function formatMinutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
