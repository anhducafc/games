// Kiểm thử giao thức phòng đua vịt qua WebSocket thật.
// Cần Worker chạy với .dev.vars: RACE_LEN=300 RACE_SOLO_WAIT=2 RACE_CD=1 RACE_LOBBY_MAX=40
//   npx wrangler dev --local --port 8787   rồi   node tests/e2e/race-ws.mjs [ws://localhost:8787]
import http from 'node:http';

const BASE = process.argv[2] || 'ws://localhost:8787';
const URL_WS = BASE.replace(/\/$/, '') + '/api/race/ws';
let fails = 0;
const check = (ok, msg) => { console.log((ok ? '  OK   ' : '  LỖI  ') + msg); if (!ok) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class C {
  constructor(name) {
    this.name = name; this.msgs = []; this.closed = false; this.waiters = [];
  }
  connect() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(URL_WS);
      this.ws.onopen = () => res(this);
      this.ws.onerror = () => rej(new Error('ws lỗi'));
      this.ws.onclose = () => { this.closed = true; this.flush(); };
      this.ws.onmessage = (e) => { const m = JSON.parse(e.data); this.msgs.push(m); if (m.t === 'room') this.room = m; if (m.t === 'track') this.track = m; if (m.t === 'end') this.end = m; this.flush(); };
    });
  }
  join(name = this.name) { this.ws.send(JSON.stringify({ t: 'join', name })); }
  send(o) { this.ws.send(JSON.stringify(o)); }
  flush() { this.waiters = this.waiters.filter((w) => { const m = this.msgs.find(w.pred); if (m || (this.closed && w.orClosed)) { w.res(m); return false; } return true; }); }
  wait(pred, ms = 8000, orClosed = false) {
    const m = this.msgs.find(pred); if (m) return Promise.resolve(m);
    return new Promise((res) => { this.waiters.push({ pred, res, orClosed }); setTimeout(() => res(undefined), ms); });
  }
  close() { try { this.ws.close(); } catch {} }
}
async function open(name) { const c = new C(name); await c.connect(); c.join(); return c; }
// người chơi "robot": quẫy đều, thỉnh thoảng đổi làn, cho tới khi đua xong
function bot(c, rate = 100) {
  c.timer = setInterval(() => { c.send({ t: 'tap' }); if (Math.random() < 0.05) c.send({ t: 'lane', d: Math.random() < 0.5 ? -1 : 1 }); }, rate);
  return c;
}
const stop = (c) => clearInterval(c.timer);

