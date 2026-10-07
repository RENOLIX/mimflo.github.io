# MimFlo French pronunciation service

This service is the OpenPronounce-style backend for French assessment. It is intentionally fail-closed: when the French acoustic/phoneme model is not loaded, it returns 503 instead of inventing a score.

## Contract

`POST /assess` JSON:

```json
{"audio":"<base64 wav>","reference":"Je lis un texte en français.","language":"fr-FR"}
```

The response must contain `assessment.score`, `assessment.pronunciationScore`, `assessment.fluencyScore`, `assessment.accentScore`, and per-word/per-phoneme details. The MimFlo Worker already accepts this contract through `PHONEME_API_URL`.

The production model must be a French phoneme-capable Wav2Vec2/XLS-R checkpoint plus a French grapheme-to-phoneme lexicon. Whisper-only word matching is not accepted as a phoneme score.
