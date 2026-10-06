// Estimated aloud reading time at a comfortable learning pace.
export function readingDuration(text:string){
 const words=(text.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)||[]).length;
 return {words,minutes:words?Math.ceil(words/120):0};
}
