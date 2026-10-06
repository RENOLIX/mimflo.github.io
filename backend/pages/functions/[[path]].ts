import members from '../../index';
export const onRequest=(context:any)=>members.fetch(context.request,context.env);
