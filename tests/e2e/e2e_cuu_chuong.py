"""Kiểm thử game Cửu chương vui (chạy từ thư mục gốc dự án): python3 tests/e2e/e2e_cuu_chuong.py"""
import subprocess, time, sys
from playwright.sync_api import sync_playwright
srv = subprocess.Popen(['python3', '-m', 'http.server', '8766', '-d', 'public'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
ok = True
def check(name, cond):
    global ok; print(('PASS ' if cond else 'FAIL ') + name); ok = ok and bool(cond)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 960, 'height': 600}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://localhost:8766/games/cuu-chuong/index.html'); pg.wait_for_timeout(500)
        check('số câu theo cấp 16/16/16/16/20', pg.evaluate('[1,2,3,4,5].map(l=>__g.build([],l).length)') == [16, 16, 16, 16, 20])
        check('bảng 1 và 10 chỉ 3 câu, bảng 7 có 8 câu', pg.evaluate('[__g.build([1],1).length,__g.build([10],1).length,__g.build([7],1).length]') == [3, 3, 8])
        check('đáp án luôn đúng và có 4 lựa chọn khác nhau', pg.evaluate('''(()=>{for(let i=0;i<50;i++){const q=__g.build([],5)[0];if(q.ans!==q.a*q.b)return false}return true})()'''))
        # chế độ thỏ: trả lời đúng hết cấp 1
        pg.click('#go'); pg.wait_for_selector('#s-play.on')
        n = pg.evaluate('__g.S.qs.length')
        for i in range(n):
            pg.wait_for_function('__g.S.state=="ask"', timeout=5000); pg.evaluate('__g.ans(true)'); pg.wait_for_timeout(1000)
        pg.wait_for_selector('#s-result.on', timeout=5000)
        check('đúng hết: 3 sao, nút cấp tiếp', pg.evaluate('__g.S.stars') == 3 and pg.is_visible('#rNext'))
        check('không có câu sai thì không có nút ôn', not pg.is_visible('#rReview'))
        # sai 3 lần thì thua
        pg.click('#rAgain')
        for i in range(3):
            pg.wait_for_function('__g.S.state=="ask"', timeout=5000); pg.evaluate('__g.ans(false)'); pg.wait_for_timeout(1700)
        pg.wait_for_selector('#s-result.on', timeout=5000)
        check('hết tim: 0 sao, có nút ôn 3 câu', pg.evaluate('__g.S.stars') == 0 and pg.inner_text('#rReview') == 'Ôn 3 câu này')
        pg.click('#rReview'); pg.wait_for_selector('#s-play.on'); check('ôn lại đúng 3 câu', pg.evaluate('__g.S.qs.length') == 3)
        # hết giờ tự mất tim
        pg.evaluate('__g.S.limit=1'); pg.wait_for_timeout(3000); check('hết giờ mất tim', pg.evaluate('__g.S.hearts') <= 2)
        # chế độ bóng
        pg.click('#quit'); pg.click('#md-bubble'); pg.click('#chips [data-t="2"]'); pg.click('#go'); pg.wait_for_selector('#s-play.bub.on')
        pg.wait_for_function('__g.S.state=="ask"'); pg.evaluate('__g.ans(true)'); pg.wait_for_timeout(300)
        check('bóng đúng được điểm', pg.evaluate('__g.S.score') > 0)
        pg.wait_for_function('__g.S.state=="ask"', timeout=5000); h = pg.evaluate('__g.S.hearts'); pg.evaluate('__g.ans(false)')
        check('chạm bóng sai mất tim', pg.evaluate('__g.S.hearts') == h - 1)
        # tắt tiếng
        pg.click('#mute2'); check('nút tắt tiếng', pg.evaluate('document.body.classList.contains("muted")'))
        check('không có lỗi JS', not errs); b.close()
finally:
    srv.terminate()
sys.exit(0 if ok else 1)
