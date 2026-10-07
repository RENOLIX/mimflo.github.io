# Analyse phonétique locale MimFlo

Le moteur gratuit fonctionne sur l’appareil de l’élève, sans Python distant,
Azure ou abonnement Speechace. Il fonctionne même lorsque l’ordinateur du
propriétaire MimFlo est éteint. Le site et l’API d’accès restent hébergés.

## Moteur réellement utilisé

- Wav2Vec2-Large LV60 multilingue avec tête **phonème CTC**, et non une tête ASR.
- Conversion ONNX `onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX`, révision
  `c69750f5043e5e1f8a71ab95dd3b98338c280c92`, poids quantifiés q8 de 318 Mo.
- eSpeak NG français via Piper WASM : passage entier pour préserver les liaisons.
- Web Worker + ONNX Runtime WASM, un thread ; fenêtres de 6 s et contexte de 1 s.
- Alignement des phones reconnus au passage, CTC forcé par groupes bornés,
  probabilités acoustiques et marge log entre le son attendu et son meilleur
  concurrent. La mesure reste ancrée dans l’intervalle sonore détecté.
- Détection des pauses par énergie : seuil adaptatif, pauses internes >= 0,3 s.

Ce checkpoint n’est pas XLS-R : son nom et sa provenance sont affichés correctement.
Les modèles français XLS-R d’ASR ne produisent pas automatiquement un score
phonétique. Le programme n’utilise pas OpenPronounce ni une API non configurée.

## Sens des résultats

Le pourcentage par phonème est la moyenne des probabilités du modèle dans son
intervalle. L’indice global est leur moyenne sur tous les phonèmes attendus ;
les sons non reconnus contribuent zéro. Les sons supplémentaires sont affichés
séparément. Les phonèmes non reconnus n’ont pas de timestamps inventés.

La marge GOP est une marge acoustique de type GOP, pas le GOP validé d’un
système clinique ou d’un moteur commercial. Les symboles reconnus peuvent être
erronés ; liaison, schwa facultatif, accent régional, bruit et micro peuvent
influencer les mesures. Les phrases de conseils ne certifient pas une erreur.

**Pas de score d’accent fiable, de fluidité calibrée, de niveau CECRL ni de
note comparable à Azure.** Ces sorties nécessitent un corpus français noté
par des évaluateurs, une étude de calibration et une validation externe.
Les champs `accentScore` et `fluencyScore` restent `null` ; `calibrated=false`.
Le rythme affiche uniquement la durée de voix et les pauses mesurées.

## Stockage et limites

Le premier chargement demande environ 360 Mo avec les bibliothèques. Cache
Storage conserve les poids si le navigateur le permet. La durée et la mémoire
nécessaires dépendent de l’appareil ; certains téléphones peuvent manquer de
mémoire. L’élève peut annuler et son enregistrement reste disponible.

La première séance gratuite reste limitée à 30 s et à une analyse unique.
Les packs gardent une durée adaptée au passage, jusqu’à 10 minutes. L’inférence
locale ne consomme pas le quota Whisper Cloudflare. Aucune sauvegarde ne déclenche
une conversion silencieuse vers Whisper : un échec reste visible et réessayable.

`POST /analysis/local` vérifie le compte, l’accès, le passage, sa durée et le
format des mesures, puis sauvegarde la séance et le travail dans une transaction
idempotente. L’agrégation est recalculée au serveur. Ce calcul ne prouve pas que
les probabilités envoyées par le client sont authentiques : les mesures locales
ne conviennent pas à un examen certifiant. Supprimer une séance ne renouvelle
pas l’essai. L’audio original reste dans IndexedDB sur cet appareil ; le serveur
reçoit les phonèmes et les mesures, pas le fichier audio.

Les anciennes analyses textuelles sont conservées et clairement identifiées.
Elles ne peuvent pas devenir phonétiques sans réanalyser leur audio original.

## Vérification

Le bilan présente un indice circulaire, la complétude des sons attendus, la
proportion de sons détectés identiques au passage, le rythme mesuré, le passage
coloré et les mots à retravailler. La fluidité reste sans note : ses pauses sont
mesurées, mais elles ne constituent pas un score calibré. Les couleurs reflètent
la reconnaissance acoustique, pas un niveau CECRL. Chaque occurrence de mot est
indexée dans les nouvelles analyses ; les anciennes séances sans ces index
restent lisibles sans inventer des mesures pour les répétitions ambiguës.

Le modèle de lecture audio utilise la synthèse française du navigateur. Il ne
s’agit pas d’un enregistrement d’un locuteur natif. Les boutons de réécoute et
de nouvelle lecture ne modifient pas les quotas d’analyse.

```powershell
node scripts/verify-phonetics.mjs
node backend/verify-phonetics.mjs
node scripts/verify-reading-report.mjs
$env:MIMFLO_MEMBER_API='https://mimflo-members.pages.dev'
npx vite build --config vite.pages.config.ts
```

Tests : WAV avec chunks supplémentaires, voyelles nasales, silence, répétitions
CTC, texte partiellement lu, différence acoustique entre références ; accès,
consentement, format, durée de l’essai, sauvegardes idempotentes et essai unique
après suppression. Une inférence réelle sur un fichier synthétique et le moteur
WASM dans Chrome ont aussi été vérifiés. Ces tests ne constituent pas une étude
de calibration de prononciation française.
