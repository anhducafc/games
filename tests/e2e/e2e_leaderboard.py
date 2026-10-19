"""Kiểm thử bảng xếp hạng: cần Worker chạy (npx wrangler dev --local --port 8787) trên bản build. Dùng: python3 tests/e2e/e2e_leaderboard.py [URL]"""
import sys, json, time, urllib.request
from playwright.sync_api import sync_playwright
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787/').rstrip('/') + '/'
GAME = 'e2e-test-%d' % int(time.time())
fails = []
def check(ok, msg):
    print(('  OK   ' if ok else '  LỖI  ') + msg)
    if not ok: fails.append(msg)
def api(method, path, body=None, headers=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'content-type': 'application/json', **(headers or {})})
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b'{}')
print('API')
for i, sc in enumerate([10, 50, 30, 40, 20]):
    api('POST', 'api/scores', {'game': GAME, 'sid': 'sid%07d' % i, 'name': 'P%d' % i, 'score': sc})
st, j = api('GET', 'api/scores/' + GAME); check([e['score'] for e in j['top']] == [50, 40, 30, 20, 10], 'top 5 xếp giảm dần')
st, j = api('POST', 'api/scores', {'game': GAME, 'sid': 'sidlow0001', 'name': 'Thấp', 'score': 5}); check(j['saved'] is False, 'điểm thấp hơn hạng 5 không được lưu')
st, j = api('POST', 'api/scores', {'game': GAME, 'sid': 'sidhigh001', 'name': 'Cao', 'score': 45}); check(j['saved'] and [e['score'] for e in j['top']] == [50, 45, 40, 30, 20], 'điểm 45 chen vào, điểm 10 bị đẩy ra')
st, j = api('POST', 'api/scores', {'game': GAME, 'sid': 'sidhigh001', 'name': 'Cao', 'score': 60}); check([e['score'] for e in j['top']] == [60, 50, 40, 30, 20], 'cùng phiên điểm cao hơn thì cập nhật, không thêm dòng')
check(api('POST', 'api/scores', {'game': GAME, 'sid': 'x', 'name': 'a', 'score': 1})[0] == 400, 'sid sai bị từ chối')
check(api('POST', 'api/scores', {'game': GAME, 'sid': 'sidbad0001', 'name': '   ', 'score': 99})[0] == 400, 'tên rỗng bị từ chối')
check(api('POST', 'api/scores', {'game': GAME, 'sid': 'sidbad0002', 'name': 'a', 'score': -5})[0] == 400, 'điểm âm bị từ chối')
check(api('POST', 'api/scores', {'game': GAME, 'sid': 'sidbad0003', 'name': 'a', 'score': 1.5})[0] == 400, 'điểm lẻ bị từ chối')
check(api('POST', 'api/scores', {'game': 'Bad Game!', 'sid': 'sidbad0004', 'name': 'a', 'score': 5})[0] == 400, 'mã game sai bị từ chối')
check(api('POST', 'api/scores', {'game': GAME, 'sid': 'sidbad0005', 'name': 'a', 'score': 99}, {'origin': 'https://evil.example'})[0] == 403, 'Origin lạ bị từ chối')
check(api('POST', 'api/scores', {'game': GAME, 'sid': 'sidbad0006', 'name': 'Dit Me May', 'score': 999})[1].get('error') == 'name_bad', 'tên tục tiếng Việt bị server chặn')
check(api('POST', 'api/scores', {'game': GAME, 'sid': 'sidbad0007', 'name': 'f u c k', 'score': 999})[1].get('error') == 'name_bad', 'tên tục tiếng Anh bị server chặn')
st, j = api('POST', 'api/scores', {'game': GAME, 'sid': 'sidxss0001', 'name': '<img src=x onerror=alert(1)>', 'score': 99}); check('<' not in j['top'][0]['name'] and len(j['top'][0]['name']) <= 12, 'tên bị làm sạch: %r' % j['top'][0]['name'])

print('Giao diện (game lat-the, điểm do GRC.score gửi lên)')
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1000, 'height': 800}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#/choi/lat-the'); pg.wait_for_selector('.leaderboard li'); 
    fr = next(f for f in pg.frames if 'games/lat-the/' in f.url)
    # lat-the chưa có ai (hoặc đã có từ lần chạy trước): đặt điểm rất cao để chắc chắn lọt top 5
    fr.evaluate("GRC.score(987654)"); pg.wait_for_selector('.lb-modal', timeout=6000); check(True, 'điểm lọt top 5 thì hiện ô nhập tên')
    pg.fill('.lb-card input', 'Bé Na'); pg.click('.lb-save'); pg.wait_for_timeout(800)
    check(pg.locator('.lb-modal').count() == 0, 'ô nhập tên đóng sau khi lưu')
    rows = pg.locator('.lb-list li').all_inner_texts(); check(any('Bé Na' in r and '987654' in r for r in rows), 'tên và điểm hiện trên bảng: %s' % rows[:2])
    check(pg.locator('.lb-me').count() == 1, 'dòng của mình được đánh dấu')
    fr.evaluate("GRC.score(987999)"); pg.wait_for_timeout(3500)
    check(pg.locator('.lb-modal').count() == 0, 'điểm cao hơn cùng phiên: cập nhật im lặng, không hỏi lại tên')
    rows = pg.locator('.lb-list li').all_inner_texts(); check(sum('Bé Na' in r for r in rows) >= 1 and any('987999' in r for r in rows), 'điểm cập nhật thành 987999')
    for i in range(4): api('POST', 'api/scores', {'game': 'lat-the', 'sid': 'fill%06d' % i, 'name': 'F%d' % i, 'score': 3000000 + i})
    pg.reload(); pg.wait_for_selector('.leaderboard li'); fr = next(f for f in pg.frames if 'games/lat-the/' in f.url)
    fr.evaluate("GRC.score(1)"); pg.wait_for_timeout(3000)
    check(pg.locator('.lb-modal').count() == 0, 'điểm thấp không lọt top thì không hiện ô nhập')
    fr.evaluate("GRC.score(4000000)"); pg.wait_for_selector('.lb-modal', timeout=6000)
    check(pg.input_value('.lb-card input') == 'Bé Na', 'tên được nhớ lại cho lần sau')
    pg.fill('.lb-card input', 'sh1t'); pg.click('.lb-save'); pg.wait_for_timeout(300)
    check(pg.locator('.lb-modal').count() == 1 and 'chưa phù hợp' in pg.inner_text('.lb-err'), 'tên tục: hộp giữ nguyên và báo lỗi')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300); check(pg.locator('.lb-modal').count() == 0, 'Bỏ qua (Esc) đóng ô nhập')
    check(not errs, 'không lỗi JS %s' % errs[:2])
    pg.close()
    b.close()
print('\n' + ('TẤT CẢ ĐẠT' if not fails else '%d MỤC LỖI:\n - ' % len(fails) + '\n - '.join(fails))); sys.exit(1 if fails else 0)
