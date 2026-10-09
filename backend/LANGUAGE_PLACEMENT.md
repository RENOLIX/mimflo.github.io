# Indicative French placement

The reading pronunciation index does not produce a learner CEFR level. The separate placement combines 24 vocabulary, grammar and comprehension questions with a spontaneous spoken response of up to ten minutes.

`GET /placement` returns the public questions, prompt and the user's latest result. Authenticated users with an active trial or paid access can start a test, save answers, then submit consented 16 kHz PCM WAV audio to `/placement/audio`. The existing Workers AI binding transcribes speech and evaluates the transcript. Evidence quotations must occur in that transcript. Missing or unusable evidence produces an error rather than a level.

The displayed estimate is the lower of the consecutive quiz level and transcript assessment level. Unconfirmed A1 basics or insufficient oral evidence produce no combined level. These are authored, uncalibrated placement tasks: the estimate is not a certified CEFR result and does not measure accent, phonetic accuracy or acoustic fluency. An independent calibration study and expert evaluation are required before making stronger claims.

Apply `migrations/0010_language_placement.sql` before deploying this feature. Results and transcripts are kept in D1; audio is kept in the user's browser. A successful trial includes one placement. Inference reservations limit all placement tests together to 60 minutes and 10 attempts per UTC day, and each user to two attempts. Failed attempts retain their budget reservation; successful retries return the stored result without further inference. These limits do not guarantee availability of the provider's shared free quota.

Validation:

```sh
node scripts/verify-language-placement.mjs
node scripts/verify-complete-reader.mjs
npx tsc --noEmit
```

The placement test uses a temporary SQLite database and mocked inference to verify ownership, consent, six-level grading, quote validation, persistence, retries and quota enforcement. It does not establish CEFR accuracy. Cloudflare inference was additionally checked with invented text and synthetic audio before release.
