# Local runtime correction

`piper_phonemize.mjs`: `callMain` preserves its stack pointer before allocating UTF-8 arguments and its `argv` table, then restores it in `finally`. The bundled WASM exposes its downward stack allocator but does not export `malloc` or a separate stack restore function, so the inverse aligned allocation restores the saved pointer. The original generated wrapper did not restore the stack between calls; repeated sentence and word batches eventually exhausted it. Arguments are copied before prepending the program name, so caller arrays are not mutated.

The phonemizer WASM, data files and French language rules are unchanged. Regression coverage runs the real French phonemizer over a 1,200-word text and repeats a second conversion in the same runtime.
