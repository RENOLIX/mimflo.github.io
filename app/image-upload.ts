import {memberRequest} from './member-api';
export async function uploadImage(file:File){
 if(!file.type.startsWith('image/'))throw new Error('Choisissez une image depuis votre appareil.');
 if(file.size>25*1024*1024)throw new Error('Cette image dépasse 25 Mo. Choisissez une image plus petite.');
 const source=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=source;await image.decode();
  const ratio=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
  canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);
  const data=canvas.toDataURL('image/webp',.85);
  return await memberRequest('/admin/media',{data,name:file.name});
 }catch(e:any){throw new Error(e.message||'Cette image ne peut pas être ouverte. Essayez un fichier JPEG, PNG ou WebP.');}finally{URL.revokeObjectURL(source);}
}
