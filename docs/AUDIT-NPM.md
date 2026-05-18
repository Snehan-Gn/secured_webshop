# Audit des dépendances NPM

Ce document décrit l’audit de sécurité NPM réalisé sur le projet **Secured Webshop** et les corrections appliquées.

## Périmètre

Toutes les dépendances runtime sont centralisées dans `app/package.json`. Le `package.json` à la racine ne contient plus de bibliothèques dupliquées (évite deux `node_modules` divergents).

## Procédure d’audit

Depuis la racine du dépôt :

```bash
cd app
npm install
npm audit
```

Pour appliquer les correctifs automatiques lorsque NPM le permet :

```bash
npm audit fix
```

En cas de vulnérabilités nécessitant une montée de version majeure :

```bash
npm audit fix --force   # à utiliser avec prudence, puis retester l’application
```

## Corrections documentées (mai 2026)

| Package | Avant | Après | Motivation |
|---------|-------|-------|------------|
| **express** | ^4.19.1 | ^4.21.2 | Versions antérieures de la branche 4.x peuvent transporter des correctifs de sécurité manquants ; 4.21.x est la branche maintenue. |
| **multer** | ^1.4.5-lts.1 | ^2.0.1 | Multer 1.x est affecté par des vulnérabilités connues (déni de service / gestion de fichiers). La v2 corrige ces failles ; l’API `diskStorage` utilisée dans `Profile.js` reste compatible. |
| **mysql2** | ^3.9.4 | ^3.14.0 | Mise à jour mineure incluant des correctifs de sécurité. |
| **jsonwebtoken** | (racine seule) | ^9.0.2 dans `app/` | Dépendance déplacée dans `app/` ; la v9 corrige les problèmes connus des versions 8.x. |
| **bcrypt** | (racine seule) | ^6.0.0 dans `app/` | Consolidation ; bcrypt 6.x pour Node.js récents. |
| **body-parser** | racine (inutilisé) | supprimé | Express intègre déjà le parsing JSON/urlencoded ; doublon inutile. |

## Vérification après correction

1. `docker-compose up` — base MySQL avec table `refresh_tokens`.
2. `cd app && npm start` (certificats HTTPS déjà présents ou générés via openssl, voir README)
3. Tester : inscription (mot de passe fort), connexion, profil, admin, renouvellement de session après 15 min (access token).

## Suivi continu

- Exécuter `npm audit` avant chaque livraison ou PR.
- Verrouiller les versions en production avec `package-lock.json` versionné.
- Ne pas commiter de secrets (`.env` est ignoré ; utiliser `.env.example`).

## Résultat attendu de `npm audit`

Après `npm install` et les mises à jour ci-dessus, l’objectif est **0 vulnérabilité** sur les dépendances directes. Si NPM signale encore un avertissement :

1. Noter le package et l’identifiant CVE dans ce fichier.
2. Appliquer `npm audit fix` ou une montée de version ciblée.
3. Retester les routes `/api/auth`, `/api/profile`, `/api/admin`.
