# MimFlo membres

Le site public reste sur GitHub Pages. Les Functions du projet Cloudflare Pages `mimflo-members` vérifient les comptes, les droits d'accès et conservent les données dans D1. L'API publique est `https://mimflo-members.pages.dev`.

## Administration

Connectez-vous sur `https://mimflo.com/admin/`. Le compte propriétaire peut créer des administrateurs et des clients. Changez le mot de passe initial depuis Mon profil → Sécurité de mon compte sur le site.

- **Articles & bibliothèque** : les cartes « Mes bibliothèques » et « Ajouter un nouvel article » ouvrent les contenus ou l'éditeur. La bibliothèque générale est commune aux trois packs ; l'offre gratuite garde son article séparé. Les articles se présentent sur quatre colonnes sur ordinateur et peuvent être modifiés. Les nouvelles thématiques sont conservées automatiquement.
- **Paiements** : vérifiez réellement le paiement, indiquez sa référence, puis validez. Le pack commence alors pour 5, 10 ou 15 jours.
- **Clients** : consultez le dossier, les accès, les demandes, les séances et les notes ; vous pouvez suspendre un accès.
- **Comptes** : le formulaire apparaît au clic sur Ajouter un nouveau compte. La suppression désactive le compte et révoque ses sessions ; il reste restaurable avec son historique et son empreinte d'essai. Le propriétaire ne peut pas être supprimé.
- **Réglages** : remplacez l'adresse PayPal fictive par votre adresse réelle. Les données de paiement ne sont jamais demandées directement par MimFlo.

## Images et checkout

Les téléversements JPEG, PNG et WebP sont optimisés côté navigateur (1600 px maximum) et conservés dans D1. Chaque image optimisée peut peser au maximum 1,5 Mo ; un article accepte huit images avec légende et emplacement dans les paragraphes. Le serveur valide le format et réserve le téléversement aux administrateurs. Les images sont consultables via une adresse signée valable une heure, fournie uniquement avec un article autorisé ou dans l'administration. Une personne disposant de cette adresse peut consulter l'image jusqu'à son expiration.

Le checkout exige un compte connecté et collecte les coordonnées du client, son pays, son niveau et son objectif. La commande apparaît dans Paiements avec un identifiant unique. Les montants sont fixés par le serveur : 10, 15 et 20 USD. Une nouvelle tentative de checkout réutilise la commande en attente du même pack.

Avec l'adresse provisoire `paypal@example.invalid`, la commande est enregistrée sans demander de paiement. Une fois une véritable adresse configurée, le bouton dirige vers le paiement hébergé PayPal Standard. Le retour de PayPal n'active jamais les accès : l'administrateur doit vérifier le paiement reçu et sa référence. Aucun webhook de validation automatique n'est configuré.

Les articles créés dans l'administration restent dans la base privée, hors du code du site public. Une simple inscription ou demande d'abonnement n'ouvre aucun pack payant.

## Bibliothèque des packs payants

Sprint, Intensif et Performance ouvrent le même catalogue pendant exactement 5, 10 et 15 périodes de 24 heures à compter de la validation du paiement. Les contrôles du serveur refusent tout nouvel accès, enregistrement ou analyse dès l'échéance, sans attendre une tâche planifiée. Le navigateur affiche le temps restant et ferme la lecture à l'expiration.

Le client choisit un nouvel article toutes les 24 heures. Son article courant peut être relu et retravaillé jusqu'au choix suivant, dans la limite de l'abonnement. Le choix est enregistré atomiquement dans `paid_article_access`, pour tous ses appareils et packs ; changer de page, actualiser ou lancer deux demandes simultanées ne contourne pas le délai. Le catalogue n'envoie que les présentations : le texte complet est remis par `POST /articles/open` après contrôle. L'essai gratuit conserve ses règles indépendantes.

Appliquer `backend/migrations/0006_general_library.sql` avant de déployer l'API. La migration ajoute les tables de choix et leur historique et rend les anciens articles payants communs aux trois packs, sans modifier les liens de l'essai. Les textes importés restent dans D1 ; ne pas ajouter les documents ou leur SQL d'import au dépôt public.

