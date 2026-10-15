// The previous slow pace is now the default; playback preserves the voice's pitch.
export const LISTENING_SPEEDS={slow:.65,normal:.82} as const;
export const validListeningSpeed=(value:number)=>Object.values(LISTENING_SPEEDS).some(speed=>speed===value);
