"""아쟁 뜯는 소리(pizz.) 녹음 묶음 만들기 — 켠 아쟁 녹음의 음색을 입힌 뜯는 줄 합성 (2026-11-23, 사용자가 고른 1번 방식)

아쟁을 손가락으로 뜯은 단음 녹음을 구하기 어려워, 켠 소리 녹음(banks/ajaeng)에서 음마다 배음 크기(울림통 모양)만 뽑고
그 크기로 뜯는 줄 소리를 합성한다. 높은 배음일수록 빨리 사라지고, 손가락이 줄을 놓는 '툭' 소리를 앞에 조금 넣는다.

사용:
  python3 tools/make_ajaeng_pizz.py [banks/ajaeng] [banks/ajaeng_pizz]
결과: banks/ajaeng_pizz.mp3 (32kHz 모노 56k), banks/ajaeng_pizz.json ([['p', midi, 시작초, 길이초], ...])
준비물: numpy, scipy, ffmpeg
"""
import json, os, subprocess, sys, tempfile
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
OUT_SR = 32000
src = sys.argv[1] if len(sys.argv) > 1 else 'banks/ajaeng'
dst = sys.argv[2] if len(sys.argv) > 2 else 'banks/ajaeng_pizz'
NOTES = list(range(40, 73, 2))   # E2 ~ C5, 2반음마다 (사이 음은 앱이 읽는 속도로 맞춘다)
NOTE_LEN, GAP, LEAD = 1.6, 0.4, 0.12

def mtof(m): return 440 * 2 ** ((m - 69) / 12)

with tempfile.TemporaryDirectory() as td:
    w = os.path.join(td, 'a.wav')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src + '.mp3', '-ac', '1', '-ar', str(SR), w], check=True)
    _, x = wavfile.read(w)
x = x.astype(np.float64); x /= np.abs(x).max() + 1e-9
meta = json.load(open(src + '.json'))

def seg(st, ln):
    s = x[int(st * SR): int((st + ln) * SR)]
    e = np.abs(s); on = int(np.argmax(e > 0.1 * e.max()))
    return s[on:]

def profile(m):
    """가장 가까운 켠 소리 녹음(기본음, 높은 음은 농현 녹음까지)에서 배음 주파수별 크기"""
    cand = [n for n in meta if n[0] == 'p'] if m <= 64 else meta
    n = min(cand, key=lambda n: abs(n[1] - m))
    s = seg(n[2], n[3])
    mid = s[int(0.6 * SR): int(1.8 * SR)]
    mid = mid * np.hanning(len(mid))
    N = 1 << 17
    F = np.abs(np.fft.rfft(mid, N)); fr = np.fft.rfftfreq(N, 1 / SR)
    f0 = mtof(n[1]); hs, amps = [], []
    for k in range(1, 60):
        fk = k * f0
        if fk > 9000: break
        win = (fr > fk * 0.97) & (fr < fk * 1.03)
        if not win.any(): break
        hs.append(fk); amps.append(F[win].max())
    amps = np.array(amps); amps /= amps.max()
    return np.array(hs), amps

def pizz(m):
    f0 = mtof(m); hf, ha = profile(m)
    L = int(NOTE_LEN * SR); t = np.arange(L) / SR
    y = np.zeros(L); rng = np.random.default_rng(int(m))
    B = 0.00012   # 굵은 명주실 줄의 약한 비조화
    for k in range(1, 50):
        fk = k * f0 * np.sqrt(1 + B * k * k)
        if fk > 10000: break
        body = np.interp(fk, hf, ha, left=ha[0], right=ha[-1] * 0.3)
        pick = abs(np.sin(np.pi * k * 0.18)) / k ** 0.6   # 뜯는 자리(줄 끝에서 18%)
        tau = 0.9 / (1 + 0.035 * k * k ** 0.5) * (110 / f0) ** 0.25   # 높은 배음부터 빨리 사라짐
        y += body * pick * np.exp(-t / tau) * np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.28))
    nz_n = int(0.025 * SR)
    nz = rng.standard_normal(nz_n) * np.exp(-np.arange(nz_n) / (0.004 * SR))
    nz = sosfilt(butter(2, [150, 2500], 'band', fs=SR, output='sos'), nz)
    y[:nz_n] += nz * 0.25 * np.abs(y).max() / (np.abs(nz).max() + 1e-9)
    y *= np.minimum(1, t / 0.002)
    fo = int(0.15 * SR); y[-fo:] *= np.linspace(1, 0, fo)   # 끝을 부드럽게
    return y / (np.abs(y).max() + 1e-9)

out = np.zeros(int((LEAD + len(NOTES) * (NOTE_LEN + GAP)) * SR))
rows = []
for i, m in enumerate(NOTES):
    st = LEAD + i * (NOTE_LEN + GAP)
    y = pizz(m) * 0.89
    a = int(st * SR); out[a:a + len(y)] += y
    rows.append(['p', float(m), round(st, 3), NOTE_LEN])
    print(f'  {m} ({mtof(m):.1f}Hz) {st:.2f}s')

with tempfile.TemporaryDirectory() as td:
    w = os.path.join(td, 'o.wav')
    wavfile.write(w, SR, (out * 32767).astype(np.int16))
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', w, '-ac', '1', '-ar', str(OUT_SR), '-b:a', '56k', dst + '.mp3'], check=True)
json.dump(rows, open(dst + '.json', 'w'))
print('ok', dst + '.mp3', len(NOTES), '음')
