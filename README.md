# Secured Webshop

Projet pédagogique utilisé dans le cadre du cours **183 - Sécurité des applications** (ETML).

Cette application est un serveur web Node.js qui regroupe deux parties : un **backend** (API REST en Express qui communique avec la base de données MySQL) et un **frontend** (pages HTML servies directement par le même serveur). Les pages web appellent l'API via `fetch()` pour afficher et modifier les données.

## Mesures de sécurité implémentées

| Mesure | Détail |
|--------|--------|
| **HTTPS** | Serveur Express en HTTPS avec certificat auto-signé (développement). En-tête HSTS. |
| **Mots de passe** | Min. 12 caractères, majuscule, minuscule, chiffre, caractère spécial + indicateur de force à l'inscription. |
| **JWT** | Access token **15 min** ; refresh token **7 jours** stocké en base (hash SHA-256). |
| **Audit NPM** | Dépendances consolidées dans `app/` — voir [docs/AUDIT-NPM.md](docs/AUDIT-NPM.md). |

---

## Démarrer le projet

### 1. Base de données (Docker)

```bash
docker-compose up
```

Lance MySQL sur le port **6033** et phpMyAdmin sur **8081**.
Le script `app/db/init/init.sql` est exécuté automatiquement au premier démarrage (inclut la table `refresh_tokens`).

> **Note :** Si la base existe déjà (volume Docker), supprimer le volume pour réinitialiser :
> ```bash
> docker-compose down -v
> docker-compose up
> ```

### 2. Configuration

```bash
cp .env.example .env
# Éditer .env : PEPPER, JWT_SECRET, JWT_REFRESH_SECRET
```

### 3. Certificat HTTPS (première fois)

```bash
cd app
npm install
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.cert -days 365 -nodes -subj "/CN=localhost"
chmod 600 server.key
```

Génère `server.key` et `server.cert` (auto-signés, valides 1 an). Le navigateur affichera un avertissement : accepter l'exception pour `localhost`.

### 4. Application Node.js

```bash
cd app
npm start
```

L'application démarre sur **https://localhost:8080**

---

## Pages disponibles

| URL | Description |
|-----|-------------|
| https://localhost:8080/ | Page d'accueil |
| https://localhost:8080/login | Connexion |
| https://localhost:8080/register | Inscription (politique mot de passe + jauge) |
| https://localhost:8080/profile | Profil utilisateur |
| https://localhost:8080/admin | Administration |

---

## API REST

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion → `accessToken`, `refreshToken` |
| POST | `/api/auth/register` | Inscription (mot de passe fort requis) |
| POST | `/api/auth/refresh` | Renouveler l'access token |
| POST | `/api/auth/logout` | Révoquer le refresh token |
| GET | `/api/profile` | Profil (Bearer access token) |
| POST | `/api/profile` | Mettre à jour l'adresse |
| POST | `/api/profile/photo` | Photo de profil |
| GET | `/api/admin` | Liste des utilisateurs (admin) |

---

## Outils

| Service | URL | Identifiants |
|---------|-----|--------------|
| phpMyAdmin | http://localhost:8081 | user: `db_user` / pass: `db_password` |

---

## Comptes de départ (démo)

Les comptes seed dans `init.sql` ont des mots de passe **en clair** (faille volontaire du projet initial). Pour tester l'authentification JWT/bcrypt, **créez un nouveau compte** via `/register` avec un mot de passe fort, par exemple : `MonMotDePasse!2026`.

---

## Documentation complémentaire

- [Audit NPM et correctifs](docs/AUDIT-NPM.md)
