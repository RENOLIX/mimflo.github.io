export function dailyReadingScores(sessions:any[],now=new Date()){
 const days=Array.from({length:7},(_,index)=>{const date=new Date(now);date.setHours(0,0,0,0);date.setDate(date.getDate()-6+index);return {date,total:0,count:0,score:null as number|null}});
 const key=(date:Date)=>`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
 const byDate=new Map(days.map(day=>[key(day.date),day]));
 for(const session of sessions){let analysis;try{analysis=typeof session.analysis==='string'?JSON.parse(session.analysis):session.analysis}catch{continue}
  if(analysis?.kind!=='phonetic-experimental'||typeof analysis.score!=='number'||!Number.isFinite(analysis.score)||analysis.score<0||analysis.score>100)continue;
  const day=byDate.get(key(new Date(session.created_at)));if(!day)continue;day.total+=analysis.score;day.count++;
 }
 for(const day of days)day.score=day.count?Math.round(day.total/day.count):null;
 return days;
}
