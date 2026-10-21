// Bảng xếp hạng top 5 cho mỗi game. Lưu ở Cloudflare D1. Không lưu IP, không cookie.
// GET  /api/scores/<gameId>            -> { top: [{ name, score }] }
// POST /api/scores { game, sid, name, score } -> { ok, saved, top }
import { isNameAllowed } from '../src/profanity.ts';
import { cleanName } from './names.js';

export { Matchmaker } from './matchmaker.js';
export { RaceRoom } from './race-room.js';

const TOP = 5;
const MAX_GAMES = 80;
const MAX_SCORE = 1_000_000_000;
const ID_RE = /^[a-z0-9-]{2,40}$/;
const SID_RE = /^[A-Za-z0-9]{8,40}$/;

let ready;
function init(db) {
  ready ??= db.prepare(
    'CREATE TABLE IF NOT EXISTS scores (game TEXT NOT NULL, sid TEXT NOT NULL, name TEXT NOT NULL, score INTEGER NOT NULL, ts INTEGER NOT NULL, PRIMARY KEY (game, sid))',
  ).run().catch((e) => { ready = undefined; throw e; });
  return ready;
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

async function top(db, game) {
  const { results } = await db
    .prepare('SELECT name, score FROM scores WHERE game = ? ORDER BY score DESC, ts ASC LIMIT ?')
    .bind(game, TOP).all();
  return results;
}

async function post(req, env, url) {
  const origin = req.headers.get('origin');
  if (origin && origin !== url.origin) return json({ error: 'origin' }, 403);
  const raw = await req.text();
  if (raw.length > 1024) return json({ error: 'too_large' }, 413);
  let b;
  try { b = JSON.parse(raw); } catch { return json({ error: 'json' }, 400); }
  const game = b?.game, sid = b?.sid, score = b?.score, name = cleanName(b?.name);
  if (typeof game !== 'string' || !ID_RE.test(game)) return json({ error: 'game' }, 400);
  if (typeof sid !== 'string' || !SID_RE.test(sid)) return json({ error: 'sid' }, 400);
  if (!Number.isInteger(score) || score < 1 || score > MAX_SCORE) return json({ error: 'score' }, 400);
  if (!name) return json({ error: 'name' }, 400);
  if (!isNameAllowed(name)) return json({ error: 'name_bad' }, 400);

  const db = env.DB;
  const cur = await top(db, game);
  const mine = await db.prepare('SELECT score FROM scores WHERE game = ? AND sid = ?').bind(game, sid).first();
  let saved = false;
  if (mine) {
    if (score > mine.score) {
      await db.prepare('UPDATE scores SET name = ?, score = ?, ts = ? WHERE game = ? AND sid = ?')
        .bind(name, score, Date.now(), game, sid).run();
      saved = true;
    }
  } else if (cur.length < TOP || score > cur[cur.length - 1].score) {
    if (!cur.length) {
      const n = await db.prepare('SELECT COUNT(DISTINCT game) AS n FROM scores').first();
      if (n.n >= MAX_GAMES) return json({ error: 'full' }, 400);
    }
    await db.prepare('INSERT INTO scores (game, sid, name, score, ts) VALUES (?, ?, ?, ?, ?)')
      .bind(game, sid, name, score, Date.now()).run();
    saved = true;
  }
  if (saved) {
    // chỉ giữ top 5 của game này
    await db.prepare(
      'DELETE FROM scores WHERE game = ?1 AND sid NOT IN (SELECT sid FROM scores WHERE game = ?1 ORDER BY score DESC, ts ASC LIMIT ?2)',
    ).bind(game, TOP).run();
  }
  return json({ ok: true, saved, top: await top(db, game) });
}


// Game đua vịt nhiều người: WebSocket -> phòng đang mở (do Matchmaker chỉ định) -> RaceRoom.
// Game chạy trong iframe sandbox nên Origin là "null"; chấp nhận "null" hoặc đúng origin của site.
async function race(req, env, url) {
  if (req.headers.get('Upgrade') !== 'websocket') return new Response('cần WebSocket', { status: 426 });
  const origin = req.headers.get('Origin');
  if (origin && origin !== 'null' && origin !== url.origin) return new Response('origin', { status: 403 });
  const mm = env.MATCH.get(env.MATCH.idFromName('main'));
  const { room } = await (await mm.fetch('https://mm/join')).json();
  const stub = env.ROOMS.get(env.ROOMS.idFromName(room));
  return stub.fetch(new Request(`https://room/ws?room=${room}`, req));
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    if (url.pathname === '/api/race/ws') return race(req, env, url);
    try {
      await init(env.DB);
      const m = url.pathname.match(/^\/api\/scores(?:\/([a-z0-9-]+))?$/);
      if (!m) return json({ error: 'not_found' }, 404);
      if (req.method === 'GET' && m[1]) {
        if (!ID_RE.test(m[1])) return json({ error: 'game' }, 400);
        return json({ top: await top(env.DB, m[1]) });
      }
      if (req.method === 'POST' && !m[1]) return await post(req, env, url);
      return json({ error: 'method' }, 405);
    } catch (e) {
      return json({ error: 'server' }, 500);
    }
  },
};