`node backend/verify-library.mjs` vérifie le véritable handler avec SQLite : concurrence, contenu protégé, délai de 24 heures, échéances exactes des trois packs et maintien des règles de l'essai. Si `.qa/import-volumes.sql` est présent, il contrôle aussi les vingt articles et l'import idempotent, sans appeler la production.

## Essai gratuit

L'adresse doit être confirmée. L'essai dure au maximum 48 heures et permet une seule séance sauvegardée. Un compte, une adresse canonique et une empreinte IP ne peuvent réclamer qu'un essai. Gmail et Googlemail sont normalisés avec les points et suffixes `+`.

Une IP identifie une connexion, pas une personne : les réseaux partagés peuvent bloquer plusieurs clients et un changement de réseau/VPN peut contourner le contrôle. Aucune détection IP ne garantit l'identité physique.

## E-mails

En l'absence de service d'envoi, les inscriptions fonctionnent mais un administrateur doit confirmer l'adresse après vérification directe avec le client. Pour automatiser les liens, configurez les secrets `RESEND_API_KEY` et `MAIL_FROM` avec un expéditeur vérifié auprès de Resend. Ces secrets ne doivent jamais être ajoutés à GitHub. Aucun e-mail de test n'est envoyé par la suite locale.

## Données de progression

La lecture peut être envoyée à Cloudflare Workers AI après un consentement explicite. Whisper large v3 turbo transcrit en français ; MimFlo compare les mots avec un passage de 600 mots maximum et calcule un score de fidélité au texte, les omissions, substitutions, ajouts et le débit de mots reconnus. Les accents français sont conservés. Ce résultat n'est ni une mesure des phonèmes ou de l'accent, ni un niveau CECRL. Les écarts peuvent provenir de la reconnaissance vocale. Aucun LLM ne fabrique un score de prononciation.

Le navigateur convertit l'enregistrement en WAV mono 16 kHz. Le serveur vérifie le WAV, sa durée (3 à 120 secondes), son volume, le compte et l'accès au passage. Le texte attendu provient de l'article autorisé côté serveur. MimFlo stocke la transcription et l'évaluation dans les séances, visibles dans le dossier client ; aucun fichier audio n'est conservé dans D1.

Le compte Cloudflare était sur **Workers Free**, vérifié le 6 octobre 2026. Workers AI fournit 10 000 neurones/jour, remis à zéro à 00 h UTC ; le modèle Whisper choisi utilise environ 46,63 neurones/minute selon la documentation consultée. MimFlo réserve atomiquement au maximum **50 appels/jour pour tout le site**, **5 appels/jour par compte** et **une analyse réussie pour l'essai gratuit**. Même les appels échoués restent comptés dans la limite quotidienne. Une reprise avec le même identifiant retourne le résultat enregistré sans nouvelle inférence. Le quota Cloudflare reste partagé avec les autres applications du compte : leur consommation peut rendre le service indisponible plus tôt. Sur Workers Free, Cloudflare bloque le dépassement ; aucune montée de plan ou facturation n'est activée. Ne passez pas le compte en Paid si vous souhaitez conserver cette garantie du fournisseur.

Le binding `AI` et `AI_ENABLED = "true"` sont dans `backend/pages/wrangler.toml`. `AI_ENABLED = "false"` désactive les analyses tout en gardant l'enregistrement manuel. Le traitement fonctionne ordinateur du propriétaire éteint. Le traitement distant de la voix est annoncé avant l'envoi ; la politique de confidentialité Cloudflare s'applique au fournisseur.

Le diagnostic propriétaire `/admin/ai-check` accepte un WAV de contrôle de dix secondes maximum avec consentement, au plus cinq fois par jour pour le compte. Cela ajoute au maximum environ 39 neurones au budget réservé de MimFlo. Il ne conserve aucun enregistrement ni transcription de contrôle.

