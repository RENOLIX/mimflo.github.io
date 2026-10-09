export const CEFR_LEVELS=['A1','A2','B1','B2','C1','C2'] as const;
type Level=typeof CEFR_LEVELS[number];
type Question={id:string;level:Level;skill:'Grammaire'|'Vocabulaire'|'Compréhension';text:string;choices:string[];answer:number};
export const placementQuestions:Question[]=[
 {id:'a1-1',level:'A1',skill:'Grammaire',text:'Je ___ étudiant.',choices:['suis','est','sommes','êtes'],answer:0},
 {id:'a1-2',level:'A1',skill:'Vocabulaire',text:'Quel mot désigne un jour de la semaine ?',choices:['Janvier','Matin','Lundi','Été'],answer:2},
 {id:'a1-3',level:'A1',skill:'Compréhension',text:'« Le magasin ouvre à neuf heures. » À huit heures, le magasin est…',choices:['ouvert','fermé','plein','gratuit'],answer:1},
 {id:'a1-4',level:'A1',skill:'Grammaire',text:'Nous habitons ___ France.',choices:['à','au','aux','en'],answer:3},
 {id:'a2-1',level:'A2',skill:'Grammaire',text:'Complétez au passé composé : « Hier, elle ___ au marché. »',choices:['va','est allée','allait aller','irait'],answer:1},
 {id:'a2-2',level:'A2',skill:'Vocabulaire',text:'Je voudrais ___ rendez-vous chez le médecin.',choices:['prendre','faire','mettre','porter'],answer:0},
 {id:'a2-3',level:'A2',skill:'Compréhension',text:'« Le train de 14 h est annulé. Votre billet reste valable pour le suivant. » Que pouvez-vous faire ?',choices:['Jeter le billet','Prendre uniquement un bus','Prendre le prochain train avec ce billet','Exiger de partir à 14 h'],answer:2},
 {id:'a2-4',level:'A2',skill:'Grammaire',text:'Tu connais Marie ? Oui, je ___ connais.',choices:['lui','y','en','la'],answer:3},
 {id:'b1-1',level:'B1',skill:'Grammaire',text:'Si j’avais plus de temps, je ___ davantage.',choices:['lirai','lis','lirais','ai lu'],answer:2},
 {id:'b1-2',level:'B1',skill:'Vocabulaire',text:'Une personne « digne de confiance » est une personne…',choices:['impatiente','fiable','méfiante','discrète uniquement'],answer:1},
 {id:'b1-3',level:'B1',skill:'Compréhension',text:'« Malgré le coût, la mairie maintient le projet, car ses bénéfices devraient durer. » Pourquoi le projet est-il maintenu ?',choices:['Pour économiser immédiatement','Parce qu’il ne coûte rien','Pour ses avantages à long terme','Parce que les travaux sont terminés'],answer:2},
 {id:'b1-4',level:'B1',skill:'Grammaire',text:'C’est le livre ___ je t’ai parlé.',choices:['que','où','dont','lequel'],answer:2},
 {id:'b2-1',level:'B2',skill:'Grammaire',text:'Bien qu’il ___ fatigué, il poursuit son travail.',choices:['est','soit','sera','serait'],answer:1},
 {id:'b2-2',level:'B2',skill:'Vocabulaire',text:'« Nuancer une affirmation » signifie…',choices:['La répéter plus fort','La supprimer','En préciser les limites et les distinctions','L’affirmer sans réserve'],answer:2},
 {id:'b2-3',level:'B2',skill:'Compréhension',text:'« Cette mesure favoriserait l’emploi ; encore faudrait-il que les entreprises disposent des moyens de l’appliquer. » L’auteur…',choices:['présente un avantage soumis à une condition','rejette toute possibilité de réussite','affirme que la mesure a déjà réussi','ne s’intéresse qu’aux salariés'],answer:0},
 {id:'b2-4',level:'B2',skill:'Grammaire',text:'Il aurait réussi l’examen s’il ___ davantage.',choices:['travaillerait','aura travaillé','travaillait demain','avait travaillé'],answer:3},
 {id:'c1-1',level:'C1',skill:'Grammaire',text:'À supposer que cette hypothèse ___ exacte, il faudrait revoir nos conclusions.',choices:['s’avère','s’avérera','s’est avérée','s’avérerait'],answer:0},
 {id:'c1-2',level:'C1',skill:'Vocabulaire',text:'« Une amélioration en trompe-l’œil » est…',choices:['une amélioration durable','une amélioration seulement apparente','une amélioration sans risque','une amélioration immédiatement mesurable'],answer:1},
 {id:'c1-3',level:'C1',skill:'Compréhension',text:'« On vante la transparence de ce dispositif ; son fonctionnement demeure pourtant réservé à quelques initiés. » L’auteur souligne…',choices:['une parfaite cohérence','une contradiction entre le discours et la réalité','une erreur de calendrier','le caractère public de toutes les données'],answer:1},
 {id:'c1-4',level:'C1',skill:'Grammaire',text:'Les difficultés auxquelles nous nous sommes ___ étaient prévisibles.',choices:['heurté','heurtées seulement si difficultés est féminin','heurtés','heurter'],answer:2},
 {id:'c2-1',level:'C2',skill:'Grammaire',text:'Quelle phrase est correcte ?',choices:['Les efforts qu’il a fallu fournir ont été importants.','Les efforts qu’il a fallus fournir ont été importants.','Les efforts qu’ils ont fallus fournir ont été importants.','Les efforts qu’il est fallu fournir ont été importants.'],answer:0},
 {id:'c2-2',level:'C2',skill:'Vocabulaire',text:'Dans un texte argumentatif, une « pétition de principe » consiste à…',choices:['demander une signature','supposer vraie la conclusion que l’on prétend démontrer','refuser toute définition','s’appuyer uniquement sur une statistique'],answer:1},
 {id:'c2-3',level:'C2',skill:'Compréhension',text:'« Quelle admirable simplicité : il suffit, pour résoudre le problème, d’en ignorer la moitié. » Le ton est…',choices:['sincèrement admiratif','neutre et descriptif','ironique, pour dénoncer une simplification abusive','hésitant, faute d’opinion'],answer:2},
 {id:'c2-4',level:'C2',skill:'Compréhension',text:'« Il n’est pas jusqu’à ses adversaires qui ne reconnaissent son talent. » Cela signifie…',choices:['Personne ne reconnaît son talent','Seuls ses amis le reconnaissent','Ses adversaires sont sans talent','Même ses adversaires reconnaissent son talent'],answer:3},
];
export const publicPlacementQuestions=()=>placementQuestions.map(({answer,...question})=>question);
export function gradePlacement(answers:Record<string,number>){
 if(!answers||typeof answers!=='object'||Array.isArray(answers)||Object.keys(answers).length!==placementQuestions.length||placementQuestions.some(q=>!Number.isInteger(answers[q.id])||answers[q.id]<0||answers[q.id]>=q.choices.length))throw new Error('Répondez aux 24 questions avant de continuer.');
 const levels=CEFR_LEVELS.map(level=>({level,correct:placementQuestions.filter(q=>q.level===level&&answers[q.id]===q.answer).length,total:4}));
 let mastered=-1;for(let i=0;i<levels.length;i++){if(levels[i].correct<3)break;mastered=i;}
 return {level:CEFR_LEVELS[Math.max(0,mastered)],startingLevelUnconfirmed:mastered<0,correct:levels.reduce((n,l)=>n+l.correct,0),total:placementQuestions.length,levels,skills:['Grammaire','Vocabulaire','Compréhension'].map(skill=>{const questions=placementQuestions.filter(q=>q.skill===skill);return {skill,correct:questions.filter(q=>answers[q.id]===q.answer).length,total:questions.length}})};
}
