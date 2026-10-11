"""Optional signal estimates, not musical transcription. Requires NumPy, SciPy and FFmpeg."""
import json, subprocess, sys
import numpy as np
from scipy import signal

file = sys.argv[1] if len(sys.argv) > 1 else 'public/music.mp3'
sr, hop, size = 22050, 256, 2048
decoded = subprocess.run(['ffmpeg', '-v', 'error', '-i', file, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(decoded, dtype='<f4')
_, t, z = signal.stft(x, sr, nperseg=size, noverlap=size-hop)
mag = np.abs(z)
freq = np.fft.rfftfreq(size, 1/sr)
power = np.sum(mag**2, axis=1)
centroid = np.sum(freq * power) / np.sum(power)
bands = {f'{low}-{high}Hz': round(float(np.sum(power[(freq>=low)&(freq<high)]) / np.sum(power) * 100), 2) for low, high in [(0,200),(200,2000),(2000,8000),(8000,11025)]}
flux = np.maximum(np.diff(np.log1p(mag*100), axis=1), 0).mean(axis=0)
def tempo(start, end):
    env = flux[(t[1:] >= start) & (t[1:] < end)]
    env = np.maximum(env - np.mean(env), 0)
    ac = signal.fftconvolve(env, env[::-1], mode='full')[len(env)-1:]
    ac /= max(ac[0], 1e-12)
    peaks, _ = signal.find_peaks(ac)
    peaks = [int(p) for p in peaks if 60 <= 60*sr/(hop*p) <= 110]
    peaks = sorted(peaks, key=lambda p: ac[p], reverse=True)[:4]
    return [{'bpm': round(60*sr/(hop*p), 1), 'onset_autocorrelation': round(float(ac[p]), 3)} for p in peaks]
rms = np.sqrt(np.mean(x**2))
result = {'method': 'Mono 22050Hz PCM, STFT 2048/hop256, positive log-magnitude spectral flux; autocorrelation candidates limited to 60-110 BPM. Candidate estimates only; no listening/beat/key/chord/instrument recognition.', 'decoded_seconds': round(len(x)/sr, 3), 'mono_rms_dbfs': round(float(20*np.log10(rms)), 2), 'mono_sample_peak_dbfs': round(float(20*np.log10(np.max(np.abs(x)))) ,2), 'energy_weighted_centroid_hz': round(float(centroid), 1), 'energy_bands_percent': bands, 'tempo_candidates': {f'{a}-{b}s': tempo(a,b) for a,b in [(0,len(x)/sr),(15,45),(45,75),(75,105)]}}
print(json.dumps(result, indent=2))
