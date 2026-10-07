# MimFlo French pronunciation service

## Selected engine

Primary engine: **French Wav2Vec2 XLS-R + GOP (Goodness of Pronunciation)**.
HuBERT/WavLM is retained as a benchmark fallback only when a French phoneme CTC checkpoint is available.

The production pipeline is:

1. French grapheme-to-phoneme conversion for the reference passage.
2. Frame-level phoneme posteriors from the French XLS-R checkpoint.
3. CTC/Viterbi forced alignment between the recording and reference phonemes.
4. GOP per phoneme: the correct-phone log posterior against the strongest competing phone.
5. Calibrated aggregation for pronunciation and accent, with independent fluency features (speech rate, pauses, duration and energy).

A generic French ASR checkpoint is not accepted as a phoneme scorer. The API stays fail-closed until a validated French phoneme checkpoint and calibration data are installed.

## Contract

`POST /assess` JSON:

```json
{"audio":"<base64 wav>","reference":"Je lis un texte en français.","language":"fr-FR"}
```

The response must contain `assessment.score`, `assessment.pronunciationScore`, `assessment.fluencyScore`, `assessment.accentScore`, and per-word/per-phoneme details. The MimFlo Worker accepts this contract through `PHONEME_API_URL`.
