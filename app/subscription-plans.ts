export const plans = [
  {id:'sprint',name:'Pack Sprint',days:7,price:'10',features:['Bibliothèque complète','Exercices ciblés','Défi oral : évaluez votre niveau','Suivi de progression','Accès aux notes']},
  {id:'intensif',name:'Pack Intensif',days:15,price:'15',features:['Bibliothèque complète','Exercices ciblés','Défi oral : évaluez votre niveau','Suivi de progression','Accès aux notes']},
  {id:'performance',name:'Pack Performance',days:20,price:'20',features:['Bibliothèque complète','Exercices ciblés','Défi oral : évaluez votre niveau','Suivi de progression','Accès aux notes']},
];

// Payment approval and displayed cards use the same access durations.
export const packDays:Record<string,number> = Object.fromEntries(plans.map(plan=>[plan.id,plan.days]));
