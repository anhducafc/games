// Lõi mô phỏng đua vịt. Thuần JS, không phụ thuộc Cloudflare: dùng trong Durable Object và trong test.
// Đơn vị: quãng đường tính theo "đơn vị" (len = đích), thời gian tính giây.

export const LANES = 4;
export const LEN = 2400;
export const COLORS = ['#FFD23F', '#FF8FB1', '#7BD389', '#B79CFF'];
export const NPC_NAMES = ['Cạp Cạp', 'Lạch Bạch', 'Bông', 'Xù', 'Mướp', 'Bi Bo', 'Tèo Vịt', 'Nhím Nhí', 'Gạo', 'Kẹo', 'Bánh Bao', 'Đậu'];

// Hằng số vật lý (đã chỉnh để người chơi giỏi về đích khoảng 45–55 giây)
export const K = {
  DRAG: 1.0, // độ giảm tốc về tốc độ trôi
  FLOAT: 12, // tốc độ trôi khi không quẫy
  BOOST_ADD: 38, // vòng xoáy cộng thêm vào tốc độ trôi
  BOOST_T: 1.6,
  IMPULSE: 9, // mỗi cú quẫy cộng vào tốc độ
  VMAX: 110,
  STAM_MAX: 100,
  STAM_COST: 3,
  STAM_REGEN: 9,
  TIRED: 0.25, // hết sức: cú quẫy chỉ còn 25% lực
  TAP_GAP: 0.07, // giây tối thiểu giữa hai cú quẫy
  PAD_SLOW_T: 0.9,
  PAD_V: 0.3,
  PAD_CAP: 14,
  HIT_W: 22, // bán kính chạm vật (đơn vị)
  LANE_CD: 0.3,
};

export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sinh lá sen (pad) và vòng xoáy (boost). Cùng một làn cách nhau ít nhất minGap đơn vị. */
export function genTrack(seed, len = LEN) {
  const rnd = makeRng(seed);
  const items = [];
  const lastInLane = [-1e9, -1e9, -1e9, -1e9];
  const minGap = len * 0.11;
  let x = len * 0.1;
  let id = 0;
  while (x < len * 0.93) {
    const lane = Math.floor(rnd() * LANES);
    if (x - lastInLane[lane] >= minGap) {
      const kind = rnd() < 0.62 ? 'pad' : 'boost';
      items.push({ id: id++, k: kind, lane, x: Math.round(x) });
      lastInLane[lane] = x;
      // hay có cặp: lá sen cạnh vòng xoáy để người chơi phải chọn
      if (kind === 'pad' && rnd() < 0.4) {
        const nb = lane === 0 ? 1 : lane === LANES - 1 ? LANES - 2 : lane + (rnd() < 0.5 ? -1 : 1);
        if (x + 25 - lastInLane[nb] >= minGap) {
          items.push({ id: id++, k: 'boost', lane: nb, x: Math.round(x + 25) });
          lastInLane[nb] = x + 25;
        }
      }
    }
    x += len * (0.035 + rnd() * 0.05);
  }
  return items;
}

export function pointsFor(rank, time) {
  const base = [300, 200, 120, 60][rank - 1] ?? 60;
  if (time == null) return 20;
  return base + Math.max(0, Math.round(120 - time));
}

export class Race {
  /** racers: [{ slot, name, npc }] */
  constructor({ seed, len = LEN, racers }) {
    this.seed = seed >>> 0;
    this.len = len;
    this.items = genTrack(this.seed, len);
    this.rng = makeRng(this.seed ^ 0x9e3779b9);
    this.t = 0;
    this.firstFinish = null;
    this.racers = racers.map((r, i) => ({
      slot: r.slot,
      name: r.name,
      npc: !!r.npc,
      x: 0,
      v: K.FLOAT,
      lane: i % LANES,
      stam: K.STAM_MAX,
      slow: 0,
      boost: 0,
      laneCd: 0,
      lastTap: -1,
      finish: null,
      hit: new Set(),
      // dữ liệu cho vịt máy
      skill: 0.55 + this.rng() * 0.4,
      rest: false,
      nextTap: 0.3 + this.rng() * 0.4,
      plan: new Map(),
    }));
    this.bySlot = new Map(this.racers.map((r) => [r.slot, r]));
  }

  setNpc(slot) {
    const r = this.bySlot.get(slot);
    if (r && !r.npc) {
      r.npc = true;
      r.nextTap = this.t + 0.2;
    }
  }

  tap(slot) {
    const r = this.bySlot.get(slot);
    if (!r || r.npc || r.finish !== null) return false;
    return this._tap(r);
  }

  _tap(r) {
    if (this.t - r.lastTap < K.TAP_GAP) return false;
    r.lastTap = this.t;
    const eff = r.stam >= K.STAM_COST ? 1 : K.TIRED;
    r.stam = Math.max(0, r.stam - K.STAM_COST);
    const slowMul = r.slow > 0 ? 0.5 : 1;
    r.v = Math.min(K.VMAX, r.v + K.IMPULSE * eff * slowMul);
    return true;
  }

  /** d = -1 (lên, về làn nhỏ hơn) hoặc +1 (xuống). */
  changeLane(slot, d) {
    const r = this.bySlot.get(slot);
    if (!r || r.npc || r.finish !== null) return false;
    return this._lane(r, d);
  }

