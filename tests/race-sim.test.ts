import { describe, expect, it } from 'vitest';
// @ts-expect-error file JS thuần, không có kiểu
import { Race, genTrack, pointsFor, LEN, LANES } from '../worker/race-sim.js';

const racers = (n: number, npc = true) =>
  Array.from({ length: n }, (_, i) => ({ slot: i, name: 'V' + i, npc }));

function run(race: any, maxT = 200, dt = 0.05) {
  let guard = 0;
  while (!race.shouldEnd() && guard++ < maxT / dt) race.step(dt);
  return race.ranking();
}

describe('genTrack', () => {
  it('cùng seed cho cùng đường đua', () => {
    expect(genTrack(123)).toEqual(genTrack(123));
    expect(genTrack(123)).not.toEqual(genTrack(124));
  });
  it('vật nằm trong đường đua, đúng làn, không chồng nhau cùng làn', () => {
    for (let s = 1; s < 60; s++) {
      const items = genTrack(s);
      expect(items.length).toBeGreaterThan(8);
      for (const it of items) {
        expect(it.lane).toBeGreaterThanOrEqual(0);
        expect(it.lane).toBeLessThan(LANES);
        expect(it.x).toBeGreaterThan(0);
        expect(it.x).toBeLessThan(LEN);
      }
      for (let l = 0; l < LANES; l++) {
        const xs = items.filter((i: any) => i.lane === l).map((i: any) => i.x).sort((a: number, b: number) => a - b);
        for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThan(100);
      }
    }
  });
});

describe('Race', () => {
  it('4 vịt máy đều về đích, thứ hạng đủ 1..4 và không trùng', () => {
    const r = new Race({ seed: 7, racers: racers(4) });
    const rk = run(r);
    expect(rk.map((x: any) => x.rank)).toEqual([1, 2, 3, 4]);
    expect(rk.every((x: any) => x.time !== null)).toBe(true);
  });
  it('vịt máy về đích trong khoảng 35–80 giây (nhiều seed)', () => {
    const times: number[] = [];
    for (let s = 1; s <= 30; s++) {
      const rk = run(new Race({ seed: s, racers: racers(4) }));
      rk.forEach((x: any) => times.push(x.time));
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log('thời gian vịt máy: trung bình %s, nhỏ nhất %s, lớn nhất %s', avg.toFixed(1), Math.min(...times), Math.max(...times));
    expect(Math.min(...times)).toBeGreaterThan(35);
    expect(Math.max(...times)).toBeLessThan(80);
  });
  it('lá sen làm chậm, vòng xoáy tăng tốc', () => {
    const r = new Race({ seed: 1, racers: [{ slot: 0, name: 'A', npc: false }] });
    const me = r.racers[0];
    r.items = [{ id: 0, k: 'pad', lane: 0, x: 200 }];
    me.lane = 0; me.x = 150; me.v = 60;
    let ev: any[] = [];
    for (let i = 0; i < 20; i++) ev = ev.concat(r.step(0.05));
    expect(ev.some((e) => e.k === 'pad')).toBe(true);
    expect(me.v).toBeLessThan(30);

    const r2 = new Race({ seed: 1, racers: [{ slot: 0, name: 'A', npc: false }] });
    const m2 = r2.racers[0];
    r2.items = [{ id: 0, k: 'boost', lane: 0, x: 200 }];
    m2.lane = 0; m2.x = 185; m2.v = 20;
    for (let i = 0; i < 30; i++) r2.step(0.05);
    expect(m2.v).toBeGreaterThan(30);
  });
  it('né được lá sen khi đổi làn kịp', () => {
    const r = new Race({ seed: 1, racers: [{ slot: 0, name: 'A', npc: false }] });
    const me = r.racers[0];
    r.items = [{ id: 0, k: 'pad', lane: 0, x: 200 }];
    me.lane = 0; me.x = 120; me.v = 60;
    expect(r.changeLane(0, 1)).toBe(true);
    let ev: any[] = [];
    for (let i = 0; i < 30; i++) ev = ev.concat(r.step(0.05));
    expect(ev.some((e) => e.k === 'pad')).toBe(false);
  });
  it('đổi làn có thời gian chờ và không ra ngoài biên', () => {
    const r = new Race({ seed: 1, racers: [{ slot: 0, name: 'A', npc: false }] });
    r.racers[0].lane = 0;
    expect(r.changeLane(0, -1)).toBe(false);
    expect(r.changeLane(0, 1)).toBe(true);
    expect(r.changeLane(0, 1)).toBe(false); // đang chờ
    r.step(0.35);
    expect(r.changeLane(0, 1)).toBe(true);
    expect(r.racers[0].lane).toBe(2);
  });
  it('quẫy liên tục thì hết sức bền và yếu dần; nghỉ thì hồi', () => {
    const r = new Race({ seed: 1, racers: [{ slot: 0, name: 'A', npc: false }] });
    const me = r.racers[0];
    r.items = [];
    for (let i = 0; i < 400; i++) { r.step(0.05); r.tap(0); }
    expect(me.stam).toBeLessThan(10);
    const v1 = me.v;
    for (let i = 0; i < 200; i++) r.step(0.05);
    expect(me.stam).toBeGreaterThan(60);
    expect(v1).toBeGreaterThan(20);
  });
  it('giới hạn tốc độ bấm (không gian lận bằng bấm quá nhanh)', () => {
    const r = new Race({ seed: 1, racers: [{ slot: 0, name: 'A', npc: false }] });
    let ok = 0;
    for (let i = 0; i < 100; i++) if (r.tap(0)) ok++;
    expect(ok).toBe(1); // không tiến thời gian: chỉ một cú được tính
  });
  it('vịt thật đứng yên vẫn về đích muộn; cuộc đua kết thúc sau 25 giây kể từ người đầu', () => {
    const r = new Race({ seed: 3, racers: [{ slot: 0, name: 'A', npc: false }, ...racers(3).map((x: any) => ({ ...x, slot: x.slot + 1 }))] });
    const rk = run(r);
    const me = rk.find((x: any) => x.slot === 0);
    expect(me.rank).toBe(4);
    expect(me.time).toBeNull();
    expect(me.pts).toBe(20);
  });
  it('người chơi rời giữa ván thì thành vịt máy và vẫn đua tiếp', () => {
    const r = new Race({ seed: 5, racers: [{ slot: 0, name: 'A', npc: false }, { slot: 1, name: 'B', npc: false }] });
    r.step(1);
    r.setNpc(0);
    expect(r.racers[0].npc).toBe(true);
    r.setNpc(1);
    const rk = run(r);
    expect(rk.every((x: any) => x.time !== null)).toBe(true);
  });
  it('điểm theo hạng và thời gian', () => {
    expect(pointsFor(1, 50)).toBe(370);
    expect(pointsFor(4, 70)).toBe(110);
    expect(pointsFor(1, 200)).toBe(300);
    expect(pointsFor(2, null)).toBe(20);
  });
});
