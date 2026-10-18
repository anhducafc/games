"""Kiểm tra từng game cũ: tải được, không gọi mạng ngoài, không lỗi, SDK hoạt động.
Dùng: python3 e2e_games.py <URL gốc, mặc định http://localhost:8080/>  (chạy `npm run serve` ở cửa sổ khác trước)."""
import json, sys, time
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

import os, tempfile
OUT = os.path.join(tempfile.gettempdir(), 'grc-e2e-')
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/').rstrip('/') + '/'
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required']

report = {}


def new_ctx(b):
    page = b.new_page(viewport={'width': 1100, 'height': 800})
    log = {'external': [], 'bad': [], 'errors': [], 'ok': 0}

    def on_req(r):
        u = urlparse(r.url)
        if u.scheme in ('http', 'https') and u.hostname not in ('localhost', '127.0.0.1'):
            log['external'].append(r.url)

    def on_resp(r):
        u = urlparse(r.url)
        if u.hostname in ('localhost', '127.0.0.1'):
            if r.status >= 400:
                log['bad'].append(f'{r.status} {r.url}')
            else:
                log['ok'] += 1

    page.on('request', on_req)
    page.on('response', on_resp)
    page.on('requestfailed', lambda r: log['bad'].append(f'FAILED {r.url} {r.failure}'))
    page.on('pageerror', lambda e: log['errors'].append('pageerror: ' + str(e)[:200]))
    page.on('console', lambda m: m.type == 'error' and log['errors'].append('console: ' + m.text[:200]))
    return page, log


def frame_of(page, game):
    for _ in range(50):
        for f in page.frames:
            if f'games/{game}/' in f.url:
                return f
        time.sleep(0.2)
    raise RuntimeError('không thấy iframe ' + game)


def scores(page):
    return page.evaluate("JSON.parse(localStorage.getItem('grc.scores.v1')||'{}')")


def set_hidden(page, hidden):
    page.evaluate("""(h) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => h ? 'hidden' : 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    }""", hidden)


def timer_used(page):
    return page.evaluate("(JSON.parse(localStorage.getItem('grc.playtime.v1')||'{}')).usedSeconds || 0")


def summarize(name, log):
    print(f'--- {name}: ok={log["ok"]} external={log["external"]} bad={log["bad"]} errors={log["errors"][:4]}')
    report[name] = {'external': log['external'], 'bad': log['bad'], 'errors': log['errors']}


