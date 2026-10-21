// Một phòng đua vịt (Durable Object). Mọi trạng thái nằm trong bộ nhớ, không lưu tên hay IP.
// Giao thức JSON qua WebSocket:
//  client -> server: {t:'join',name} {t:'start'} {t:'tap'} {t:'lane',d:-1|1} {t:'again'}
//  server -> client: {t:'room',...} {t:'track',...} {t:'s',...} {t:'end',...} {t:'err',code} {t:'bye'}
import { isNameAllowed } from '../src/profanity.ts';
import { cleanName } from './names.js';
import { Race, COLORS, NPC_NAMES, LEN } from './race-sim.js';

const MAX = 4;
const TICK = 0.05;

function num(v, def) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
}

export class RaceRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.id = '';
    this.conns = new Set();
    this.phase = 'lobby'; // lobby | countdown | racing | results | dead
    this.race = null;
    this.openedAt = Date.now();
    this.lastOpen = null;
    this.timers = { lobby: null, cd: null, tick: null, results: null };
    this.acc = 0;
    this.last = 0;
    this.pending = [];
    this.tickN = 0;
    this.away = new Map(); // token -> người chơi đang mất kết nối tạm thời (được giữ chỗ vài chục giây)
    this.lastEnd = null;
    // thông số (có thể chỉnh bằng biến môi trường khi chạy thử, không cần khai báo khi deploy)
    this.cfg = {
      len: num(env.RACE_LEN, LEN),
      solo: num(env.RACE_SOLO_WAIT, 15),
      cd: num(env.RACE_CD, 3),
      lobbyMax: num(env.RACE_LOBBY_MAX, 180),
      grace: num(env.RACE_GRACE, 25),
    };
  }

  fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('cần WebSocket', { status: 426 });
    this.id = new URL(request.url).searchParams.get('room') || this.id;
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    this.onConnect(server, new URL(request.url).searchParams.get('tok'));
    return new Response(null, { status: 101, webSocket: client });
  }

  humans() {
    return [...this.conns].filter((c) => c.joined);
  }

  onConnect(ws, resumeTok) {
    const c = { ws, joined: false, slot: -1, name: '', n: 0, win: Date.now(), again: false };
    this.conns.add(c);
    ws.addEventListener('message', (ev) => this.onMessage(c, ev.data));
    ws.addEventListener('close', () => this.drop(c));
    ws.addEventListener('error', () => this.drop(c));
    if (resumeTok) return this.resume(c, resumeTok);
    c.joinTimer = setTimeout(() => { if (!c.joined) this.kick(c, 'timeout'); }, 10000);
  }

  /** Nối lại sau khi mất kết nối: trả lại quyền điều khiển vịt cho người chơi. */
  resume(c, tok) {
    const a = this.away.get(tok);
    if (!a || this.phase === 'dead') return this.kick(c, 'gone');
    clearTimeout(a.timer);
    this.away.delete(tok);
    c.joined = true; c.slot = a.slot; c.name = a.name; c.host = a.host; c.tok = tok;
    if ((this.phase === 'racing' || this.phase === 'countdown') && this.race) {
      this.race.setHuman(c.slot);
      this.send(c, this.trackMsg(0, true));
      this.send(c, { t: 's', tm: Math.round(this.race.t * 100) / 100, r: this.race.snapshot(), e: [] });
    } else if (this.phase === 'results' && this.lastEnd) {
      this.send(c, { t: 'room', phase: 'results', you: c.slot, players: [], canStart: false, soloIn: 0, rid: this.id, tok });
      this.send(c, this.lastEnd);
    } else {
      return this.kick(c, 'gone');
    }
  }

  send(c, obj) {
    try { c.ws.send(JSON.stringify(obj)); } catch { /* đã đóng */ }
  }

  all(obj) {
    const s = JSON.stringify(obj);
    for (const c of this.conns) if (c.joined) { try { c.ws.send(s); } catch { /* đã đóng */ } }
  }

  kick(c, code) {
    this.send(c, { t: 'err', code });
    try { c.ws.close(1000, code); } catch { /* đã đóng */ }
    this.drop(c);
  }

  onMessage(c, data) {
    if (typeof data !== 'string' || data.length > 300) return;
    const now = Date.now();
    if (now - c.win > 1000) { c.win = now; c.n = 0; }
    if (++c.n > 200) return; // quá nhiều tin trong 1 giây: bỏ qua phần dư, không ngắt kết nối
    let m;
    try { m = JSON.parse(data); } catch { return; }
    if (!m || typeof m.t !== 'string') return;

    if (m.t === 'join') return this.join(c, m);
    if (!c.joined) return;
    if (m.t === 'start') return this.start(c);
    if (m.t === 'tap') { if (this.phase === 'racing') this.race.tap(c.slot); return; }
    if (m.t === 'lane') { if (this.phase === 'racing') this.race.changeLane(c.slot, m.d < 0 ? -1 : 1); return; }
    if (m.t === 'again') return this.again(c);
  }

  join(c, m) {
    if (c.joined) return;
    if (this.phase !== 'lobby' || this.humans().length >= MAX) return this.kick(c, 'full');
    const name = cleanName(m.name);
    if (!name) return this.send(c, { t: 'err', code: 'name' });
    if (!isNameAllowed(name)) return this.send(c, { t: 'err', code: 'name_bad' });
    const used = new Set(this.humans().map((x) => x.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    c.slot = slot;
    c.name = name;
    c.joined = true;
    c.tok = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    clearTimeout(c.joinTimer);
    if (!this.humans().some((x) => x.host)) c.host = true;
    this.startLobbyTimer();
    this.syncOpen();
    this.broadcastRoom();
  }

  canStart() {
    const n = this.humans().length;
    return n >= 2 || (n === 1 && Date.now() - this.openedAt >= this.cfg.solo * 1000);
  }

  roomMsg(c) {
    const h = this.humans();
    const soloIn = h.length >= 2 ? 0 : Math.max(0, Math.ceil((this.openedAt + this.cfg.solo * 1000 - Date.now()) / 1000));
    return {
      t: 'room',
      phase: this.phase,
      you: c.slot,
      players: h.map((x) => ({ slot: x.slot, name: x.name, host: !!x.host, color: COLORS[x.slot] })),
      canStart: this.canStart(),
      soloIn,
      rid: this.id,
      tok: c.tok,
    };
  }

  broadcastRoom() {
    for (const c of this.humans()) this.send(c, this.roomMsg(c));
  }

  startLobbyTimer() {
    if (this.timers.lobby) return;
    this.timers.lobby = setInterval(() => {
      if (this.phase !== 'lobby') return;
      if (Date.now() - this.openedAt > this.cfg.lobbyMax * 1000) {
        for (const c of [...this.conns]) this.kick(c, 'expired');
        return;
      }
      this.broadcastRoom();
    }, 1000);
  }

  stopLobbyTimer() {
    clearInterval(this.timers.lobby);
    this.timers.lobby = null;
  }

  syncOpen() {
    const open = this.phase === 'lobby' && this.humans().length > 0 && this.humans().length < MAX;
    if (open === this.lastOpen || !this.id) return;
    this.lastOpen = open;
    try {
      const mm = this.env.MATCH.get(this.env.MATCH.idFromName('main'));
      this.ctx.waitUntil(mm.fetch(`https://mm/update?room=${this.id}&open=${open ? 1 : 0}`).catch(() => {}));
    } catch { /* bỏ qua */ }
  }

  start(c) {
    if (this.phase !== 'lobby' || !c.host || !this.canStart()) return;
    this.phase = 'countdown';
    this.stopLobbyTimer();
    this.syncOpen();
    const hs = this.humans().sort((a, b) => a.slot - b.slot);
    const names = new Set(hs.map((x) => x.name.toLowerCase()));
    const pool = NPC_NAMES.filter((n) => !names.has(n.toLowerCase()));
    const racers = [];
    for (let s = 0; s < MAX; s++) {
      const h = hs.find((x) => x.slot === s);
      if (h) racers.push({ slot: s, name: h.name, npc: false });
      else racers.push({ slot: s, name: pool.splice(Math.floor(Math.random() * pool.length), 1)[0] ?? 'Vịt máy', npc: true });
    }
    const seed = (Math.random() * 4294967296) >>> 0;
    this.race = new Race({ seed, len: this.cfg.len, racers });
    this.all(this.trackMsg(this.cfg.cd, false));
    this.timers.cd = setTimeout(() => this.begin(), this.cfg.cd * 1000);
  }

  trackMsg(startIn, resume) {
    return {
      t: 'track',
      len: this.race.len,
      items: this.race.items,
      racers: this.race.racers.map((r) => ({ slot: r.slot, name: r.name, npc: r.npc, color: COLORS[r.slot] })),
      startIn,
      resume: !!resume,
    };
  }

  begin() {
    if (this.phase !== 'countdown') return;
    this.phase = 'racing';
    this.acc = 0;
    this.last = Date.now();
    this.tickN = 0;
    this.pending = [];
    this.timers.tick = setInterval(() => this.tick(), 50);
  }

  tick() {
    try {
      const now = Date.now();
      this.acc += Math.min(0.25, (now - this.last) / 1000);
      this.last = now;
      while (this.acc >= TICK) {
        this.acc -= TICK;
        for (const e of this.race.step(TICK)) this.pending.push(e);
      }
      if (++this.tickN % 2 === 0) {
        this.all({ t: 's', tm: Math.round(this.race.t * 100) / 100, r: this.race.snapshot(), e: this.pending });
        this.pending = [];
      }
      if (this.race.shouldEnd()) this.finish();
    } catch (err) {
      // một lỗi trong vòng lặp không được làm sập phòng: ghi log rồi chạy tiếp
      console.error('race tick', err && err.stack ? err.stack : err);
    }
  }

  finish() {
    clearInterval(this.timers.tick);
    this.timers.tick = null;
    this.phase = 'results';
    this.all({ t: 's', tm: Math.round(this.race.t * 100) / 100, r: this.race.snapshot(), e: this.pending });
    this.pending = [];
    this.lastEnd = { t: 'end', ranking: this.race.ranking() };
    this.all(this.lastEnd);
    this.timers.results = setTimeout(() => { for (const c of [...this.conns]) this.kick(c, 'expired'); }, 5 * 60 * 1000);
  }

  again(c) {
    if (this.phase !== 'results') return;
    // Người bấm "chơi tiếp" đầu tiên mở lại phòng chờ. Ai chưa chọn sẽ được mời ra, bấm chơi tiếp sau đó thì vào lại phòng này.
    for (const o of [...this.conns]) {
      if (o === c) continue;
      this.send(o, { t: 'bye' });
      try { o.ws.close(1000, 'again'); } catch { /* */ }
      this.conns.delete(o);
    }
    clearTimeout(this.timers.results);
    this.race = null;
    this.phase = 'lobby';
    this.openedAt = Date.now();
    this.lastOpen = null;
    c.host = true;
    this.startLobbyTimer();
    this.syncOpen();
    this.broadcastRoom();
  }

  drop(c) {
    if (!this.conns.has(c)) return;
    this.conns.delete(c);
    clearTimeout(c.joinTimer);
    if (!c.joined) return;
    if ((this.phase === 'racing' || this.phase === 'countdown') && this.race && c.tok) {
      // đang đua: vịt do máy lái tạm, giữ chỗ cho người chơi nối lại trong vài chục giây
      this.race.setNpc(c.slot);
      const tok = c.tok;
      this.away.set(tok, { slot: c.slot, name: c.name, host: !!c.host, timer: setTimeout(() => this.expireAway(tok), this.cfg.grace * 1000) });
      if (!this.humans().length && !this.away.size) this.dispose();
      return;
    }
    if (c.host) {
      const next = this.humans().sort((a, b) => a.slot - b.slot)[0];
      if (next) next.host = true;
    }
    if (!this.humans().length && !this.away.size) return this.dispose();
    if (this.phase === 'lobby') {
      this.syncOpen();
      this.broadcastRoom();
    }
  }

  expireAway(tok) {
    this.away.delete(tok);
    if (!this.humans().length && !this.away.size) this.dispose();
  }

  dispose() {
    for (const a of this.away.values()) clearTimeout(a.timer);
    this.away.clear();
    for (const k of Object.keys(this.timers)) {
      clearTimeout(this.timers[k]);
      clearInterval(this.timers[k]);
      this.timers[k] = null;
    }
    this.phase = 'dead';
    this.lastOpen = null; // ép báo "đóng" cho người điều phối
    this.syncOpen();
  }
}
