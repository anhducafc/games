"""Ghép public/games/dua-vit/index.html từ mẫu + mã game + hình thú cổ vũ.
Dùng: python3 tools/glue/build-vit-dua.py  (hình thú lấy từ tools/glue/vit-dua.animals.html)"""
import pathlib
d = pathlib.Path(__file__).parent
t = (d / 'vit-dua.template.html').read_text(encoding='utf8')
t = t.replace('<!--ANIMALS-->', (d / 'vit-dua.animals.html').read_text(encoding='utf8'))
t = t.replace('/*GAME*/', (d / 'vit-dua.game.js').read_text(encoding='utf8'))
out = d.parent.parent / 'public/games/dua-vit/index.html'
out.write_text(t, encoding='utf8'); print('ghi', out, len(t), 'byte')
