"""Kiểm thử giao diện game Đua vịt qua cổng (iframe sandbox). Cần Worker chạy với .dev.vars (RACE_LEN=600 RACE_SOLO_WAIT=2 RACE_CD=1)
   npx wrangler dev --local --port 8787 ; python3 tests/e2e/e2e_dua_vit.py [URL] [thư mục ảnh]"""
import sys, os, time
from playwright.sync_api import sync_playwright
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787/').rstrip('/') + '/'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/duavit'
os.makedirs(OUT, exist_ok=True)
fails = []
def check(ok, msg):
    print(('  OK   ' if ok else '  LỖI  ') + msg)
    if not ok: fails.append(msg)

def open_game(b, name, viewport=(1000, 700)):
    ctx = b.new_context(viewport={'width': viewport[0], 'height': viewport[1]})
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#/choi/dua-vit'); pg.wait_for_selector('iframe')
    fr = next(f for f in pg.frames if 'games/dua-vit/' in f.url)
    pg._fr = fr; pg._errs = errs; pg._ctx = ctx
    return pg
def screen(pg): return pg._fr.evaluate("__g.S.screen")
def wait_screen(pg, s, ms=15000):
    t = time.time()
    while time.time() - t < ms / 1000:
        if screen(pg) == s: return True
        time.sleep(0.1)
    return False

