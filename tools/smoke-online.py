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
ALLOWED_EXTERNAL = set()   # không game nào được gọi ra host ngoài
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl',
        '--autoplay-policy=no-user-gesture-required']
SELECTORS = {  # selector xác nhận game đã sẵn sàng; game không có trong bảng thì chỉ kiểm tra iframe nạp xong
    'lat-the': '.card, #board, button', 'hexgl': '#start', 'xay-thap': '#start', 'hextris': '#startBtn',
    'slime-nhay-phim': 'canvas', 'do-co-hang-ngay': '#board .sq', 'khoi-2048': '#board', 'me-cung': 'canvas', 'toan-nhanh': '#opts button',
    'do-min': '#grid .c', 'sudoku': '#grid .c', 'block-puzzle': '#board .c', 'nonogram': '#grid .c', 'co-caro': 'canvas',
    'phat-gach': 'canvas', 'bay-qua-ong': 'canvas', 'danh-van': '#tiles .tile',
    'xep-bai': '#felt', 'xay-cau': '#svg', 'do-co-cac-nuoc': '#board .sq', 'dua-xe-ti-hon': 'canvas', 'the-gioi-khoi': 'canvas', 'tangram': 'canvas', 'quoc-ky': '#opts .opt', 'dua-vit': '#ten',
}
GAMES = []   # được nạp từ trang chủ: mọi ô không "sắp ra mắt"
fails = []
def check(ok, msg):
    print(('  OK   ' if ok else '  LỖI  ') + msg)
    if not ok: fails.append(msg)

def watch(page, log):
    page.on('request', lambda r: log['ext'].append(r.url) if urlparse(r.url).scheme in ('http', 'https')
            and urlparse(r.url).hostname not in (HOST, 'localhost', '127.0.0.1') else None)
    page.on('response', lambda r: log['bad'].append('%s %s' % (r.status, r.url)) if r.status >= 400 and '/api/' not in r.url else None)  # /api/ chỉ có khi chạy trên Worker; static thì 404 là bình thường
    page.on('pageerror', lambda e: log['err'].append(str(e)[:160]))
    page.on('console', lambda m: log['err'].append(m.text[:160]) if m.type == 'error' and not m.text.startswith('Failed to load resource') else None)  # lỗi tải tài nguyên đã được bắt qua 'response'

with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    print('Trang chủ', BASE)
    page = b.new_page(viewport={'width': 1100, 'height': 800}); log = {'ext': [], 'bad': [], 'err': []}; watch(page, log)
    page.goto(BASE, wait_until='load'); page.wait_for_selector('.tile', timeout=20000); time.sleep(1)
    tiles = page.locator('.tile').count(); playable = page.locator('.tile:not(.tile-soon)').count()
    check(tiles >= 20, 'hiển thị %d ô game' % tiles)
    for h in page.locator('.tile:not(.tile-soon)').evaluate_all("els=>els.map(e=>e.getAttribute('href')||'')"):
        if '#/choi/' in h: GAMES.append((h.split('#/choi/')[1], SELECTORS.get(h.split('#/choi/')[1])))
    check(playable == len(GAMES) and playable > 0, 'có %d game chơi được, đọc được id của %d game' % (playable, len(GAMES)))
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
        ext = [u for u in log['ext'] if urlparse(u).hostname not in ALLOWED_EXTERNAL]
        check(not ext, 'không gọi host ngoài %s' % ext[:2])
        bad = log['bad']
        check(not bad, 'không lỗi 4xx/5xx %s' % bad[:2])
        err = log['err']
        check(not err, 'không lỗi console %s' % err[:2])
        if fr and gid != 'hexgl' and gid not in ('xay-thap', 'hextris') and sel:
            st = fr.evaluate("(async()=>{await document.fonts.load('800 20px \"Baloo 2\"');return document.fonts.check('800 20px \"Baloo 2\"')})()")
            check(st, 'font nhúng nạp được trong sandbox chặt')
        page.close()
    b.close()

print('\n' + ('TẤT CẢ ĐẠT' if not fails else '%d MỤC LỖI:\n - ' % len(fails) + '\n - '.join(fails)))
sys.exit(1 if fails else 0)
