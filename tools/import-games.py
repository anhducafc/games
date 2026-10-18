#!/usr/bin/env python3
"""
Nhập 3 game mã nguồn mở vào public/games/ rồi vá cho phù hợp với Giờ Ra Chơi:
  - gỡ analytics, quảng cáo, nút chia sẻ, link cửa hàng, script tải từ xa
  - gắn Game SDK (điểm, tạm dừng, hết giờ)
  - thay font và âm thanh không rõ giấy phép

Cách dùng:
  mkdir /tmp/src && cd /tmp/src
  git clone --depth 1 https://github.com/BKcore/HexGL.git
  git clone --depth 1 https://github.com/iamkun/tower_game.git
  git clone --depth 1 https://github.com/Hextris/hextris.git
  python3 tools/import-games.py /tmp/src
  python3 tools/make-sfx.py            # âm thanh hiệu ứng cho Xây tháp (cần numpy, ffmpeg)

Mỗi bản vá kiểm tra mẫu cần thay có tồn tại. Nếu game nguồn đổi mã, script dừng và báo lỗi
thay vì âm thầm bỏ qua (tránh để lọt tracking).
"""
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'games'
GLUE = ROOT / 'tools' / 'glue'


def fail(msg):
    sys.exit(f'LỖI: {msg}')


def read(p):
    return Path(p).read_text(encoding='utf-8')


def write(p, s):
    Path(p).write_text(s, encoding='utf-8')


def sub(s, old, new, label, regex=False, flags=0, count=1):
    """Thay thế và bắt buộc phải khớp đúng một lần."""
    if regex:
        s2, n = re.subn(old, new, s, flags=flags)
    else:
        n = s.count(old)
        s2 = s.replace(old, new)
    if n != count:
        fail(f'bản vá "{label}": mong đợi {count} chỗ khớp, tìm thấy {n}')
    return s2


def copy_tree(src, dst, ignore=()):
    ig = shutil.ignore_patterns(*ignore) if ignore else None
    shutil.copytree(src, dst, ignore=ig, dirs_exist_ok=True)


def fresh(dest):
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)


SDK_TAGS = '<script src="../../sdk/grc-sdk.js"></script>\n<script src="grc-glue.js"></script>\n'


# ---------------------------------------------------------------- HexGL
def import_hexgl(src):
    d = OUT / 'hexgl'
    fresh(d)
    for name in ('bkcore.coffee', 'css', 'geometries', 'textures', 'textures.full', 'audio'):
        copy_tree(src / name, d / name, ignore=('*.coffee',))
    copy_tree(src / 'bkcore', d / 'bkcore', ignore=('Ladder.js', '*.coffee'))
    copy_tree(src / 'libs', d / 'libs', ignore=('Editor.html', 'Editor_files', 'Three.r53.js', 'leap-0.4.1.min.js'))
    for f in ('launch.js', 'favicon.png', 'LICENSE'):
        shutil.copy(src / f, d / f)
    shutil.move(d / 'LICENSE', d / 'LICENSE-MIT.txt')

    h = read(src / 'index.html')
    h = sub(h, r'\s*<meta property="og:[^>]*/>', '', 'og meta', regex=True, count=5)
    h = sub(h, r'\s*<meta property="fb:admins"[^>]*/>', '', 'fb meta', regex=True)
    h = sub(h, r'\s*<link rel="(shortcut )?icon" href="http://hexgl\.bkcore\.com/favicon\.png"[^>]*>', '', 'remote favicon', regex=True, count=2)
    h = sub(h, r'\s*<script type="text/javascript">\s*//analytics.*?</script>', '', 'google analytics', regex=True, flags=re.S)
    h = sub(h, '<meta charset="utf-8">', '<meta charset="utf-8">\n    <link rel="icon" href="favicon.png" type="image/png">', 'local favicon')
    h = sub(h, '    <script src="libs/leap-0.4.1.min.js"></script>\n', '', 'leap lib')
    h = sub(h, '<br>LeapMotion', '', 'leap credit')
    h = sub(h, '<script src="launch.js"></script>', '<script src="launch.js"></script>\n' + SDK_TAGS, 'sdk tags')
    if re.search(r'google-analytics|googletagmanager|_gaq|bkcore\.com/(image|favicon)', h):
        fail('HexGL index.html còn tham chiếu analytics hoặc host ngoài')
    write(d / 'index.html', h)

    j = read(src / 'launch.js')
    # chất lượng mặc định vừa phải để máy học sinh chạy mượt
    j = sub(j, r"\['quality', (\[[^\]]*\]), 3, 3,", r"['quality', \1, defaultQuality, defaultQuality,", 'quality default', regex=True)
    j = sub(j, 'defaultControls = bkcore.Utils.isTouchDevice() ? 1 : 0;',
            'defaultControls = bkcore.Utils.isTouchDevice() ? 1 : 0;\n\n  var defaultQuality = bkcore.Utils.isTouchDevice() ? 1 : 2;', 'quality var')
    # bỏ lựa chọn Leap Motion (thiết bị hiếm, chọn nhầm sẽ mất điều khiển)
    j = sub(j, 'return f(a[3] = (a[3] + 1) % a[1].length);',
            "var n = (a[3] + 1) % a[1].length;\n      if (a[0] === 'controlType' && n === 2) n = (n + 1) % a[1].length;\n      return f(a[3] = n);", 'skip leap')
    j = sub(j, "getWebGL.innerHTML = 'WebGL is not supported!';", "getWebGL.innerHTML = 'Thiết bị này chưa hỗ trợ WebGL';", 'webgl msg')
    j = sub(j, "return window.location.href = 'http://get.webgl.org/';", 'return false;', 'webgl link')
    write(d / 'launch.js', j)
    shutil.copy(GLUE / 'hexgl.js', d / 'grc-glue.js')
    write(d / 'LICENSE.md', read(GLUE / 'hexgl-LICENSE.md'))