`node backend/verify-ai.mjs` teste le véritable handler avec SQLite et une inférence simulée : consentement, accès, formats et silence, différences en français, sauvegarde, idempotence, concurrence de l'essai, quotas et coupure. Il n'appelle aucun service externe.

## Déploiement et contrôles

Créez le dossier `.qa/pages` puis exécutez `wrangler pages deploy --cwd backend/pages --project-name mimflo-members --branch main` pour publier l'API. La variable GitHub `MIMFLO_MEMBER_API` doit contenir `https://mimflo-members.pages.dev`. Configurez les secrets d'e-mail avec `wrangler pages secret put NOM --project-name mimflo-members`. Le secret `IP_PEPPER` protège les empreintes IP ; sa rotation affecterait la détection des anciennes connexions.

Le Worker `mimflo-members` n'expose plus de route publique ; il conserve uniquement le nettoyage quotidien des sessions expirées, tokens de vérification et compteurs de tentatives. Publiez ce nettoyage avec `wrangler deploy --config backend/wrangler.toml`.

`node backend/verify-local.mjs` exécute des scénarios contre localhost uniquement et crée des données de test dans la base locale. Les identifiants initiaux sont conservés dans un fichier local ignoré par Git, jamais dans le dépôt.

## Connexion Google

La connexion e-mail/mot de passe reste disponible. Les nouveaux mots de passe (inscription, changement, création dans l’administration) exigent 12 à 128 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial. Les comptes existants conservent leur accès.

Dans Google Auth Platform, créer une application externe MimFlo avec uniquement les données d’identité de base (nom et e-mail), puis un client OAuth de type Application Web. Ajouter l’origine JavaScript autorisée https://mimflo.com (sans chemin). L’intégration utilise Google Identity Services en popup : aucun secret client et aucun URI de redirection ne sont nécessaires. Dans /admin/, Réglages → Connexion avec Google, sauvegarder l’identifiant public …apps.googleusercontent.com. Passer l’application Google en production pour que tous les clients puissent se connecter. Aucun service facturé n’est nécessaire.

Le bouton Google est masqué tant que le client n’est pas configuré. Un compte Google est créé seulement depuis Inscription après acceptation des conditions. Les jetons sont vérifiés côté serveur (signature RSA, audience, émetteur, expiration, nonce à usage unique et preuve navigateur). Aucun compte existant n’est associé automatiquement sur la seule base de l’e-mail. Les comptes Google ont le rôle client ; les restrictions d’accès et d’essai IP/e-mail sont identiques. Les e-mails hors Gmail/Workspace doivent être confirmés par le mécanisme existant avant l’essai.

Tests : node backend/verify-auth.mjs (SQLite réelle, signatures RSA locales, aucun appel Google externe).

La durée maximale est calculée depuis le texte du passage : 120 mots/minute, plus 50 % et une minute pour les pauses, arrondie à la minute (minimum 3, maximum 10 minutes). Le serveur recalcule cette limite ; le client ne peut pas la modifier. Le budget quotidien réserve aussi 6 000 secondes audio pour tout le site, y compris les échecs, afin de conserver la marge du quota gratuit. Les anciennes réservations comptent 120 secondes chacune. L’écoute utilise les voix françaises du navigateur, avec un choix de voix et de vitesse, pour le passage ou tout l’article.

### Messagerie LWS MimFlo
Le serveur peut envoyer directement par SMTP SSL (port 465) via mail01.lwspanel.com, avec contact@mimflo.com comme utilisateur et expéditeur. Le mot de passe doit être ajouté comme secret SMTP_PASSWORD du projet Cloudflare Pages, jamais dans le dépôt ni dans le navigateur des clients. Le propriétaire peut lancer un test depuis Administration → Réglages. Une acceptation SMTP ne prouve pas la réception : vérifier la boîte et les indésirables. Les échecs ne bloquent pas la création du compte et ne confirment jamais automatiquement une adresse. Resend reste une solution de secours si configuré.
