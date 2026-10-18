"""Sinh public/fonts/fonts-inline.css: giống fonts.css nhưng font nhúng dạng data: URI.
Cần cho game chạy trong iframe sandbox chặt (origin "null"): font tải bằng CORS nên bị chặn
nếu máy chủ không gửi Access-Control-Allow-Origin. data: URI thì luôn dùng được."""
import base64, re, pathlib
d = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'fonts'
css = (d / 'fonts.css').read_text()
def inline(m):
    data = (d / m.group(1)).read_bytes()
    return "url('data:font/woff2;base64,%s')" % base64.b64encode(data).decode()
out, n = re.subn(r"url\('\./([^']+\.woff2)'\)", inline, css)
assert n == 8, n
(d / 'fonts-inline.css').write_text('/* Sinh bởi tools/make-inline-fonts.py. Đừng sửa tay. */\n' + out)
print('ok', n, 'font,', round(len(out) / 1024), 'KB')