# ---------------------------------------------------------- Tower Game
def import_tower(src):
    d = OUT / 'xay-thap'
    fresh(d)
    (d / 'dist').mkdir()
    shutil.copy(src / 'LICENSE', d / 'LICENSE-MIT.txt')
    # chỉ lấy tài nguyên cần dùng; bỏ .ogg (không được nạp), font wenxue, nút chia sẻ WeChat
    # và 4 âm hiệu ứng không rõ nguồn (thay bằng âm tự tổng hợp bởi tools/make-sfx.py)
    copy_tree(src / 'assets', d / 'assets', ignore=(
        '*.ogg', 'wenxue.*', 'main-share-icon.png', 'main-modal-invite-b.png',
        'drop.mp3', 'drop-perfect.mp3', 'game-over.mp3', 'rotate.mp3'))

    m = read(src / 'dist' / 'main.js')
    m = sub(m, 'h=void 0===o?"wenxue":o', 'h=void 0===o?"\'Baloo 2\',Arial,sans-serif":o', 'canvas font')
    write(d / 'dist' / 'main.js', m)

    h = read(src / 'index.html')
    h = sub(h, r'<script async src="https://www\.googletagmanager\.com/[^"]*"></script>', '', 'gtag loader', regex=True)
    h = sub(h, r'<script>function gtag\(\).*?</script>', '', 'gtag init', regex=True, flags=re.S)
    h = sub(h, "alert('Network error... Please try again.')", "console.error('Network error')", 'alert')
    h = sub(h, r'<div class="wxShare hide">.*?</div></div>(?=<script src="./dist/main.js">)', '</div>', 'wechat overlay', regex=True, flags=re.S)
    h = sub(h, r'<img src="./assets/main-modal-invite-b\.png" class="over-button-b js-invite">', '', 'invite button', regex=True)
    h = sub(h, r"\n\s*\$\('\.js-invite'\)\.on\('click', function \(\) \{\n\s*\$\('\.wxShare'\)\.show\(\)\n\s*\}\)\n", '\n', 'invite handler', regex=True)
    h = sub(h, r"\n\s*\$\('\.wxShare'\)\.on\('click', function \(\) \{\n\s*\$\('\.wxShare'\)\.hide\(\)\n\s*\}\)\n", '\n', 'wxShare handler', regex=True)
    h = sub(h, "window.location.href = window.location.href + '?s=' + (+new Date())", 'window.location.reload()', 'reload')
    h = sub(h, "if (f >= 3) overShowOver()", "if (f >= 3) {\n        if (window.GRC) GRC.score(score)\n        overShowOver()\n      }", 'score hook')
    h = sub(h, r'\.wxShare\{[^}]*\}\.wxShare img\{[^}]*\}', '', 'wxShare css', regex=True)
    # font wenxue (không rõ giấy phép) thay bằng Baloo 2
    h = sub(h, r'@font-face\{font-family:wenxue;[^}]*\}', '', 'wenxue font-face', regex=True)
    h = sub(h, '.font-wenxue{font-family:wenxue}', ".font-wenxue{font-family:'Baloo 2',Arial,sans-serif;font-weight:800}", 'wenxue class')
    h = sub(h, '<title>Tower Building</title>', '<title>Xây tháp</title><link rel="stylesheet" href="../../fonts/fonts.css">', 'title+fonts')
    h = sub(h, '<script src="./assets/zepto-1.1.6.min.js"></script>', '<script src="./assets/zepto-1.1.6.min.js"></script>\n' + SDK_TAGS, 'sdk tags')
    if re.search(r'googletagmanager|gtag|wxShare|invite|wenxue\.(eot|woff|ttf|svg)', h):
        fail('Tower Game index.html còn tham chiếu cần gỡ')
    write(d / 'index.html', h)
    shutil.copy(GLUE / 'tower.js', d / 'grc-glue.js')
    write(d / 'LICENSE.md', read(GLUE / 'tower-LICENSE.md'))


