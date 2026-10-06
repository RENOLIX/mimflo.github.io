# MimFlo membres

Le site public reste sur GitHub Pages. Les Functions du projet Cloudflare Pages `mimflo-members` vérifient les comptes, les droits d'accès et conservent les données dans D1. L'API publique est `https://mimflo-members.pages.dev`.

## Administration

Connectez-vous depuis `#inscription`, puis ouvrez `#admin`. Le compte propriétaire peut créer des administrateurs et des clients. Changez le mot de passe initial depuis Mon profil → Sécurité de mon compte.

- **Articles par pack** : créez les textes, choisissez les packs et cochez Publier. Un seul article peut être affecté à l'essai gratuit.
- **Paiements** : vérifiez réellement le paiement, indiquez sa référence, puis validez. Le pack commence alors pour 5, 10 ou 15 jours.
- **Clients** : consultez le dossier, les accès, les demandes, les séances et les notes ; vous pouvez suspendre un accès.
- **Réglages** : renseignez les instructions de paiement.

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
