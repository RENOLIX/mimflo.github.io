// Estimated aloud reading time at a comfortable learning pace.
export function readingDuration(text:string){
 const words=(text.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)||[]).length;
 return {words,minutes:words?Math.ceil(words/120):0};
}

export const MAX_READING_SECONDS=600;
export const DAILY_AUDIO_SECONDS=6000;
// 50% extra time and one minute for pauses, rounded up to a minute.
export function readingTimeLimit(text:string){return Math.min(MAX_READING_SECONDS,Math.max(180,Math.ceil((readingDuration(text).words/120*1.5+1))*60));}