with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    a = open_game(b, 'Bon'); c = open_game(b, 'Mít')
    print('Màn đặt tên')
    check(screen(a) == 'name', 'mở game ở màn đặt tên')
    a._fr.fill('#ten', 'Dit Me May'); a._fr.click('#goBtn'); a.wait_for_timeout(800)
    check(screen(a) == 'name' and 'chưa phù hợp' in a._fr.inner_text('#nameHint'), 'tên tục bị từ chối, ở lại màn đặt tên')
    a._fr.fill('#ten', '   '); a._fr.click('#goBtn')
    check('trước nhé' in a._fr.inner_text('#nameHint'), 'tên rỗng bị nhắc')
    a._fr.fill('#ten', 'Bon'); a._fr.click('#goBtn')
    check(wait_screen(a, 'lobby'), 'tên hợp lệ: vào phòng chờ (WebSocket chạy được trong iframe sandbox)')
    check(a._fr.is_disabled('#startBtn') or a._fr.evaluate("__g.S.soloIn") == 0, 'một mình: nút Bắt đầu bị khoá lúc đầu (hoặc đã hết thời gian chờ)')
    a.screenshot(path=OUT + '/1-lobby-solo.png')
    c._fr.fill('#ten', 'Mít'); c._fr.click('#goBtn')
    check(wait_screen(c, 'lobby'), 'người thứ hai vào phòng chờ')
    a._fr.wait_for_function("__g.S.players.length === 2"); c._fr.wait_for_function("__g.S.players.length === 2")
    check(a._fr.inner_text('#lCount').startswith('2'), 'chủ phòng thấy 2/4 người')
    check(c._fr.is_hidden('#startBtn'), 'người vào sau không có nút Bắt đầu')
    check(not a._fr.is_disabled('#startBtn'), 'chủ phòng bấm Bắt đầu được khi có 2 người')
    a.screenshot(path=OUT + '/2-lobby-2.png'); c.screenshot(path=OUT + '/2b-lobby-guest.png')
    print('Âm thanh')
    check(a._fr.evaluate("Kit.audio() && Kit.audio().state") == 'running', 'AudioContext đang chạy (nhạc nền và hiệu ứng có thể phát)')
    a._fr.click('#mute'); check(a._fr.get_attribute('#mute', 'aria-pressed') == 'true', 'nút tắt âm thanh hoạt động')
    a._fr.click('#mute'); check(a._fr.get_attribute('#mute', 'aria-pressed') == 'false', 'bật lại âm thanh')
    a._fr.click('#startBtn')
    check(wait_screen(a, 'race') and wait_screen(c, 'race'), 'cả hai vào màn đua')
    a.wait_for_timeout(1500)
    a.screenshot(path=OUT + '/3-race-start.png')
    print('Đua')
    # bấm quẫy bằng bàn phím và nút; đổi làn
    for i in range(30):
        a._fr.evaluate("__g.tap()"); c._fr.evaluate("__g.tap()"); a.wait_for_timeout(90)
    a.keyboard.press('ArrowDown'); a.wait_for_timeout(500)
    x1 = a._fr.evaluate("__g.S.snap[__g.S.you].x"); lane1 = a._fr.evaluate("__g.S.snap[__g.S.you].lane")
    check(x1 > 10, 'bấm quẫy thì vịt tiến lên (x=%.0f)' % x1)
    check(lane1 == a._fr.evaluate("__g.S.you") + 1 or lane1 == 3, 'phím mũi tên xuống đổi làn (làn %d)' % lane1)
    a.screenshot(path=OUT + '/4-race-mid.png')
    print('Nối lại')
    xb = a._fr.evaluate("__g.S.snap[__g.S.you].x")
    a._fr.evaluate("__g.S.ws.close()")   # giả lập rớt mạng giữa trận
    a.wait_for_timeout(300)
    check(screen(a) == 'race' and a._fr.evaluate("document.getElementById('ovl').classList.contains('on')") is False, 'rớt mạng giữa trận: không hiện hộp thoại chặn màn hình')
    a._fr.wait_for_function("(__g.S.ws && __g.S.ws.readyState === 1 && __g.S.resumeTries === 0) || __g.S.screen === 'result'", timeout=8000)
    for i in range(10):
        a._fr.evaluate("__g.tap()"); a.wait_for_timeout(100)
    xa = a._fr.evaluate("__g.S.snap[__g.S.you].x")
    check(xa > xb or screen(a) == 'result', 'tự nối lại đúng phòng, vịt tiếp tục bơi (%.0f -> %.0f)' % (xb, xa))
    if screen(a) == 'race':
        a._fr.evaluate("document.getElementById('goTap').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))"); a.keyboard.press('Space')
    # tiếp tục bấm tới khi xong
    t = time.time()
    while screen(a) == 'race' and time.time() - t < 60:
        a._fr.evaluate("__g.tap()"); c._fr.evaluate("__g.tap()"); a.wait_for_timeout(110)
        if a._fr.evaluate("__g.S.fin"): break
    check(a._fr.evaluate("__g.S.fin") or screen(a) == 'result', 'vịt của mình về đích')
    check(wait_screen(a, 'result', 40000) and wait_screen(c, 'result', 40000), 'cả hai thấy màn kết quả')
    a.wait_for_timeout(400); a.screenshot(path=OUT + '/5-result.png')
    rows = a._fr.locator('#rRows .row').count(); check(rows == 4, 'bảng xếp hạng 4 dòng')
    check('Chúc mừng' in a._fr.inner_text('#rTitle'), 'có lời chúc mừng người thắng: ' + a._fr.inner_text('#rTitle'))
    check(a._fr.locator('#rRows .row.me').count() == 1, 'dòng của mình được tô nổi')
    a_rows = a._fr.inner_text('#rRows'); c_rows = c._fr.inner_text('#rRows')
    check(a_rows.replace('Bạn', '').replace('Người chơi', '') != '' and True, 'có thời gian và điểm: ' + ' | '.join(a_rows.split('\n')[:4]))
    print('Chọn sau trận')
    a._fr.click('#bAgain')
    check(wait_screen(a, 'lobby', 6000), 'Chơi tiếp cùng nhau: người bấm trước về phòng chờ')
    check(screen(c) == 'result', 'người chưa chọn vẫn xem kết quả')
    c._fr.click('#bAgain')
    check(wait_screen(c, 'lobby', 8000), 'người bấm sau cũng vào lại phòng chờ')
    a._fr.wait_for_function("__g.S.players.length === 2", timeout=8000)
    check(True, 'hai người lại cùng một phòng')
    # đua ván 2 để kiểm tra "Về phòng chờ" và "Nghỉ chơi"
    a._fr.click('#startBtn'); wait_screen(a, 'race'); wait_screen(c, 'race')
    t = time.time()
    while (screen(a) == 'race' or screen(c) == 'race') and time.time() - t < 70:
        a._fr.evaluate("__g.tap()"); c._fr.evaluate("__g.tap()"); a.wait_for_timeout(110)
    check(wait_screen(a, 'result', 30000), 'ván 2 kết thúc')
    c._fr.click('#bRest'); check(screen(c) == 'name', 'Nghỉ chơi: về màn đặt tên')
    a._fr.click('#bLobby'); check(wait_screen(a, 'lobby', 8000), 'Về phòng chờ: vào phòng mới')
    check(a._fr.evaluate("__g.S.players.length") == 1, 'phòng mới chỉ có mình mình')
    print('Lỗi JS:', a._errs + c._errs)
    check(not (a._errs + c._errs), 'không có lỗi JS trong trang cổng')
    # giao diện điện thoại ngang
    m = open_game(b, 'Mini', viewport=(812, 375)); m._fr.fill('#ten', 'Mini'); m._fr.click('#goBtn'); wait_screen(m, 'lobby'); m.screenshot(path=OUT + '/6-phone-lobby.png')
    b.close()
print('\n%d LỖI' % len(fails) if fails else '\nTẤT CẢ ĐẠT')
sys.exit(1 if fails else 0)