# -------------------------------------------------------------- Hextris
def import_hextris(src):
    d = OUT / 'hextris'
    fresh(d)
    copy_tree(src / 'js', d / 'js')
    copy_tree(src / 'vendor', d / 'vendor', ignore=('rrssb.min.js',))
    copy_tree(src / 'style', d / 'style', ignore=('rrssb.css', 'fa', 'Lovelo.otf', 'QuattrocentoSans-Regular.ttf', 'roboto.woff'))
    copy_tree(src / 'images', d / 'images', ignore=(
        'android.png', 'appstore.svg', 'btn_facebook.svg', 'btn_twitter.svg', 'btn_share.svg',
        'facebook-opengraph.png', 'twitter-opengraph.png', 'icons'))
    shutil.copy(src / 'favicon.ico', d / 'favicon.ico')
    shutil.copy(src / 'LICENSE.md', d / 'LICENSE-GPL-3.0.md')

    h = read(src / 'index.html')
    h = sub(h, r'<script>\s*\(function\(i,s,o,g,r,a,m\).*?</script>', '', 'google analytics', regex=True, flags=re.S)
    h = sub(h, r'<script type="text/javascript">\s*\(function addRussianSocialShare.*?</script>', '', 'russian share', regex=True, flags=re.S)
    drop = [r'apple-itunes-app', r'property=.og:', r'property=.twitter:', r'rel="manifest"', r'apple-touch-icon',
            r'fonts\.googleapis\.com', r'rrssb', r'adsbygoogle', r'font-awesome']
    lines = h.split('\n')
    kept = [ln for ln in lines if not any(re.search(p, ln) for p in drop)]
    if len(lines) - len(kept) < 20:
        fail('Hextris: số dòng meta/script bị gỡ ít hơn dự kiến')
    h = '\n'.join(kept)
    h = sub(h, r"<div id='bottomContainer'>.*</body>",
            # #buttonCont và #socialShare giữ lại rỗng: mã game dùng offset() của chúng để căn bố cục
            "<div id='bottomContainer'><img id='restart' src='./images/btn_restart.svg' height='57px'>"
            "<div id='socialShare'></div><div id='buttonCont'></div></div>\n\t\t</div>\n"
            "\t\t" + SDK_TAGS.replace('\n', '\n\t\t').rstrip() + "\n\t</body>", 'share block', regex=True, flags=re.S)
    if re.search(r'google-analytics|googlesyndication|facebook\.com|twitter\.com|itunes\.apple|play\.google|rrssb', h):
        fail('Hextris index.html còn tham chiếu cần gỡ')
    write(d / 'index.html', h)

    m = read(src / 'js' / 'main.js')
    m = sub(m, r"\n\s*\$\.get\('http://54\.183\.184\.126/' \+ String\(score\)\)", '', 'score leak to unknown IP', regex=True)
    m = sub(m, r"\(function\(\)\{\s*var script = document\.createElement\('script'\);\s*script\.src = 'http://hextris\.io/a\.js';\s*document\.head\.appendChild\(script\);\s*\}\)\(\)", '', 'remote script', regex=True)
    m = sub(m, r"By <a href='http://loganengstrom\.com'.*?Hextris Website</a>",
            'By Logan Engstrom &amp; Garrett Finucane<br>Open source (GPL-3.0)', 'help links', regex=True)
    write(d / 'js' / 'main.js', m)

    i = read(src / 'js' / 'initialization.js')
    i = sub(i, r"\(function\(i, s, o, g, r, a, m\) \{.*?ga\('send', 'pageview'\);", '', 'analytics init', regex=True, flags=re.S)
    write(d / 'js' / 'initialization.js', i)

    v = read(src / 'js' / 'view.js')
    plain = "<div class='centeredHeader unselectable'>Game Paused</div>"
    for key in ('pausedAndroid', 'pausediOS', 'pausedOther'):
        v = sub(v, r"'" + key + r"': \".*\",\n", f"'{key}': \"{plain}\",\n", f'store link {key}', regex=True)
    write(d / 'js' / 'view.js', v)

    shutil.copy(GLUE / 'hextris.js', d / 'grc-glue.js')
    write(d / 'LICENSE.md', read(GLUE / 'hextris-LICENSE.md'))

    # Quét lại: không còn host ngoài trong mã đã vá
    bad = re.compile(r'google-analytics|googletagmanager|googlesyndication|54\.183\.184\.126|hextris\.io|facebook\.com|twitter\.com|itunes\.apple|play\.google')
    for f in list(d.rglob('*.js')) + list(d.rglob('*.html')):
        if 'vendor' in f.parts:
            continue
        for n, line in enumerate(read(f).split('\n'), 1):
            if bad.search(line):
                fail(f'{f.relative_to(ROOT)}:{n} còn tham chiếu ngoài: {line.strip()[:120]}')


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    for name in ('HexGL', 'tower_game', 'hextris'):
        if not (src / name).is_dir():
            fail(f'thiếu thư mục {src / name}')
    OUT.mkdir(parents=True, exist_ok=True)
    import_hexgl(src / 'HexGL')
    import_tower(src / 'tower_game')
    import_hextris(src / 'hextris')
    print('Đã nhập 3 game vào', OUT)


if __name__ == '__main__':
    main()
