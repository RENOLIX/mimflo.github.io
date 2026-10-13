export function phoneSimilarity(expected:string,heard:string):number;
export function phonePracticeScore(phone:{expected:string;heard?:string;status:string;confidence?:number|null}):number;
export function pronunciationPracticeScore(phones:{expected:string;heard?:string;status:string;confidence?:number|null}[]):number;
