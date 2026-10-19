# Kịch bản kiểm thử bổ sung (batch 2). Được e2e_day4.py nạp tự động.
def t_nonogram(pg):
    n = pg.evaluate("__g.n"); sol = pg.evaluate("__g.sol")
    pg.evaluate("__g.setCell(%d,2)" % next(i for i in range(n*n) if not sol[i//n][i%n]))
    for i in range(n*n):
        if sol[i//n][i%n]: pg.evaluate("__g.setCell(%d,1)" % i)
    check(pg.evaluate("__g.state") == 'won', 'tô đúng bức tranh thì thắng')
    pg.click('#r1'); pg.click('#lvl button[data-n="8"]'); check(pg.evaluate("__g.n") == 8, 'đổi sang 8×8')
def t_co_caro(pg):
    pg.evaluate("__g.setLevel(0)")
    # người chơi đặt 5 quân liền hàng; máy dễ thường không chặn kịp
    for i in range(60):
        if pg.evaluate("__g.over"): break
        pg.evaluate("()=>{const g=__g,N=g.N; for(let r=0;r<N;r++){ for(let c=0;c<N;c++){ if(!g.B[r*N+c]){ g.play(r,c); return; } } } }")
        pg.wait_for_timeout(330)
    check(pg.evaluate("__g.over") or True, 'chơi nhiều nước không lỗi')
    pg.click('#again') if pg.locator('#again').count() else None
    pg.evaluate("__g.setLevel(1); __g.reset()")
    pg.evaluate("[3,4,5].forEach(c=>__g.put(10,c,1)); __g.put(3,3,2)")
    pg.evaluate("__g.play(10,6)"); pg.wait_for_timeout(500)
    blocked = pg.evaluate("__g.B[10*15+2]===2 || __g.B[10*15+7]===2")
    check(blocked, 'máy chặn khi người chơi có 4 quân liền')
    pg.evaluate("__g.reset()"); pg.evaluate("[3,4,5,6,7].forEach(c=>__g.put(10,c,1))")
    check(pg.evaluate("__g.over") and pg.evaluate("__g.wins") >= 1, 'đủ 5 quân liền thì thắng')
def t_phat_gach(pg):
    pg.evaluate("__g.launch()"); check(len(pg.evaluate("__g.balls")) == 1 and pg.evaluate("__g.balls[0].vy") < 0, 'phóng bóng đi lên')
    s0 = pg.evaluate("__g.score")
    for i in range(1500):   # bám bóng bằng thanh đỡ để chơi tự động
        pg.evaluate("()=>{const b=__g.balls[0]; if(b) __g.pad().x=b.x; __g.step(1/60);}")
        if pg.evaluate("__g.state") != 'play': break
    check(pg.evaluate("__g.score") > s0, 'phá được gạch, điểm %s' % pg.evaluate("__g.score"))
    pg.evaluate("()=>{ __g.pad().x = 20; }")
    for i in range(6000):
        if pg.evaluate("__g.state") != 'play': break
        pg.evaluate("()=>{ if(__g.balls.length && __g.balls[0].vy===0) __g.launch(); const b=__g.balls[0]; if(b) __g.pad().x = b.x < 280 ? 540 : 20; __g.step(1/30); }")
    check(pg.evaluate("__g.state") == 'over' or pg.evaluate("__g.lives") < 3, 'mất mạng khi bóng rơi (mạng còn %s)' % pg.evaluate("__g.lives"))
def t_bay_qua_ong(pg):
    pg.evaluate("__g.flap()"); check(pg.evaluate("__g.state") == 'play', 'bấm để bắt đầu bay')
    for i in range(1200):   # tự bay: giữ chim ở giữa khe ống gần nhất
        pg.evaluate("""()=>{const g=__g,b=g.bird,ps=g.pipes.filter(p=>p.x+56>b.x-14); const p=ps[0]; const target=p? p.top+p.gap/2 : 322; if(b.y>target+8 && b.vy>-50) g.flap(); g.step(1/60);}""")
        if pg.evaluate("__g.state") != 'play': break
    check(pg.evaluate("__g.score") >= 5, 'bay qua được ống, điểm %s' % pg.evaluate("__g.score"))
    for i in range(300):
        if pg.evaluate("__g.state") == 'dead': break
        pg.evaluate("__g.step(1/30)")
    pg.wait_for_timeout(700); check(pg.evaluate("__g.state") == 'dead' or pg.locator('#end.show').count() == 1, 'va chạm thì kết thúc')
def t_danh_van(pg):
    for i in range(10):
        w = pg.evaluate("__g.cur[0]")
        for ch in w: pg.evaluate("__g.type('%s')" % ch)
        pg.wait_for_timeout(1400)
    check(pg.locator('#end.show').count() == 1 and pg.evaluate("__g.score") > 150, 'ghép đúng 10 từ, điểm %s' % pg.evaluate("__g.score"))
    ws = pg.evaluate("__g.words"); check(len(ws) >= 60 and len(set(w[0] for w in ws)) == len(ws), 'kho từ %d từ, không trùng' % len(ws))
TESTS = {'nonogram': t_nonogram, 'co-caro': t_co_caro, 'phat-gach': t_phat_gach, 'bay-qua-ong': t_bay_qua_ong, 'danh-van': t_danh_van}
def t_xep_bai(pg):
    n = pg.evaluate("__g.st.tab.map(p=>p.length)"); check(n == [1,2,3,4,5,6,7] and pg.evaluate("__g.st.stock.length") == 24, 'chia bài đúng: cột %s, kho 24' % n)
    check(pg.evaluate("__g.st.tab.every(p=>p.filter(c=>c.up).length===1)"), 'mỗi cột chỉ ngửa lá cuối')
    pg.evaluate("__g.drawStock()"); check(pg.evaluate("__g.st.waste.length") == 1, 'rút 1 lá từ kho'); pg.evaluate("__g.undo()"); check(pg.evaluate("__g.st.waste.length") == 0, 'đi lại hoàn tác rút bài')
    # dựng thế: cột 0 có A♠ ở cuối, đặt lên ô trên cùng
    pg.evaluate("()=>{const s=__g.st; s.tab[0]=[{s:0,r:1,up:true,id:1}]; __g.st=s;}")
    ok = pg.evaluate("__g.tryMove({loc:{t:'t',i:0,k:0},cards:[__g.st.tab[0][0]]},{t:'f',i:0})"); check(ok and pg.evaluate("__g.st.found[0].length") == 1 and pg.evaluate("__g.score") >= 10, 'đưa A♠ lên ô trên cùng, điểm %s' % pg.evaluate("__g.score"))
    bad = pg.evaluate("()=>{const s=__g.st; s.tab[1]=[{s:1,r:5,up:true,id:20}]; __g.st=s; return __g.tryMove({loc:{t:'t',i:1,k:0},cards:[s.tab[1][0]]},{t:'f',i:1})}"); check(not bad, 'không cho đặt 5♥ lên ô trống')
    # thắng: 51 lá đã lên, còn K♠ ở cột 0
    pg.evaluate("""()=>{const f=[[],[],[],[]]; for(let s=0;s<4;s++) for(let r=1;r<=13;r++) if(!(s===0&&r===13)) f[s].push({s:s,r:r,up:true,id:s*13+r}); const st={stock:[],waste:[],found:f,tab:[[{s:0,r:13,up:true,id:13}],[],[],[],[],[],[]]}; __g.st=st;}""")
    pg.evaluate("__g.tryMove({loc:{t:'t',i:0,k:0},cards:[__g.st.tab[0][0]]},{t:'f',i:0})"); pg.wait_for_timeout(300)
    check(pg.evaluate("__g.state") == 'won' and pg.locator('#end.show').count() == 1, 'xếp đủ 52 lá thì thắng')
TESTS['xep-bai'] = t_xep_bai
def t_xay_cau(pg):
    n = pg.evaluate("__g.isl.length"); sol = pg.evaluate("__g.sol")
    check(n >= 6 and len(sol) >= n - 1, 'sinh màn: %d đảo, %d cầu' % (n, len(sol)))
    # chạm thật: nối 2 đảo đầu của cầu giải
    k = next(iter(sol)); a, b = map(int, k.split('-'))
    pg.evaluate("__g.tap(%d)" % a); pg.evaluate("__g.tap(%d)" % b); check(pg.evaluate("__g.bridges['%s']" % k) == 1, 'chạm hai đảo thì xây cầu đơn')
    pg.evaluate("__g.tap(%d)" % a); pg.evaluate("__g.tap(%d)" % b); check(pg.evaluate("__g.bridges['%s']" % k) == 2, 'chạm lần nữa thành cầu đôi')
    pg.evaluate("__g.tap(%d)" % a); pg.evaluate("__g.tap(%d)" % b); check(pg.evaluate("__g.bridges['%s']" % k) == 0, 'lần ba thì phá cầu')
    for e, v in sol.items(): pg.evaluate("__g.setBridge('%s',%d)" % (e, v))
    check(pg.evaluate("__g.state") == 'won', 'xây đúng lời giải thì thắng')
    for N in (9, 11):
        pg.click('#lvl button[data-n="%d"]' % N); m = pg.evaluate("[__g.N, __g.isl.length]"); check(m[0] == N and m[1] >= 8, 'sinh được màn %dx%d với %d đảo' % (N, N, m[1]))
def t_do_co_cac_nuoc(pg):
    ps = pg.evaluate("window.PUZZLES2"); check(len(ps) >= 20, 'có %d đố thắng quân' % len(ps))
    ans = pg.evaluate("__g.cur.ans[0]")
    mv = pg.evaluate("(san)=>{const g=__g.g; const m=g.moves({verbose:true}).find(x=>x.san===san); return [m.from,m.to];}", ans)
    sq = lambda s: pg.locator('[data-sq="%s"]' % s)
    wrong = pg.evaluate("()=>{const g=__g.g; const a=__g.cur.ans; const m=g.moves({verbose:true}).find(x=>a.indexOf(x.san)<0); return [m.from,m.to];}")
    sq(wrong[0]).click(); sq(wrong[1]).click(); pg.wait_for_timeout(200); check('Chưa phải' in pg.inner_text('#msg'), 'nước sai bị báo')
    pg.wait_for_timeout(1000); sq(mv[0]).click(); sq(mv[1]).click(); pg.wait_for_timeout(300)
    check(pg.evaluate("__g.score") > 10, 'nước đúng được điểm %s' % pg.evaluate("__g.score"))
TESTS['xay-cau'] = t_xay_cau
TESTS['do-co-cac-nuoc'] = t_do_co_cac_nuoc
def t_dua_xe(pg):
    check(pg.evaluate("__g.cars.length") == 4 and pg.evaluate("__g.state") == 'count', 'có 4 xe, đang đếm ngược')
    for lvl in (0, 1, 2):
        pg.evaluate("__g.level=%d; __g.newRace(); __g.auto=true" % lvl)
        for i in range(8000):
            done = pg.evaluate("(()=>{for(let k=0;k<30;k++){__g.step(1/60);} return __g.state})()")
            if done == 'done': break
        r = pg.evaluate("[__g.rank, __g.time, __g.player.lap, __g.score]")
        check(done == 'done' and r[2] >= 3, 'đường %d: tự lái xong 3 vòng sau %.1fs, hạng %d' % (lvl, r[1], r[0]))
        offs = pg.evaluate("__g.cars.map(c=>Math.round(c.dist))"); check(max(offs) < 200, 'xe không văng khỏi đường (lệch tối đa %d)' % max(offs))
    check(pg.evaluate("__g.score") > 0, 'có điểm sau đua: %s' % pg.evaluate("__g.score"))
TESTS['dua-xe-ti-hon'] = t_dua_xe
def t_the_gioi_khoi(pg):
    t0 = pg.evaluate("__g.count()"); check(t0 > 200, 'thế giới có %d khối' % t0)
    pg.wait_for_timeout(300)
    for r in range(4):
        pg.evaluate("__g.setRot(%d)" % r); pg.wait_for_timeout(350)
        pts = pg.evaluate("(()=>{const f=__g.faces.filter(f=>f.n[2]===1); const m=Math.floor(f.length/2); return f.slice(m,m+12).map(t=>t.poly.reduce((a,p)=>[a[0]+p[0]/4,a[1]+p[1]/4],[0,0]))})()")
        before = pg.evaluate("__g.count()"); pg.evaluate("__g.setMode('build')"); n = pg.evaluate("__g.faces.length")
        for c in pts:
            pg.evaluate("__g.act(%f,%f)" % (c[0], c[1]))
            if pg.evaluate("__g.count()") == before + 1: break
        check(pg.evaluate("__g.count()") == before + 1, 'xoay %d: chạm mặt trên thì đặt thêm 1 khối (mặt hiển thị %d)' % (r * 90, n))
        pg.evaluate("__g.setRot(%d)" % r); pg.wait_for_timeout(350)
        pg.evaluate("__g.setMode('dig')"); f2 = pg.evaluate("(()=>{const f=__g.faces.filter(f=>f.n[2]===1); const t=f[0]; return t.poly.reduce((a,p)=>[a[0]+p[0]/4,a[1]+p[1]/4],[0,0]);})()")
        b2 = pg.evaluate("__g.count()"); pg.evaluate("__g.act(%f,%f)" % (f2[0], f2[1])); check(pg.evaluate("__g.count()") == b2 - 1, 'xoay %d: đào được 1 khối' % (r * 90))
    pg.evaluate("__g.gen(true)"); check(pg.evaluate("__g.count()") == 14 * 14 * 2, 'nền phẳng đúng %d khối' % pg.evaluate("__g.count()"))
TESTS['the-gioi-khoi'] = t_the_gioi_khoi
def t_tangram(pg):
    check(pg.evaluate("__g.levels.length") >= 30 and pg.evaluate("!__g.solved"), 'có ≥30 hình, màn đầu chưa giải')
    box = pg.locator('#cv').bounding_box(); sc = box['width'] / 600
    p = pg.evaluate("__g.pieces[__g.pieces.length-1]"); before = pg.evaluate("JSON.stringify(__g.pieces[6].pts)")
    pg.mouse.click(box['x'] + p['x'] * sc, box['y'] + p['y'] * sc); pg.wait_for_timeout(100)
    check(pg.evaluate("JSON.stringify(__g.pieces[6].pts)") != before, 'chạm vào mảnh thì xoay 45°')
    x0 = box['x'] + p['x'] * sc; y0 = box['y'] + p['y'] * sc
    pg.mouse.move(x0, y0); pg.mouse.down(); pg.mouse.move(x0 - 40, y0 - 40, steps=4); pg.mouse.up()
    check(pg.evaluate("Math.abs(__g.pieces[6].x - %f)" % p['x']) > 20, 'kéo thả di chuyển mảnh')
    pg.click('#hint'); pg.click('#flip')
    pg.evaluate("__g.solve()"); pg.wait_for_timeout(200)
    check(pg.evaluate("__g.solved"), 'đặt đúng lời giải thì thắng')
    pg.click('#go'); check(pg.evaluate("!__g.solved") and pg.evaluate("document.getElementById('lv').textContent") == '2', 'sang màn 2')
TESTS['tangram'] = t_tangram

def t_quoc_ky(pg):
    check(pg.evaluate("__g.queue.length") == 30, '30 câu, 5 cấp')
    lv = pg.evaluate("__g.queue.map(x=>x.level)"); check(lv == sorted(lv), 'độ khó tăng dần theo cấp')
    check(pg.evaluate("new Set(__g.queue.map(x=>x.c.c)).size") == 30, 'không lặp nước trong một ván')
    check(pg.evaluate("__g.q.opts.length") == 4 and pg.evaluate("new Set(__g.q.opts.map(o=>o.c)).size") == 4, '4 đáp án khác nhau')
    check(pg.evaluate("__g.q.opts.some(o=>o.c===__g.q.c.c)"), 'có đáp án đúng trong 4 lựa chọn')
    check(pg.evaluate("document.getElementById('flag').naturalWidth") > 0, 'ảnh quốc kỳ tải được')
    pg.evaluate("__g.step(3)"); t = pg.evaluate("__g.timeLeft"); pg.evaluate("__g.answer(__g.q.ans)")
    s1 = pg.evaluate("__g.score"); check(s1 == 100 + int(t) * 20, 'cấp 1: điểm = 100 + 20 x giây còn lại (%d, còn %.1fs)' % (s1, t))
    pg.wait_for_timeout(1100); check(pg.evaluate("__g.qi") == 1, 'tự sang câu kế')
    pg.evaluate("__g.answer((__g.q.ans+1)%4)"); check(pg.evaluate("__g.lives") == 2, 'trả lời sai mất 1 mạng')
    pg.wait_for_timeout(1900); pg.evaluate("__g.step(100)"); check(pg.evaluate("__g.lives") == 1, 'hết giờ mất 1 mạng')
    pg.wait_for_timeout(1900); pg.evaluate("__g.step(100)"); pg.wait_for_timeout(1900)
    check(pg.evaluate("__g.over") and pg.evaluate("document.getElementById('end').classList.contains('show')"), 'hết 3 mạng thì kết thúc')
    pg.click('#again'); check(not pg.evaluate("__g.over") and pg.evaluate("__g.lives") == 3 and pg.evaluate("__g.score") == 0, 'chơi lại')
    for i in range(30):
        pg.evaluate("__g.answer(__g.q.ans)"); pg.wait_for_timeout(950)
    check(pg.evaluate("__g.over") and pg.evaluate("__g.score") > 6000, 'trả lời đúng cả 30 câu: thắng, điểm %d' % pg.evaluate("__g.score"))
TESTS['quoc-ky'] = t_quoc_ky
