import { describe, it, expect } from 'vitest';
import { DailyTimer, STORAGE_KEY, TimerEvent } from './timer';

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

function setup(opts: { limit?: number; visible?: boolean } = {}) {
  const storage = new MemStorage();
  let t = new Date(2026, 9, 16, 9, 0, 0).getTime();
  let visible = opts.visible ?? true;
  const timer = new DailyTimer({ storage, limitSeconds: opts.limit ?? 45 * 60, now: () => t, isVisible: () => visible });
  const events: TimerEvent[] = [];
  timer.on((e) => events.push(e));
  return {
    storage, timer, events,
    advance: (ms: number) => { t += ms; },
    setVisible: (v: boolean) => { visible = v; },
    makeTab: () => new DailyTimer({ storage, limitSeconds: opts.limit ?? 45 * 60, now: () => t, isVisible: () => visible }),
  };
}

describe('DailyTimer', () => {
  it('không đếm khi chưa vào trang chơi game', () => {
    const { timer, advance } = setup();
    advance(1000);
    expect(timer.tick()).toBe(false);
    expect(timer.remaining()).toBe(45 * 60);
  });

  it('đếm 1 giây mỗi lần tick khi đang chơi', () => {
    const { timer, advance } = setup();
    timer.setPlaying(true);
    for (let i = 0; i < 10; i++) { advance(1000); timer.tick(); }
    expect(timer.remaining()).toBe(45 * 60 - 10);
  });

  it('không đếm khi tab bị ẩn', () => {
    const { timer, advance, setVisible } = setup();
    timer.setPlaying(true);
    setVisible(false);
    advance(1000);
    expect(timer.tick()).toBe(false);
    expect(timer.remaining()).toBe(45 * 60);
  });

  it('hai tab cùng chơi không bị trừ gấp đôi', () => {
    const { timer, advance, makeTab } = setup();
    const tab2 = makeTab();
    timer.setPlaying(true);
    tab2.setPlaying(true);
    for (let i = 0; i < 20; i++) { advance(1000); timer.tick(); advance(5); tab2.tick(); }
    expect(timer.remaining()).toBe(45 * 60 - 20);
  });

  it('cảnh báo lúc còn 10 và 5 phút, mỗi mốc một lần', () => {
    const { timer, advance, events } = setup({ limit: 11 * 60 });
    timer.setPlaying(true);
    for (let i = 0; i < 11 * 60; i++) { advance(1000); timer.tick(); }
    const warnings = events.filter((e) => e.type === 'warning').map((e) => (e as any).minutesLeft);
    expect(warnings).toEqual([10, 5]);
    expect(events.filter((e) => e.type === 'timeUp')).toHaveLength(1);
    expect(timer.isTimeUp()).toBe(true);
  });

  it('hết giờ thì không đếm thêm', () => {
    const { timer, advance } = setup({ limit: 3 });
    timer.setPlaying(true);
    for (let i = 0; i < 10; i++) { advance(1000); timer.tick(); }
    expect(timer.remaining()).toBe(0);
  });

  it('sang ngày mới thì reset', () => {
    const { timer, advance } = setup({ limit: 3 });
    timer.setPlaying(true);
    for (let i = 0; i < 5; i++) { advance(1000); timer.tick(); }
    expect(timer.isTimeUp()).toBe(true);
    advance(24 * 3600 * 1000);
    expect(timer.remaining()).toBe(3);
  });

  it('dữ liệu hỏng thì bắt đầu lại từ đầu', () => {
    const { timer, storage } = setup();
    storage.setItem(STORAGE_KEY, '{không phải json');
    expect(timer.remaining()).toBe(45 * 60);
  });

  it('localStorage bị chặn vẫn chạy bằng bộ nhớ tạm', () => {
    const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } } as unknown as Storage;
    let t = 1_000_000;
    const timer = new DailyTimer({ storage: broken, now: () => t, isVisible: () => true });
    timer.setPlaying(true);
    t += 1000; timer.tick();
    t += 1000; timer.tick();
    expect(timer.remaining()).toBe(45 * 60 - 2);
  });
});
