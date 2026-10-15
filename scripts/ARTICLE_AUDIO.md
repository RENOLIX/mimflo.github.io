MimFlo serves prepared MP3 article readings with their measured word timings.
The existing local synthesizer remains the fallback for text without a prepared recording.

`scripts/article-voice-catalogue.json` contains only published article text, exported
from D1 on 2026-10-15. It contains no client accounts or recordings. Refresh this
snapshot when the published articles change before preparing their audio again.

Run the **Prepare French article audio** GitHub workflow to prepare each article
on GitHub's Linux runners. Its final job commits the audio and word timings.
After it succeeds, dispatch the existing `pages.yml` workflow to publish them.
Commits made using GitHub's workflow token do not trigger another push workflow.

For local preparation, install `piper-tts==1.8.0`, `onnxruntime` and
`imageio-ffmpeg==0.6.0`, then run:

```
node scripts/prepare-article-audio.mjs plan
python scripts/prepare-article-audio.py phonemize
node scripts/prepare-article-audio.mjs align
python scripts/prepare-article-audio.py render
```

`render <index>` prepares one article without replacing the shared manifest.
`node scripts/prepare-article-audio.mjs manifest` rebuilds the manifest from the
finished files. Keep the existing Piper model attribution with the generated audio.

The reader requests the small timing file and starts buffering the MP3 when an
article opens. Playback streams the audio directly; it does not load the voice
model or run synthesis for a prepared article. Pausing retains audio.currentTime,
and word highlights use the same audio clock at all playback speeds.