  _lane(r, d) {
    if (r.laneCd > 0) return false;
    const n = r.lane + (d < 0 ? -1 : 1);
    if (n < 0 || n >= LANES) return false;
    r.lane = n;
    r.laneCd = K.LANE_CD;
    return true;
  }

  /** Tiến mô phỏng dt giây. Trả về danh sách sự kiện [{slot,k,id}]. */
  step(dt) {
    this.t += dt;
    const events = [];
    for (const r of this.racers) {
      if (r.finish !== null) continue;
      if (r.npc) this._ai(r, dt);
      r.laneCd = Math.max(0, r.laneCd - dt);
      const prev = r.x;
      const target = K.FLOAT + (r.boost > 0 ? K.BOOST_ADD : 0);
      r.v += (target - r.v) * K.DRAG * dt;
      if (r.slow > 0) {
        r.v = Math.min(r.v, K.PAD_CAP);
        r.slow -= dt;
      }
      if (r.boost > 0) r.boost -= dt;
      r.stam = Math.min(K.STAM_MAX, r.stam + K.STAM_REGEN * dt);
      r.x += r.v * dt;
      for (const it of this.items) {
        if (it.lane !== r.lane || r.hit.has(it.id)) continue;
        if (it.x - K.HIT_W <= r.x && r.x <= it.x + K.HIT_W && prev <= it.x + K.HIT_W) {
          r.hit.add(it.id);
          if (it.k === 'pad') {
            r.slow = K.PAD_SLOW_T;
            r.v *= K.PAD_V;
          } else {
            r.boost = K.BOOST_T;
          }
          events.push({ slot: r.slot, k: it.k, id: it.id });
        }
      }
      if (r.x >= this.len) {
        r.x = this.len;
        r.finish = this.t;
        if (this.firstFinish === null) this.firstFinish = this.t;
        events.push({ slot: r.slot, k: 'finish' });
      }
    }
    return events;
  }

  _ai(r, dt) {
    // quẫy: biết nghỉ lấy sức
    if (r.rest && r.stam > 55) r.rest = false;
    if (!r.rest && r.stam < 18) r.rest = true;
    if (this.t >= r.nextTap) {
      const rate = r.rest ? 2.2 : 3.4 + 1.6 * r.skill;
      this._tap(r);
      r.nextTap = this.t + (1 / rate) * (0.8 + this.rng() * 0.4);
    }
    // đổi làn: nhìn trước, mỗi vật chỉ "quyết định" một lần (có xác suất sai theo skill)
    const look = 120 + r.v * 0.6;
    const ahead = (lane, lo, hi) =>
      this.items.find((it) => it.lane === lane && it.x - r.x > lo && it.x - r.x < hi && !r.hit.has(it.id));
    const own = ahead(r.lane, -10, look);
    if (own && own.k === 'pad' && !r.plan.has(own.id)) {
      const dodge = this.rng() < r.skill;
      r.plan.set(own.id, dodge);
    }
    const danger = own && own.k === 'pad' && r.plan.get(own.id);
    const cands = [r.lane - 1, r.lane + 1].filter((l) => l >= 0 && l < LANES);
    if (danger) {
      const safe = cands.filter((l) => !this.items.some((it) => it.lane === l && it.k === 'pad' && Math.abs(it.x - own.x) < 70));
      const withBoost = safe.find((l) => ahead(l, -10, look + 80)?.k === 'boost');
      const dir = withBoost ?? safe[0];
      if (dir !== undefined) this._lane(r, dir < r.lane ? -1 : 1);
    } else if (!own) {
      // lấy vòng xoáy ở làn kề nếu thấy
      for (const l of cands) {
        const b = ahead(l, 20, look + 60);
        if (b && b.k === 'boost' && !r.plan.has(b.id)) {
          const go = this.rng() < r.skill * 0.7;
          r.plan.set(b.id, go);
          if (go) this._lane(r, l < r.lane ? -1 : 1);
        }
      }
    }
  }

  ranking() {
    const arr = this.racers.slice().sort((a, b) => {
      if (a.finish !== null && b.finish !== null) return a.finish - b.finish;
      if (a.finish !== null) return -1;
      if (b.finish !== null) return 1;
      return b.x - a.x;
    });
    return arr.map((r, i) => ({
      slot: r.slot,
      name: r.name,
      npc: r.npc,
      rank: i + 1,
      time: r.finish === null ? null : Math.round(r.finish * 10) / 10,
      pts: pointsFor(i + 1, r.finish),
    }));
  }

  /** Cuộc đua kết thúc khi mọi người chơi thật đã về đích, hoặc quá 25 giây sau người đầu tiên, hoặc quá 150 giây. */
  shouldEnd() {
    const humans = this.racers.filter((r) => !r.npc);
    if (humans.length && humans.every((r) => r.finish !== null)) return true;
    if (!humans.length && this.racers.every((r) => r.finish !== null)) return true;
    if (this.firstFinish !== null && this.t - this.firstFinish > 25) return true;
    return this.t > 150;
  }

  snapshot() {
    return this.racers.map((r) => [
      r.slot,
      Math.round(r.x * 10) / 10,
      r.lane,
      Math.round(r.stam),
      Math.round(r.v * 10) / 10,
      (r.slow > 0 ? 1 : 0) | (r.boost > 0 ? 2 : 0) | (r.finish !== null ? 4 : 0),
    ]);
  }
}
