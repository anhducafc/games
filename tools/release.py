"""Build rồi đóng gói thư mục dist thành release/gio-ra-choi-site.zip (nội dung nằm ở gốc zip),
sẵn sàng kéo-thả lên Cloudflare Pages, Netlify hoặc giải nén lên hosting bất kỳ."""
import pathlib, subprocess, sys, zipfile, hashlib
root = pathlib.Path(__file__).resolve().parent.parent
subprocess.run(['npm', 'run', 'build'], cwd=root, check=True, shell=(sys.platform == 'win32'))
dist = root / 'dist'
files = sorted(p for p in dist.rglob('*') if p.is_file())
too_big = [p for p in files if p.stat().st_size > 25 * 1024 * 1024]
assert not too_big, 'File vượt 25MB (giới hạn Cloudflare Pages): %s' % too_big
out = root / 'release'; out.mkdir(exist_ok=True)
zp = out / 'gio-ra-choi-site.zip'
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in files:
        z.write(p, p.relative_to(dist).as_posix())
print('Đã tạo %s: %d file, %.1f MB, sha256 %s' % (zp, len(files), zp.stat().st_size / 1048576, hashlib.sha256(zp.read_bytes()).hexdigest()[:16]))