with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)

    # ---------------- Hextris ----------------
    page, log = new_ctx(b)
    page.goto(BASE + '#/choi/hextris')
    fr = frame_of(page, 'hextris')
    fr.wait_for_selector('#startBtn', state='attached', timeout=15000)
    time.sleep(1.5)
    print('hextris gameState trước khi chơi:', fr.evaluate('window.gameState'))
    fr.click('#startBtn')
    time.sleep(1.5)
    print('hextris gameState sau khi bấm bắt đầu:', fr.evaluate('window.gameState'))
    page.screenshot(path=OUT + 'shot-hextris-play.png')
    # tăng tốc để game over nhanh
    fr.evaluate('window.spd = 25')
    for _ in range(60):
        if fr.evaluate('window.gameState') == 2:
            break
        time.sleep(0.5)
    print('hextris gameState cuối:', fr.evaluate('window.gameState'), 'score trong game:', fr.evaluate('window.score'))
    time.sleep(0.5)
    print('hextris điểm lưu ở cổng:', scores(page))
    print('hextris #socialShare/#buttonCont tồn tại (rỗng):', fr.evaluate("[!!document.getElementById('socialShare'), document.getElementById('buttonCont').children.length]"))
    page.screenshot(path=OUT + 'shot-hextris-over.png')
    # tạm dừng khi rời tab
    page.goto(BASE + '#/'); time.sleep(0.5); page.reload(); page.goto(BASE + '#/choi/hextris'); page.reload()
    fr = frame_of(page, 'hextris'); fr.wait_for_selector('#startBtn', state='attached'); time.sleep(1)
    fr.click('#startBtn'); time.sleep(1)
    set_hidden(page, True); time.sleep(1.2)
    print('hextris sau khi rời tab: gameState =', fr.evaluate('window.gameState'), '(mong đợi -1 = đang tạm dừng)')
    set_hidden(page, False)
    summarize('hextris', log)

    # ---------------- Xây tháp ----------------
    page, log = new_ctx(b)
    page.goto(BASE + '#/choi/xay-thap')
    fr = frame_of(page, 'xay-thap')
    fr.wait_for_selector('#start', state='visible', timeout=20000)
    page.evaluate("window.__msgs = []; addEventListener('message', e => { if (e.data && e.data.grc) window.__msgs.push(e.data.type + ':' + JSON.stringify(e.data.data)); })")
    page.screenshot(path=OUT + 'shot-xaythap-landing.png')
    fr.click('#start'); time.sleep(1.5)
    page.screenshot(path=OUT + 'shot-xaythap-play.png')
    print('xay-thap game paused ban đầu:', fr.evaluate('window.game.paused'))
    set_hidden(page, True); time.sleep(0.5)
    print('xay-thap sau khi rời tab: paused =', fr.evaluate('window.game.paused'))
    set_hidden(page, False); time.sleep(0.5)
    print('xay-thap sau khi quay lại: paused =', fr.evaluate('window.game.paused'))
    # thả khối liên tục cho đến khi hết 3 mạng
    box = page.locator('.stage').bounding_box()
    for i in range(40):
        page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        time.sleep(0.9)
        if fr.evaluate("!document.getElementById('over-zero').classList.contains('hide')"):
            break
    print('xay-thap hộp game over hiện:', fr.evaluate("!document.getElementById('over-zero').classList.contains('hide')"), 'điểm:', fr.evaluate('window.score'))
    print('xay-thap tin nhắn SDK:', page.evaluate('window.__msgs'))
    print('xay-thap điểm lưu ở cổng:', scores(page))
    page.screenshot(path=OUT + 'shot-xaythap-over.png')
    summarize('xay-thap', log)

    # ---------------- HexGL ----------------
    page, log = new_ctx(b)
    page.goto(BASE + '#/choi/hexgl')
    fr = frame_of(page, 'hexgl')
    fr.wait_for_selector('#start', state='visible', timeout=20000)
    page.evaluate("window.__msgs = []; addEventListener('message', e => { if (e.data && e.data.grc) window.__msgs.push(e.data.type + ':' + JSON.stringify(e.data.data)); })")
    page.screenshot(path=OUT + 'shot-hexgl-menu.png')
    print('hexgl menu:', fr.evaluate("[...document.querySelectorAll('#menu div')].map(e => e.textContent)"))
    # bấm điều khiển 2 lần: Keyboard -> Touch -> (bỏ Leap) -> Gamepad
    seq = []
    for _ in range(3):
        fr.click('#s-controlType'); seq.append(fr.inner_text('#s-controlType'))
    print('hexgl vòng lặp điều khiển:', seq)
    # đặt lại về Keyboard (còn 1 lần nữa)
    fr.click('#s-controlType'); print('   ->', fr.inner_text('#s-controlType'))
    fr.click('#start'); time.sleep(0.4)
    fr.click('#step-2'); time.sleep(0.5)
    try:
        fr.wait_for_selector('#step-4', state='visible', timeout=60000)
        print('hexgl: đã tải xong và vào màn chơi')
    except Exception as e:
        print('hexgl: KHÔNG vào được màn chơi:', str(e)[:120])
    time.sleep(7)  # đếm ngược
    page.screenshot(path=OUT + 'shot-hexgl-play.png')
    e1 = fr.evaluate('window.hexGL.gameplay.timer.time.elapsed')
    set_hidden(page, True); time.sleep(2.5)
    e_mid = fr.evaluate('window.hexGL.gameplay.timer.time.elapsed')
    set_hidden(page, False); time.sleep(0.6)
    e2 = fr.evaluate('window.hexGL.gameplay.timer.time.elapsed')
    print(f'hexgl đồng hồ đua: trước={e1} giữa lúc tạm dừng={e_mid} sau khi tiếp tục={e2} (nghỉ 2.5s không được tính, mong đợi sau-trước khoảng 0.6-1.5s)')
    # kiểm tra móc điểm khi về đích
    fr.evaluate("""() => { const g = window.hexGL; g.gameplay.result = g.gameplay.results.FINISH; g.displayScore(120000, [40000,40000,40000]); }""")
    time.sleep(0.5)
    print('hexgl tin nhắn SDK:', page.evaluate('window.__msgs'))
    print('hexgl điểm lưu ở cổng (mong đợi 4800):', scores(page))
    summarize('hexgl', log)

    # ---------------- Trang giới thiệu + license ----------------
    page, log = new_ctx(b)
    page.goto(BASE + '#/gioi-thieu')
    page.wait_for_selector('details.license')
    n = page.locator('details.license').count()
    page.locator('details.license summary').first.click()
    time.sleep(0.8)
    print('giới thiệu: số mục giấy phép =', n, '| nội dung đầu:', page.locator('.license-text').first.inner_text()[:70].replace('\n', ' '))
    summarize('about', log)

    # ---------------- Trang chủ ----------------
    page, log = new_ctx(b)
    page.goto(BASE); page.wait_for_selector('.tile'); time.sleep(0.8)
    print('trang chủ: tile =', page.locator('.tile').count(), 'chơi được =', page.locator('.tile:not(.tile-soon)').count())
    summarize('home', log)
    b.close()

json.dump(report, open(OUT + 'report.json', 'w'), indent=1)
