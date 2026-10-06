# MimFlo membres

Le site public reste sur GitHub Pages. Les Functions du projet Cloudflare Pages `mimflo-members` vérifient les comptes, les droits d'accès et conservent les données dans D1. L'API publique est `https://mimflo-members.pages.dev`.

## Administration

Connectez-vous sur `https://renolix.github.io/mimflo.github.io/admin/`. Le compte propriétaire peut créer des administrateurs et des clients. Changez le mot de passe initial depuis Mon profil → Sécurité de mon compte sur le site.

- **Articles & packs** : les cartes « Mes packs » et « Ajouter un nouvel article » ouvrent la bibliothèque ou l'éditeur. Les articles se présentent sur quatre colonnes sur ordinateur et peuvent être modifiés. Les nouvelles thématiques sont conservées automatiquement. Un seul article peut être affecté à l'essai gratuit.
- **Paiements** : vérifiez réellement le paiement, indiquez sa référence, puis validez. Le pack commence alors pour 5, 10 ou 15 jours.
- **Clients** : consultez le dossier, les accès, les demandes, les séances et les notes ; vous pouvez suspendre un accès.
- **Comptes** : le formulaire apparaît au clic sur Ajouter un nouveau compte. La suppression désactive le compte et révoque ses sessions ; il reste restaurable avec son historique et son empreinte d'essai. Le propriétaire ne peut pas être supprimé.
- **Réglages** : remplacez l'adresse PayPal fictive par votre adresse réelle. Les données de paiement ne sont jamais demandées directement par MimFlo.

## Images et checkout

Les téléversements JPEG, PNG et WebP sont optimisés côté navigateur (1600 px maximum) et conservés dans D1. Chaque image optimisée peut peser au maximum 1,5 Mo ; un article accepte huit images avec légende et emplacement dans les paragraphes. Le serveur valide le format et réserve le téléversement aux administrateurs. Les images sont consultables via une adresse signée valable une heure, fournie uniquement avec un article autorisé ou dans l'administration. Une personne disposant de cette adresse peut consulter l'image jusqu'à son expiration.

Le checkout exige un compte connecté et collecte les coordonnées du client, son pays, son niveau et son objectif. La commande apparaît dans Paiements avec un identifiant unique. Les montants sont fixés par le serveur : 10, 15 et 20 USD. Une nouvelle tentative de checkout réutilise la commande en attente du même pack.

Avec l'adresse provisoire `paypal@example.invalid`, la commande est enregistrée sans demander de paiement. Une fois une véritable adresse configurée, le bouton dirige vers le paiement hébergé PayPal Standard. Le retour de PayPal n'active jamais les accès : l'administrateur doit vérifier le paiement reçu et sa référence. Aucun webhook de validation automatique n'est configuré.

Les articles créés dans l'administration restent dans la base privée, hors du code du site public. Une simple inscription ou demande d'abonnement n'ouvre aucun pack payant.

## Essai gratuit

L'adresse doit être confirmée. L'essai dure au maximum 48 heures et permet une seule séance sauvegardée. Un compte, une adresse canonique et une empreinte IP ne peuvent réclamer qu'un essai. Gmail et Googlemail sont normalisés avec les points et suffixes `+`.

Une IP identifie une connexion, pas une personne : les réseaux partagés peuvent bloquer plusieurs clients et un changement de réseau/VPN peut contourner le contrôle. Aucune détection IP ne garantit l'identité physique.

## E-mails

En l'absence de service d'envoi, les inscriptions fonctionnent mais un administrateur doit confirmer l'adresse après vérification directe avec le client. Pour automatiser les liens, configurez les secrets `RESEND_API_KEY` et `MAIL_FROM` avec un expéditeur vérifié auprès de Resend. Ces secrets ne doivent jamais être ajoutés à GitHub. Aucun e-mail de test n'est envoyé par la suite locale.

## Données de progression

La durée, la transcription facultative et la proportion de mots reconnus sont sauvegardées. L'audio reste dans l'onglet et n'est pas stocké. Le score de transcription ne constitue pas une évaluation phonétique par IA ; ce service reste à connecter.

## Déploiement et contrôles

Créez le dossier `.qa/pages` puis exécutez `wrangler pages deploy --cwd backend/pages --project-name mimflo-members --branch main` pour publier l'API. La variable GitHub `MIMFLO_MEMBER_API` doit contenir `https://mimflo-members.pages.dev`. Configurez les secrets d'e-mail avec `wrangler pages secret put NOM --project-name mimflo-members`. Le secret `IP_PEPPER` protège les empreintes IP ; sa rotation affecterait la détection des anciennes connexions.

Le Worker `mimflo-members` n'expose plus de route publique ; il conserve uniquement le nettoyage quotidien des sessions expirées, tokens de vérification et compteurs de tentatives. Publiez ce nettoyage avec `wrangler deploy --config backend/wrangler.toml`.

`node backend/verify-local.mjs` exécute des scénarios contre localhost uniquement et crée des données de test dans la base locale. Les identifiants initiaux sont conservés dans un fichier local ignoré par Git, jamais dans le dépôt.
