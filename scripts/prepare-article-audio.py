"""Prepare existing Piper audio once, retaining its measured word timings.

Requires onnxruntime, piper-tts and imageio-ffmpeg. No student audio is processed.
Stages: node prepare-article-audio.mjs plan; this file phonemize;
node prepare-article-audio.mjs align; this file render.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import wave

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
JOBS = ROOT / '.qa/article-audio-jobs.json'
config = json.loads((ROOT / 'public/speech/fr-siwis.json').read_text('utf-8'))
jobs = json.loads(JOBS.read_text('utf-8'))

if sys.argv[1] == 'phonemize':
    from piper.phonemize_espeak import EspeakPhonemizer
    phonemizer = EspeakPhonemizer()
    for article in jobs:
        for segment in article['segments']:
            segment['phonemes'] = [sum(phonemizer.phonemize('fr', text), []) for text in [segment['text'], *segment['words']]]
    JOBS.write_text(json.dumps(jobs, ensure_ascii=False), 'utf-8')
    print('French phonemes prepared.', flush=True)
elif sys.argv[1] == 'render':
    import onnxruntime as ort
    import imageio_ffmpeg
    manifest = json.loads((ROOT / 'public/speech/model.json').read_text('utf-8'))
    model = b''.join((ROOT / 'public/speech' / part).read_bytes() for part in manifest['parts'])
    assert hashlib.sha256(model).hexdigest() == manifest['sha256']
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(model, sess_options=options, providers=['CPUExecutionProvider'])
    del model
    rate = config['audio']['sample_rate']
    target = ROOT / 'public/speech/ready'
    target.mkdir(parents=True, exist_ok=True)
    prepared = {}
    began = time.monotonic()
    selection = [int(sys.argv[2])] if len(sys.argv) > 2 else list(range(len(jobs)))
    for index in selection:
        article = jobs[index]
        key = article['hash']
        metadata = target / f'{key}.json'
        audio = target / f'{key}.mp3'
        if not metadata.exists() or not audio.exists():
            chunks, timings, samples = [], [], 0
            for segment in article['segments']:
                inp = segment['input']
                ids = np.asarray([inp['ids']], dtype=np.int64)
                result = dict(zip([out.name for out in session.get_outputs()], session.run(None, {
                    'input': ids, 'input_lengths': np.asarray([ids.shape[1]], dtype=np.int64),
                    'scales': np.asarray([config['inference']['noise_scale'], config['inference']['length_scale'] * 1.22, config['inference']['noise_w'] * .85], dtype=np.float32)
                })))
                pcm = result['output'].reshape(-1)
                frames = result['/Ceil_output_0'].reshape(-1)
                assert len(frames) == len(inp['ids'])
                offsets = np.concatenate(([0], np.cumsum(np.rint(frames).astype(np.int64) * 256)))
                assert abs(int(offsets[-1]) - len(pcm)) <= 256
                words = [dict(index=segment['first'] + i, text=word, start=None, end=None) for i, word in enumerate(segment['words'])]
                for span in inp['ranges']:
                    if span['wordIndex'] is None:
                        continue
                    word = words[span['wordIndex']]
                    if word['start'] is None:
                        word['start'] = (samples + int(offsets[span['start']])) / rate
                    word['end'] = (samples + int(offsets[span['end']])) / rate
                for i, word in enumerate(words):
                    assert word['start'] is not None
                    word['end'] = words[i + 1]['start'] if i + 1 < len(words) else (samples + len(pcm)) / rate
                timings.extend(words)
                pause = np.zeros(round(.3 * rate), dtype=np.float32)
                chunks.extend([np.clip(pcm, -1, 1), pause])
                samples += len(pcm) + len(pause)
            wav = ROOT / f'.qa/article-voice-{key}.wav'
            with wave.open(str(wav), 'wb') as out:
                out.setnchannels(1)
                out.setsampwidth(2)
                out.setframerate(rate)
                for chunk in chunks:
                    out.writeframes((chunk * 32767).astype('<i2').tobytes())
            subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav), '-c:a', 'libmp3lame', '-b:a', '64k', str(audio)], check=True)
            metadata.write_text(json.dumps({'src':f'/speech/ready/{key}.mp3', 'duration':samples / rate, 'timings':timings}, ensure_ascii=False, separators=(',', ':')), 'utf-8')
        prepared[key] = f'/speech/ready/{key}.json'
        print(f'{index + 1}/{len(jobs)}: {article["title"]} ({time.monotonic()-began:.1f}s)', flush=True)
    if len(selection) == len(jobs):
        (ROOT / 'app/prepared-voice-manifest.json').write_text(json.dumps(prepared, separators=(',', ':')), 'utf-8')
    print('Selected article readings are ready.', flush=True)
else:
    raise ValueError('Use phonemize or render')
