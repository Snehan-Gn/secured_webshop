# Mon Rapport de Projet : Secured Webshop

## Introduction
Dans le cadre du cours **183 - Sécurité des applications**, j'ai dû travailler sur une boutique en ligne qui avait pas mal de failles de sécurité. Mon but était de sécuriser tout ça pour protéger les utilisateurs et leurs données.

## Ce que j'ai mis en place

### 1. Gestion des comptes et mots de passe
*   **Hashage Bcrypt** : J'ai arrêté de stocker les mots de passe en texte clair. Maintenant, j'utilise `bcrypt` pour les transformer en empreintes sécurisées (hash).
*   **Sel et Poivre** : Le "sel" est géré automatiquement par bcrypt pour chaque utilisateur. Pour plus de sécurité, j'ai ajouté un "poivre" (une clé secrète dans le fichier `.env`) que je rajoute au mot de passe avant de le hasher. Comme ça, même si la base de données fuite, les mots de passe restent très durs à casser.
*   **Mots de passe forts** : J'ai créé un script qui vérifie que les mots de passe font au moins 12 caractères avec des majuscules, chiffres et caractères spéciaux. J'ai aussi ajouté une jauge visuelle pour aider l'utilisateur lors de l'inscription.

### 2. Sécurité des accès (JWT et HTTPS)
*   **HTTPS** : J'ai configuré le serveur pour qu'il tourne en HTTPS. J'ai généré des certificats auto-signés pour que les échanges entre le navigateur et le serveur soient cryptés.
*   **Tokens JWT** : Pour la connexion, j'utilise des jetons JWT. 
    *   Le jeton d'accès (`accessToken`) ne dure que 15 minutes.
    *   J'ai aussi mis un `refreshToken` qui dure 7 jours pour que l'utilisateur n'ait pas à se reconnecter tout le temps, mais de façon sécurisée (il est stocké hashé en base de données).
*   **Rôles** : Le système fait maintenant la différence entre un simple utilisateur et un administrateur pour protéger les pages sensibles.

### 3. Protections contre les attaques
*   **Injections SQL** : J'ai revu toutes les requêtes vers la base de données. J'utilise maintenant des requêtes préparées (avec des `?`), ce qui empêche quelqu'un d'injecter du code malveillant dans les formulaires.
*   **Anti Brute-force** : Pour éviter que quelqu'un essaie des milliers de mots de passe, j'ai limité les tentatives à 5 par minute par adresse IP.
*   **Verrouillage de compte** : Si quelqu'un se trompe 5 fois de suite sur un compte, celui-ci se bloque pendant 15 minutes. J'ai aussi prévu un système de jeton pour débloquer le compte si besoin.

## Côté technique
L'application utilise **Node.js** avec **Express** pour le serveur, et une base **MySQL**. J'ai essayé de bien séparer le code : la logique de sécurité est rangée dans le dossier `utils`, les vérifications d'accès dans `middleware`, et les secrets bien cachés dans le fichier `.env`.

## Conclusion
Ce projet m'a permis de comprendre qu'on ne peut pas juste faire tourner une application, il faut aussi penser à comment elle pourrait être attaquée. 

Le plus dur a été de mettre en place le système de Refresh Token et de bien gérer le poivre avec Bcrypt, mais maintenant le système est bien plus solide. J'ai appris qu'il faut toujours douter de ce que l'utilisateur envoie et ne jamais stocker d'infos sensibles en clair.
