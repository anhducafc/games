"""Kiểm tra Slime nhảy phím: chơi, điểm, mất tim, tạm dừng, game over, lưu điểm, chạm phím.
Dùng: python3 e2e_slime.py <URL gốc, mặc định http://localhost:8080/>  (chạy `npm run serve` ở cửa sổ khác trước)."""
import sys, time
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
import os, tempfile
OUT = os.path.join(tempfile.gettempdir(), 'grc-e2e-')
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/').rstrip('/') + '/'
with sync_playwright() as p:
    b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    page=b.new_page(viewport={'width':1100,'height':800})
    ext=[];bad=[];errs=[]
    page.on('request',lambda r: ext.append(r.url) if urlparse(r.url).hostname not in('localhost','127.0.0.1') and r.url.startswith('http') else None)
    page.on('response',lambda r: bad.append(f'{r.status} {r.url}') if r.status>=400 else None)
    page.on('requestfailed',lambda r: bad.append('FAILED '+r.url))
    page.on('pageerror',lambda e: errs.append(str(e)[:200]))
    page.on('console',lambda m: errs.append('console:'+m.text[:200]) if m.type=='error' else None)
    page.goto(BASE+'#/choi/slime-nhay-phim')
    fr=None
    for _ in range(50):
        for f in page.frames:
            if 'games/slime-nhay-phim/' in f.url: fr=f
        if fr: break
        time.sleep(.2)
    fr.wait_for_function('window.__slime',timeout=10000); time.sleep(1)
    page.evaluate("window.__m=[];addEventListener('message',e=>{if(e.data&&e.data.grc)__m.push(e.data.type+':'+JSON.stringify(e.data.data))})")
    print('origin:',fr.evaluate('location.origin'),'| fonts:',fr.evaluate("[...document.fonts].map(f=>f.weight+f.status).join(',')"))
    page.screenshot(path=OUT+'shot-slime-menu.png')
    page.keyboard.press('Space'); time.sleep(.3)
    print('mode sau Space:',fr.evaluate('__slime.st.mode'))
    # gõ đúng 12 lần
    for i in range(12):
        L=fr.evaluate('__slime.good.l'); page.keyboard.press('Key'+L); time.sleep(.35)
    s=fr.evaluate('({score:__slime.st.score,hops:__slime.st.hops,lv:__slime.st.level,combo:__slime.st.combo,hearts:__slime.st.hearts})'); print('sau 12 lần đúng:',s)
    # nhấn sai
    L=fr.evaluate('__slime.good.l'); wrong=[c for c in 'QWERTYUIOPASDFGHJKLZXCVBNM' if c!=L and c!=fr.evaluate('__slime.good.l') and c not in fr.evaluate('__slime.decoys')][0]
    sc0=fr.evaluate('__slime.st.score'); page.keyboard.press('Key'+wrong); time.sleep(.2)
    print('sai: combo',fr.evaluate('__slime.st.combo'),'điểm',sc0,'->',fr.evaluate('__slime.st.score'))
    page.screenshot(path=OUT+'shot-slime-play.png')
    # tạm dừng qua SDK (ẩn tab)
    t0=fr.evaluate('__slime.good.time')
    page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'))"); time.sleep(2.0)
    t1=fr.evaluate('__slime.good.time')
    print('tạm dừng: thời gian còn lại trước/sau 2s ẩn tab = %.2f / %.2f (không giảm là đúng)'%(t0,t1))
    page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'});document.dispatchEvent(new Event('visibilitychange'))"); time.sleep(.3)
    # mức 4 có bẫy
    fr.evaluate('__slime.st.hops=30;__slime.st.level=4'); 
    L=fr.evaluate('__slime.good.l'); page.keyboard.press('Key'+L); time.sleep(.4)
    print('cấp',fr.evaluate('__slime.st.level'),'bẫy:',fr.evaluate('__slime.decoys'))
    page.screenshot(path=OUT+'shot-slime-decoy.png')
    # để hết giờ 3 lần -> game over
    for _ in range(60):
        if fr.evaluate('__slime.st.mode')=='over': break
        time.sleep(.5)
    print('mode cuối:',fr.evaluate('__slime.st.mode'),'tim:',fr.evaluate('__slime.st.hearts'))
    time.sleep(1); page.screenshot(path=OUT+'shot-slime-over.png')
    print('tin SDK:',page.evaluate('__m'))
    print('điểm lưu ở cổng:',page.evaluate("JSON.parse(localStorage.getItem('grc.scores.v1')||'{}')"))
    page.keyboard.press('Space'); time.sleep(.3); print('chơi lại ->',fr.evaluate('__slime.st.mode'),'điểm',fr.evaluate('__slime.st.score'))
    # chạm trực tiếp lên phím
    L=fr.evaluate('__slime.good.l'); k=fr.evaluate(f'(()=>{{const k=__slime.keys["{L}"];return [k.cx,k.y+30]}})()')
    box=page.locator('iframe').bounding_box(); cv=fr.evaluate("(()=>{const r=document.getElementById('c').getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
    page.mouse.click(box['x']+cv[0]+k[0]/960*cv[2], box['y']+cv[1]+k[1]/540*cv[3]); time.sleep(.3)
    print('chạm vào phím đúng -> hops',fr.evaluate('__slime.st.hops'))
    print('ngoài:',ext,'| lỗi tải:',bad,'| lỗi:',errs)
    b.close()