function rawUpgrade(origin) {
  return new Promise((res) => {
    const u = new globalThis.URL(URL_WS.replace('ws', 'http'));
    const req = http.request({ host: u.hostname, port: u.port, path: u.pathname, headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', Origin: origin } });
    req.on('response', (r) => res(r.statusCode));
    req.on('upgrade', (r, sock) => { sock.destroy(); res(101); });
    req.on('error', () => res(0));
    req.end();
  });
}

console.log('1. Hai người cùng vào một phòng, chủ phòng là người đầu tiên');
{
  const a = await open('Bon'); await a.wait((m) => m.t === 'room');
  const b = await open('Mít'); await b.wait((m) => m.t === 'room' && m.players.length === 2);
  await a.wait((m) => m.t === 'room' && m.players.length === 2);
  check(a.room.players.length === 2 && b.room.players.length === 2, 'cả hai thấy 2 người trong phòng');
  check(a.room.players.find((p) => p.slot === a.room.you).host === true, 'người vào đầu là chủ phòng');
  check(b.room.players.find((p) => p.slot === b.room.you).host === false, 'người vào sau không phải chủ phòng');
  check(a.room.you !== b.room.you, 'mỗi người một ô (màu) riêng');
  check(a.room.canStart === true, 'có 2 người thì được bấm Bắt đầu');
  b.send({ t: 'start' }); await sleep(400);
  check(!a.track && !b.track, 'người không phải chủ phòng bấm Bắt đầu thì không có tác dụng');
  a.send({ t: 'start' });
  await a.wait((m) => m.t === 'track'); await b.wait((m) => m.t === 'track');
  check(a.track && b.track && a.track.items.length > 5, 'chủ phòng bấm Bắt đầu: cả hai nhận đường đua');
  check(a.track.racers.length === 4 && a.track.racers.filter((r) => r.npc).length === 2, 'đủ 4 vịt: 2 người + 2 vịt máy');
  check(JSON.stringify(a.track.items) === JSON.stringify(b.track.items), 'hai người thấy cùng một đường đua');
  const names = a.track.racers.map((r) => r.name); check(new Set(names).size === 4, 'tên 4 vịt không trùng: ' + names.join(', '));
  bot(a); bot(b, 130);
  await a.wait((m) => m.t === 'end', 40000); await b.wait((m) => m.t === 'end', 40000);
  stop(a); stop(b);
  check(!!a.end && a.end.ranking.length === 4, 'đua xong: có bảng xếp hạng 4 vịt');
  check(a.end && JSON.stringify(a.end.ranking) === JSON.stringify(b.end.ranking), 'hai người nhận cùng bảng xếp hạng');
  const snaps = a.msgs.filter((m) => m.t === 's'); check(snaps.length > 20, 'nhận ' + snaps.length + ' gói trạng thái trong lúc đua');
  const rk = a.end.ranking; check(rk.every((x, i) => x.rank === i + 1) && rk.some((x) => x.pts > 100), 'hạng 1..4 và có điểm: ' + rk.map((x) => x.name + ':' + x.pts).join(' '));

  console.log('2. Chơi tiếp cùng nhau / người chưa chọn bị mời ra');
  a.send({ t: 'again' });
  const lobby = await a.wait((m) => m.t === 'room' && m.phase === 'lobby' && m.players.length === 1, 4000);
  check(!!lobby, 'người bấm chơi tiếp quay lại phòng chờ');
  check(lobby && lobby.players[0].host, 'người bấm chơi tiếp trước là chủ phòng');
  const bye = await b.wait((m) => m.t === 'bye', 3000); check(!!bye, 'người chưa chọn nhận lệnh rời phòng');
  const b2 = await open('Mít'); await b2.wait((m) => m.t === 'room' && m.players.length === 2);
  check(b2.room.players.length === 2, 'bấm chơi tiếp sau đó: vào lại đúng phòng của người trước');
  a.close(); b.close(); b2.close(); await sleep(300);
}

console.log('3. Vào một mình: phải chờ rồi mới chơi được với vịt máy');
{
  const a = await open('Solo'); await a.wait((m) => m.t === 'room');
  check(a.room.canStart === false && a.room.soloIn > 0, 'vừa vào: chưa được bắt đầu (còn chờ ' + a.room.soloIn + ' giây)');
  a.send({ t: 'start' }); await sleep(500);
  check(!a.track, 'bấm Bắt đầu sớm thì bị bỏ qua');
  await a.wait((m) => m.t === 'room' && m.canStart === true, 6000);
  check(a.room.canStart === true, 'chờ đủ lâu thì được bắt đầu');
  a.send({ t: 'start' }); await a.wait((m) => m.t === 'track');
  check(a.track && a.track.racers.filter((r) => r.npc).length === 3, 'chơi một mình với 3 vịt máy');
  await a.wait((m) => m.t === 'end', 60000);
  check(!!a.end, 'vịt máy tự đua, không có tay người vẫn kết thúc ');
  const me = a.end?.ranking.find((r) => r.slot === a.room.you); check(me && me.rank === 4, 'người đứng yên về chót (hạng ' + me?.rank + ')');
  a.close(); await sleep(300);
}

console.log('4. Phòng đầy 4 người, người thứ 5 sang phòng khác');
{
  const cs = [];
  for (let i = 0; i < 4; i++) { cs.push(await open('P' + i)); await sleep(80); }
  await cs[3].wait((m) => m.t === 'room' && m.players.length === 4);
  check(cs[3].room.players.length === 4, '4 người cùng một phòng');
  await sleep(300);
  const e = await open('P4'); await e.wait((m) => m.t === 'room');
  check(e.room.players.length === 1, 'người thứ 5 vào phòng mới, không chen vào phòng đầy');
  const p = cs[0].room.players; check(new Set(p.map((x) => x.slot)).size === 4, '4 ô khác nhau');
  cs.forEach((c) => c.close()); e.close(); await sleep(300);
}

console.log('5. Tên');
{
  const c = new C('x'); await c.connect(); c.join('Dit Me May'); const err = await c.wait((m) => m.t === 'err');
  check(err && err.code === 'name_bad', 'tên tục bị từ chối');
  c.join('   '); await c.wait((m) => m.t === 'err' && m.code === 'name');
  check(c.msgs.filter((m) => m.t === 'err').length >= 2 && !c.closed, 'tên rỗng bị từ chối, kết nối vẫn mở');
  c.join('<b>Vịt Con Siêu Dài Tên</b>'); const r = await c.wait((m) => m.t === 'room');
  check(r && r.players[0].name.length <= 12 && !/[<>]/.test(r.players[0].name), 'tên được làm sạch và cắt 12 ký tự: ' + r?.players[0].name);
  c.close(); await sleep(300);
}

console.log('6. Rời giữa ván: vịt chuyển sang vịt máy, ván vẫn kết thúc');
{
  const a = await open('A1'); await a.wait((m) => m.t === 'room');
  const b = await open('B1'); await b.wait((m) => m.t === 'room' && m.players.length === 2);
  a.send({ t: 'start' }); await b.wait((m) => m.t === 'track');
  bot(b); await sleep(1500); stop(a); a.close();
  await b.wait((m) => m.t === 'end', 60000);
  check(!!b.end && b.end.ranking.length === 4, 'một người thoát giữa ván, ván vẫn kết thúc với 4 vịt');
  stop(b); b.close(); await sleep(300);
}

console.log('7. Chủ phòng thoát ở phòng chờ: chủ phòng chuyển cho người còn lại');
{
  const a = await open('H1'); await a.wait((m) => m.t === 'room');
  const b = await open('H2'); await b.wait((m) => m.t === 'room' && m.players.length === 2);
  a.close();
  const r = await b.wait((m) => m.t === 'room' && m.players.length === 1, 3000);
  check(r && r.players[0].host === true, 'người còn lại thành chủ phòng');
  b.close(); await sleep(300);
}

console.log('8. Bảo vệ');
check((await rawUpgrade('https://evil.example')) === 403, 'Origin lạ bị từ chối');
check((await rawUpgrade('null')) === 101, 'Origin "null" (iframe sandbox) được chấp nhận');
{
  const res = await fetch(BASE.replace('ws', 'http') + '/api/race/ws'); check(res.status === 426, 'không phải WebSocket thì trả 426');
  const c = new C('s'); await c.connect(); c.ws.send('x'.repeat(5000)); c.ws.send('không phải json'); c.ws.send(JSON.stringify({ t: 'tap' }));
  await sleep(300); check(!c.closed, 'tin quá dài / sai định dạng / chưa join bị bỏ qua, không làm sập kết nối'); c.close();
}
console.log(fails ? `\n${fails} LỖI` : '\nTẤT CẢ ĐẠT');
process.exit(fails ? 1 : 0);
