# MimFlo

Plateforme française réalisée à partir des deux références fournies. Logo fourni conservé ; illustration de la jeune femme et paysage recréés en haute définition dans l’esprit de la référence. Polices approchantes : Nunito et Caveat, puisque la police source n’a pas été fournie.

## Fonctionnalités

- Dix vues : accueil, inscription/profil, essai gratuit, packs, bibliothèque, lecteur, notes, progression, parcours et aide.
- Quatorze articles, catégories et recherche.
- Lecture vocale avec la synthèse du navigateur, enregistrement au microphone et réécoute locale.
- Transcription facultative avec consentement explicite. Le pourcentage correspond uniquement aux mots reconnus dans le texte, pas à un score phonétique.
- Profils, notes, choix de pack et séances conservés dans D1 et associés à l’identité connectée côté serveur.
- Connexion via ChatGPT dans cette version ; pas d’authentification indépendante par e-mail/mot de passe.
- Une séance gratuite à réaliser sous 48 heures. Le démarrage du compteur est conservé côté serveur.

## À activer avant commercialisation

- Fournisseur de paiement et traitement serveur des achats ; aucun paiement ne peut actuellement être effectué.
- Service d’évaluation phonétique pour les notes de prononciation, fluidité et débit.
- Identité juridique, coordonnées de support, règles de conservation et documents contractuels définitifs.
- Authentification destinée aux clients si une connexion indépendante de ChatGPT est souhaitée.

## Vérification

TypeScript et compilation de production. Vérifications HTTP locales : refus des écritures anonymes, origine étrangère, validation du profil, sauvegarde des notes, démarrage de l’essai, sauvegarde de séance, limite de l’essai et choix de pack. Recherche et affichage vérifiés dans le navigateur.

Le microphone, la lecture vocale réelle et une session client en production nécessitent une vérification avec l’utilisateur. Les données de test locales ne sont jamais incluses dans l’archive publiée.
