"""Kiểm tra nhanh một bản đã deploy (hoặc chạy local): python3 tools/smoke-online.py <URL gốc của site>
Cần: pip install playwright && playwright install chromium
Kiểm tra: trang chủ, từng game chơi được tải xong, không request tới host ngoài (trừ Lichess),
không lỗi 4xx/5xx, không lỗi console, font nhúng nạp được trong game sandbox chặt."""
import sys, time
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2:
    sys.exit('Dùng: python3 tools/smoke-online.py https://ten-mien-cua-ban.pages.dev/')
BASE = sys.argv[1].rstrip('/') + '/'
HOST = urlparse(BASE).hostname
ALLOWED_EXTERNAL = {'lichess.org', 'lichess1.org'}   # chỉ game "Đố cờ hằng ngày" được gọi ra ngoài
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl',
        '--autoplay-policy=no-user-gesture-required']
GAMES = [  # id, selector xác nhận game đã sẵn sàng
    ('lat-the', '.card, #board, button'),
    ('hexgl', '#start'),
    ('xay-thap', '#start'),
    ('hextris', '#startBtn'),
    ('slime-nhay-phim', 'canvas'),
    ('do-co-hang-ngay', None),
]
fails = []
def check(ok, msg):
    print(('  OK   ' if ok else '  LỖI  ') + msg)
    if not ok: fails.append(msg)

def watch(page, log):
    page.on('request', lambda r: log['ext'].append(r.url) if urlparse(r.url).scheme in ('http', 'https')
            and urlparse(r.url).hostname not in (HOST, 'localhost', '127.0.0.1') else None)
    page.on('response', lambda r: log['bad'].append('%s %s' % (r.status, r.url)) if r.status >= 400 else None)
    page.on('pageerror', lambda e: log['err'].append(str(e)[:160]))
    page.on('console', lambda m: log['err'].append(m.text[:160]) if m.type == 'error' else None)

with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    print('Trang chủ', BASE)
    page = b.new_page(viewport={'width': 1100, 'height': 800}); log = {'ext': [], 'bad': [], 'err': []}; watch(page, log)
    page.goto(BASE, wait_until='load'); page.wait_for_selector('.tile', timeout=20000); time.sleep(1)
    tiles = page.locator('.tile').count(); playable = page.locator('.tile:not(.tile-soon)').count()
    check(tiles >= 20, 'hiển thị %d ô game' % tiles)
    check(playable == len(GAMES), 'có %d game chơi được (mong đợi %d)' % (playable, len(GAMES)))
    check(not log['bad'] and not log['ext'] and not log['err'], 'trang chủ sạch (lỗi tải %s, ngoài %s, console %s)' % (log['bad'][:2], log['ext'][:2], log['err'][:2]))
    check(page.evaluate("document.fonts.check('800 20px \"Baloo 2\"')"), 'font Baloo 2 của cổng nạp được')
    page.close()

    for gid, sel in GAMES:
        print('Game', gid)
        page = b.new_page(viewport={'width': 1100, 'height': 800}); log = {'ext': [], 'bad': [], 'err': []}; watch(page, log)
        page.goto(BASE + '#/choi/' + gid, wait_until='load')
        fr = None
        for _ in range(60):
            for f in page.frames:
                if f != page.main_frame and f.url != 'about:blank': fr = f
            if fr: break
            time.sleep(.25)
        check(fr is not None, 'iframe game xuất hiện')
        if fr and sel:
            try:
                fr.wait_for_selector(sel, state='attached', timeout=25000); ok = True
            except Exception:
                ok = False
            check(ok, 'game tải xong (%s)' % sel)
        time.sleep(2.5)
        ext = [u for u in log['ext'] if urlparse(u).hostname not in ALLOWED_EXTERNAL] if gid == 'do-co-hang-ngay' else log['ext']
        check(not ext, 'không gọi host ngoài %s' % ext[:2])
        bad = [x for x in log['bad'] if not (gid == 'do-co-hang-ngay' and 'lichess' in x)]
        check(not bad, 'không lỗi 4xx/5xx %s' % bad[:2])
        err = [x for x in log['err'] if not (gid == 'do-co-hang-ngay')]
        check(not err, 'không lỗi console %s' % err[:2])
        if gid in ('lat-the', 'slime-nhay-phim') and fr:
            st = fr.evaluate("(async()=>{await document.fonts.load('800 20px \"Baloo 2\"');return document.fonts.check('800 20px \"Baloo 2\"')})()")
            check(st, 'font nhúng nạp được trong sandbox chặt')
        page.close()
    b.close()

print('\n' + ('TẤT CẢ ĐẠT' if not fails else '%d MỤC LỖI:\n - ' % len(fails) + '\n - '.join(fails)))
sys.exit(1 if fails else 0)
