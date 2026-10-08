# My Social Networks API

API REST du TP « My Social Networks » : utilisateurs, groupes, événements, fils de discussion, albums photo, sondages et billetterie.

Stack : Node.js, Express, MongoDB (Mongoose).

## Installation

Prérequis : Node.js 20 ou plus, et un serveur MongoDB accessible.

```bash
git clone https://github.com/Joepok77/my-social-networks-api.git
cd my-social-networks-api
npm install
cp .env.example .env
```

Dans `.env`, remplacer `JWT_SECRET` par une valeur aléatoire :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Démarrer MongoDB si ce n'est pas déjà fait, par exemple :

```bash
sudo systemctl start mongod
# ou avec Docker
docker run -d --name mongo -p 27017:27017 mongo:8
```

## Lancement

```bash
npm start      # production
npm run dev    # redémarrage automatique à chaque modification
```

L'API écoute sur `http://localhost:3000/api`.

## Documentation de l'API

Swagger UI : <http://localhost:3000/api-docs>

Les 73 routes y sont décrites : paramètres, corps attendus, réponses, codes d'erreur et authentification.
Pour tester une route protégée, obtenir un token avec `POST /auth/login`, puis le coller dans « Authorize ».

## Variables d'environnement

| Variable | Rôle | Défaut |
|---|---|---|
| `PORT` | port d'écoute | `3000` |
| `MONGODB_URI` | connexion MongoDB | obligatoire |
| `JWT_SECRET` | secret de signature des tokens (32 caractères minimum) | obligatoire |
| `JWT_EXPIRES_IN` | durée de validité du token | `1h` |
| `CORS_ORIGINS` | origines autorisées, séparées par des virgules (`*` est refusé) | aucune |
| `USE_HTTPS` | `true` pour servir en HTTPS | `false` |
| `SSL_KEY_PATH`, `SSL_CERT_PATH` | clé privée et certificat | `certs/server.key`, `certs/server.crt` |
| `PUBLIC_APP_URL` | adresse de l'application cliente, pour les liens de partage | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `RATE_LIMIT_AUTH_MAX` | limitation du nombre de requêtes par adresse IP | 15 min, 300, 10 |

## Activer HTTPS (optionnel)

Par défaut le serveur est en HTTP. Pour passer en HTTPS, générer un certificat auto-signé avec les commandes du cours :

```bash
mkdir -p certs
openssl genrsa -out certs/server.key 2048
openssl req -new -key certs/server.key -out certs/server.csr -subj "/CN=localhost"
openssl x509 -req -days 365 -in certs/server.csr -signkey certs/server.key -out certs/server.crt
```

Puis mettre `USE_HTTPS=true` dans `.env` et relancer : l'API répond sur `https://localhost:3000/api`.
Si le certificat est introuvable, le serveur refuse de démarrer.
Le certificat étant auto-signé, le navigateur affiche un avertissement (avec curl, ajouter `-k`).

## Attributs d'un utilisateur

| Attribut | Description |
|---|---|
| `firstName`, `lastName` | prénom et nom |
| `email` | unique ; visible uniquement par son propriétaire |
| `password` | hashé avec bcrypt, jamais renvoyé par l'API |
| `avatar` | URL de la photo de profil, facultative |
| `createdAt`, `updatedAt` | dates de création et de modification |

## Collections

| Collection | Contenu |
|---|---|
| `users` | comptes utilisateurs |
| `groups` | groupes publics, privés ou secrets, avec leurs administrateurs et membres |
| `events` | événements publics ou privés, avec leurs organisateurs et participants |
| `fils_discussion` | un fil par groupe ou par événement, jamais les deux |
| `messages` | messages d'un fil et réponses à un message |
| `albums` | albums photo d'un événement |
| `photos` | photos d'un album |
| `comments` | commentaires d'une photo |
| `sondages` | sondages d'un événement, avec leurs questions et réponses possibles |
| `reponses_sondages` | réponse d'un participant à un sondage |
| `types_billets` | types de billets d'un événement : nom, montant, quantité limitée |
| `billets` | billets achetés |

## Choix de conception

Le sujet laisse plusieurs points ouverts. Voici ce qui a été décidé.

**Rôles**
- Les rôles dépendent du contexte : administrateur ou membre d'un groupe, organisateur ou participant d'un événement.
- Un administrateur est aussi membre, un organisateur est aussi participant.
- Un groupe garde toujours au moins un administrateur et un événement au moins un organisateur (409 sinon).

**Rejoindre un groupe ou un événement**
- Public : chacun peut s'y ajouter lui-même.
- Privé ou secret : seul un administrateur ou un organisateur ajoute quelqu'un.

**Visibilité**
- Groupe privé : visible en résumé dans les listes, détail réservé aux membres (403).
- Groupe secret : absent des listes et des recherches, et 404 pour un non-membre.
- Événement privé : absent des listes et réservé à ses participants (403).

**Événements d'un groupe**
- Créés par un administrateur, ou par un membre si le groupe l'autorise.
- `inviteAllMembers` ajoute tous les membres comme participants en une seule action. Le sujet ne définit pas de statut d'invitation : être invité, c'est être participant.
- Partage sur les autres réseaux sociaux : `GET /events/:id/share` renvoie l'adresse de l'événement et des liens de partage préremplis (X, LinkedIn, WhatsApp). Réservé aux organisateurs d'un événement créé dans un groupe public.

**Fils de discussion**
- Le fil d'un groupe est créé avec le groupe. Celui d'un événement est ouvert par un organisateur.
- L'option « autoriser les membres à publier » ne concerne que les nouveaux messages : tout membre peut répondre à un message, comme le demande le sujet.

**Albums photo**
- Les albums sont créés par les organisateurs ; les participants postent les photos et les commentent.
- Les images (photos, couvertures, icônes) sont des URL : le sujet ne demande pas d'envoi de fichiers.

**Sondages**
- Un participant répond une seule fois, à toutes les questions, avec une réponse par question choisie parmi celles proposées.
- Les questions ne sont plus modifiables dès qu'une réponse a été donnée.

**Billetterie**
- Elle s'active sur un événement public (`ticketingEnabled`) ; elle est refusée sur un événement privé (409).
- L'achat se fait sans compte, puisqu'il s'adresse à une personne extérieure.
- « Un seul billet par personne » : la personne est identifiée par son email, avec un index unique (événement, email). Nom, prénom et adresse ne suffisent pas à distinguer deux personnes.
- La quantité limitée n'est jamais dépassée : le compteur de billets vendus n'est incrémenté que s'il reste du stock, en une seule opération MongoDB.
- Aucun paiement n'est géré, le sujet n'en parle pas.

**Divers**
- Supprimer un événement supprime son fil, ses albums, ses sondages et sa billetterie. Supprimer un groupe supprime son fil ; ses événements sont conservés.
- Réponses : `{ "data": ... }`, `{ "data": [...], "pagination": {...} }` pour une liste, `{ "error": { "code", "message" } }` pour une erreur.
- Les bonus (shopping list, covoiturage) ne sont pas implémentés.
