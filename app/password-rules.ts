export const passwordRules = [
 {label:'12 à 128 caractères',test:(value:string)=>value.length>=12&&value.length<=128},
 {label:'Une majuscule',test:(value:string)=>/\p{Lu}/u.test(value)},
 {label:'Une minuscule',test:(value:string)=>/\p{Ll}/u.test(value)},
 {label:'Un chiffre',test:(value:string)=>/[0-9]/.test(value)},
 {label:'Un caractère spécial',test:(value:string)=>/[^\p{L}\p{N}\s]/u.test(value)},
];
export const validPassword=(value:unknown):value is string=>typeof value==='string'&&passwordRules.every(rule=>rule.test(value));
export const passwordRequirements='Utilisez 12 à 128 caractères avec une majuscule, une minuscule, un chiffre et un caractère spécial.';
