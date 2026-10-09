// Familiar spelling and example words replace IPA in all client feedback.
const sounds:Record<string,[string,string]>={
 a:['a','papa'],ɑ:['a','pâte'],e:['é','été'],ɛ:['è','mère'],ə:['e','le'],i:['i','ici'],o:['o','vélo'],ɔ:['o ouvert','porte'],u:['ou','roue'],y:['u','lune'],ø:['eu','deux'],œ:['eu ouvert','neuf'],
 'ɑ̃':['an','enfant'],'ɛ̃':['in','matin'],'ɔ̃':['on','maison'],'œ̃':['un','brun'],
 p:['p','papa'],b:['b','bébé'],t:['t','tasse'],d:['d','dos'],k:['k','café'],ɡ:['g','gare'],g:['g','gare'],f:['f','fête'],v:['v','vélo'],s:['s','soleil'],z:['z','zéro'],ʃ:['ch','chat'],ʒ:['j','jour'],m:['m','maman'],n:['n','nez'],ɲ:['gn','montagne'],ŋ:['ng','parking'],ʁ:['r','rue'],r:['r','rue'],l:['l','lune'],j:['y','yaourt'],w:['ou','oui'],ɥ:['u suivi d’une voyelle','huit'],h:['h aspiré','hello'],
};
export function soundDescription(phone:string){
 const description=sounds[phone?.normalize('NFC')];
 return description?`le son « ${description[0]} », comme dans « ${description[1]} »`:'un son de ce mot';
}
export function plainSoundAdvice(text:string){return text.replaceAll('le modèle a détecté','le son repéré est').replace(/\/([^/\s]{1,12})\//gu,(_match,phone)=>soundDescription(phone)).replaceAll('le son le son','le son');}
