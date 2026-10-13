// Retry the exact same PCM window once on CPU when the GPU fails at runtime.
// The caller serializes windows, so later work uses the recovered engine too.
export function isMobileDevice(navigator = {}) {
  return navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')
    || (/Mac/i.test(navigator.platform || '') && navigator.maxTouchPoints > 1);
}

export async function resilientInference(engine, samples, run) {
  try { return await run(engine, samples); }
  catch (error) {
    if (engine.device !== 'webgpu') throw error;
    await engine.useWasm();
    return run(engine, samples);
  }
}
