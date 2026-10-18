#!/usr/bin/env python3
"""
Tổng hợp 4 âm hiệu ứng cho game Xây tháp (thay âm gốc không rõ nguồn).
Âm do chương trình này tạo ra, thuộc Giờ Ra Chơi, không dùng mẫu âm của ai.
Cần: numpy, ffmpeg.   Chạy sau tools/import-games.py.
"""
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

SR = 44100
OUT = Path(__file__).resolve().parent.parent / 'public' / 'games' / 'xay-thap' / 'assets'


def t(dur):
    return np.linspace(0, dur, int(SR * dur), endpoint=False)


def env(x, attack=0.004, decay=6.0):
    n = len(x)
    e = np.exp(-decay * np.linspace(0, 1, n))
    a = max(1, int(SR * attack))
    e[:a] *= np.linspace(0, 1, a)
    return e


def sweep(f0, f1, dur, shape='sine'):
    x = t(dur)
    f = f0 + (f1 - f0) * (x / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    if shape == 'tri':
        return 2 / np.pi * np.arcsin(np.sin(ph))
    return np.sin(ph)


def note(freq, dur, decay=5.0, shape='sine'):
    return sweep(freq, freq, dur, shape) * env(t(dur), decay=decay)


def mix(parts, total):
    out = np.zeros(int(SR * total))
    for start, sig in parts:
        i = int(SR * start)
        out[i:i + len(sig)] += sig[:len(out) - i]
    return out


def drop():
    thump = sweep(220, 60, 0.16) * env(t(0.16), decay=7)
    rng = np.random.default_rng(1)
    click = rng.standard_normal(int(SR * 0.012)) * np.linspace(1, 0, int(SR * 0.012)) * 0.25
    return mix([(0, thump), (0, click)], 0.18)


def drop_perfect():
    a = note(784, 0.35, 5) + 0.35 * note(1568, 0.35, 8)
    b = note(1175, 0.4, 5) + 0.35 * note(2350, 0.4, 8)
    return mix([(0, a), (0.09, b)], 0.5)


def game_over():
    notes = [(0.0, 440), (0.17, 370), (0.34, 294)]
    parts = [(s, note(f, 0.22, 4, 'tri')) for s, f in notes]
    parts.append((0.52, sweep(220, 130, 0.5, 'tri') * env(t(0.5), decay=4)))
    return mix(parts, 1.05)


def rotate():
    return sweep(520, 980, 0.08) * env(t(0.08), decay=6)


def save_mp3(name, sig):
    sig = sig / max(1e-9, np.max(np.abs(sig))) * 0.55
    pcm = (sig * 32767).astype('<i2')
    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / 'x.wav'
        with wave.open(str(wav), 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        dst = OUT / f'{name}.mp3'
        r = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-b:a', '64k', str(dst)])
        if r.returncode:
            sys.exit('ffmpeg lỗi')
        print('đã tạo', dst.relative_to(OUT.parent.parent.parent.parent), dst.stat().st_size, 'byte')


if __name__ == '__main__':
    if not OUT.is_dir():
        sys.exit(f'chưa có {OUT}; chạy tools/import-games.py trước')
    save_mp3('drop', drop())
    save_mp3('drop-perfect', drop_perfect())
    save_mp3('game-over', game_over())
    save_mp3('rotate', rotate())
