export const ARTICLE_INTERVAL = 24 * 60 * 60 * 1000;
export const PAID_PACKS = ['sprint','intensif','performance'];

export async function paidLibraryState(db:D1Database,userId:string,entitlements:Record<string,any>[],at:number){
 if(!entitlements.length)return null;
 const choice=await db.prepare('SELECT * FROM paid_article_access WHERE user_id=?').bind(userId).first<Record<string,any>>();
 return {serverNow:at,startsAt:Math.min(...entitlements.map(e=>e.starts_at)),endsAt:Math.max(...entitlements.map(e=>e.ends_at)),currentArticleId:choice?.article_id||null,nextArticleAt:choice?.next_at||at,canChoose:!choice||choice.next_at<=at};
}

// A single conditional write is the daily gate, shared by all packs and devices.
export async function choosePaidArticle(db:D1Database,userId:string,articleId:string,at:number){
 const selected=await db.prepare(`INSERT INTO paid_article_access(user_id,article_id,selected_at,next_at)
 SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM entitlements WHERE user_id=? AND revoked=0 AND starts_at<=? AND ends_at>?)
 ON CONFLICT(user_id) DO UPDATE SET article_id=excluded.article_id,selected_at=excluded.selected_at,next_at=excluded.next_at
 WHERE paid_article_access.next_at<=excluded.selected_at AND paid_article_access.article_id<>excluded.article_id`).bind(userId,articleId,at,at+ARTICLE_INTERVAL,userId,at,at).run();
 const current=await db.prepare('SELECT * FROM paid_article_access WHERE user_id=?').bind(userId).first<Record<string,any>>();
 if(selected.meta.changes)await db.prepare('INSERT INTO paid_article_history(id,user_id,article_id,selected_at,next_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),userId,articleId,at,at+ARTICLE_INTERVAL).run();
 return {allowed:current?.article_id===articleId,current};
}
