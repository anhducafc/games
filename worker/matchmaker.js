// Người điều phối: chỉ nhớ "phòng đang mở" (đang ở phòng chờ và còn chỗ). Không lưu tên hay IP.
// Trạng thái ghi vào storage của Durable Object để không mất khi object bị giải phóng lúc vắng khách.
const STALE_MS = 4 * 60 * 1000;

export class Matchmaker {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const cur = await this.ctx.storage.get('open');
    const fresh = cur && Date.now() - cur.ts < STALE_MS ? cur : null;

    if (url.pathname === '/join') {
      if (fresh) return Response.json({ room: fresh.id });
      const id = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
      await this.ctx.storage.put('open', { id, ts: Date.now() });
      return Response.json({ room: id });
    }

    if (url.pathname === '/update') {
      const room = url.searchParams.get('room') || '';
      const open = url.searchParams.get('open') === '1';
      if (!/^[a-f0-9]{10}$/.test(room)) return new Response('bad', { status: 400 });
      if (open) {
        // chỉ giữ một phòng mở: nếu đã có phòng khác còn mới thì để phòng đó
        if (!fresh || fresh.id === room) await this.ctx.storage.put('open', { id: room, ts: fresh?.id === room ? fresh.ts : Date.now() });
      } else if (cur && cur.id === room) {
        await this.ctx.storage.delete('open');
      }
      return Response.json({ ok: true });
    }
    return new Response('not found', { status: 404 });
  }
}
