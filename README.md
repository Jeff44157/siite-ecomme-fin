# IT Haven — Boutique e-commerce + backoffice admin

Application e-commerce française pour IT Haven : boutique responsive, panier avec promotions et localisation, comptes clients, commandes, et backoffice administrateur complet.

## Stack

- Node.js >= 18 (testé avec Node 24)
- Express 5
- MySQL / MariaDB via `mysql2/promise`
- Authentification JWT + mots de passe hachés avec `bcryptjs`
- Frontend vanilla JS/CSS, SheetJS (`xlsx`) pour CSV/Excel, Nodemailer pour les e-mails

## Prérequis

- Node.js et npm installés
- MySQL en fonctionnement (port `3306` par défaut)
- Un utilisateur MySQL autorisé à créer/utiliser la base

Vérifier avec :

```bash
node -v
npm -v
```

## Installation

```bash
cd C:\Users\jeffs\Desktop\pa
npm install
```

## Configuration

Crée un fichier `.env` à la racine du projet :

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ecommerce

JWT_SECRET=remplace_par_une_cle_longue_et_aleatoire

ADMIN_EMAIL=admin@ithaven.tg
ADMIN_PASSWORD=Admin1234!

# Optionnel : relances par e-mail des paniers abandonnés
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
```

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `PORT` | `3000` | Port HTTP du serveur |
| `DB_HOST` | `localhost` | Hôte MySQL |
| `DB_PORT` | `3306` | Port MySQL |
| `DB_USER` | `root` | Utilisateur MySQL |
| `DB_PASSWORD` | vide | Mot de passe MySQL |
| `DB_NAME` | `ecommerce` | Nom de la base |
| `JWT_SECRET` | valeur de développement | Signature des tokens JWT |
| `ADMIN_EMAIL` | `admin@ithaven.tg` | E-mail du compte admin créé par la migration |
| `ADMIN_PASSWORD` | `Admin1234!` | Mot de passe du compte admin créé par la migration |
| `SMTP_*`, `MAIL_FROM` | absents | Envoi réel des relances ; sinon elles restent en file d’attente |

> Important : change `JWT_SECRET` et `ADMIN_PASSWORD` en production. Ne commite jamais le fichier `.env`.

## Base de données

### Base existante

Si la base contient déjà des données, utilise uniquement la migration non destructive :

```bash
npm run migrate
```

Elle ajoute les tables manquantes, les colonnes manquantes, les codes promo, les catégories promo, le compte admin et les programmes de fidélité sans supprimer les produits/commandes existants.

### Installation neuve

`bd.sql` recrée complètement la base `ecommerce` : **toutes les tables sont supprimées puis recréées**. À utiliser seulement sur une installation neuve.

```bash
mysql -u root -p < bd.sql
npm run migrate
```

Si tu définis `DB_NAME` différent de `ecommerce`, modifie aussi le `CREATE DATABASE` / `USE` dans `bd.sql`.

> Relancer `npm run migrate` réinitialise le mot de passe admin à `ADMIN_PASSWORD`.

## Lancement

```bash
npm start
```

Serveur : `http://localhost:3000`

> Pour un déploiement gratuit en ligne, voir [DEPLOY-RENDER.md](DEPLOY-RENDER.md) (sans carte) ; les alternatives [DEPLOY.md](DEPLOY.md) et [DEPLOY-WAIFLY.md](DEPLOY-WAIFLY.md) demandent respectivement une carte et un serveur gratuit disponible.

| Page | URL |
| --- | --- |
| Accueil | `http://localhost:3000/index.html` |
| Boutique | `http://localhost:3000/shop.html` |
| Promotions | `http://localhost:3000/promo.html` |
| Connexion | `http://localhost:3000/auth.html` |
| Administration | `http://localhost:3000/admin.html` |

Le panier est un tiroir accessible depuis l’icône du header sur toutes les pages.  
Un lien « Administration » est aussi présent dans le footer de chaque page publique.

## Accès administrateur

Identifiants par défaut :

```text
E-mail : admin@ithaven.tg
Mot de passe : Admin1234!
```

Après connexion avec un compte `admin`, `auth.html` redirige automatiquement vers `admin.html`. Sans token valide, `admin.js` redirige vers `auth.html`.

Le backoffice contient :

- **Tableau de bord** : chiffre d’affaires, commandes, panier moyen, taux de conversion, meilleures ventes, alertes de stock, dernières commandes.
- **Catalogue** : CRUD produits, déclinaisons, import CSV/XLSX, export CSV/XLSX, recherche, filtres, pagination.
- **Commandes** : filtres par statut, changement de statut, bouton « Confirmer la commande » qui passe en `paid`, facture et bon de livraison imprimables.
- **Marketing** : codes promo, ventes flash, fidélité, parrainage, relance des paniers abandonnés.
- **CRM** : clients, total dépensé, nombre de commandes, segments `VIP` / `Fidèle` / `Nouveau`, historique et export.

Statuts de commande : `pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled` (`en attente`, `payée`, `en préparation`, `expédiée`, `livrée`, `annulée`).

## Scripts npm

| Commande | Description |
| --- | --- |
| `npm start` | Démarre le serveur Express |
| `npm run migrate` | Applique la migration non destructive et prépare le compte admin |
| `npm run check` | Vérifie la syntaxe de tous les fichiers JS |

## Configuration métier

### Livraison

Trois zones sont définies dans `server.js` et `catalog.js` :

| Zone | Frais |
| --- | --- |
| Lomé Centre (Tokoin, Bè, Nyékonakpoè) | 1 500 FCFA |
| Agoè / Adidogomé / Légbassito | 2 000 FCFA |
| Baguida / Avepozo | 2 500 FCFA |

### Codes promo

| Code | Effet |
| --- | --- |
| `ITHAVEN10` | -10 % sur le sous-total |
| `VIP20` | -20 % pour un minimum de 100 000 FCFA |
| `TECH5000` | -5 000 FCFA pour un minimum de 20 000 FCFA |
| `LIVRAISON` | Livraison offerte |

### Panier

Données stockées côté navigateur :

```text
ithaven_cart
ithaven_location
ithaven_promo
ithaven_promo_category
ithaven_orders
ithaven_wishlist
ithaven_token
ithaven_user
ithaven_session
```

Le serveur reçoit les visites via `POST /api/track/visit` et les mises à jour du panier via `POST /api/track/cart`.

### Relances paniers abandonnés

- Un panier est considéré abandonné après 1 heure sans mise à jour.
- Le serveur lance une vérification toutes les 15 minutes.
- Une relance par session est espacée d’au moins 24 heures.
- Avec SMTP configuré, les e-mails sont envoyés ; sinon les relances sont enregistrées avec le statut `queued`.

## API

### Endpoints publics

```text
GET  /api/health
GET  /api/products/search?q=
GET  /api/products
GET  /api/products/:id
GET  /api/categories/counts
GET  /api/promos
POST /api/auth/register
POST /api/auth/login
POST /api/contact
POST /api/newsletter
POST /api/orders
POST /api/track/visit
POST /api/track/cart
```

### Endpoints admin

Tous nécessitent l’en-tête :

```http
Authorization: Bearer <token>
```

```text
GET    /api/admin/me
GET    /api/admin/dashboard

GET    /api/admin/products
GET    /api/admin/products/:id
POST   /api/admin/products
PUT    /api/admin/products/:id
DELETE /api/admin/products/:id
GET    /api/admin/products/export?format=csv|xlsx
POST   /api/admin/products/import
GET    /api/admin/products/:id/variants
POST   /api/admin/products/:id/variants
PUT    /api/admin/variants/:id
DELETE /api/admin/variants/:id

GET    /api/admin/orders
GET    /api/admin/orders/:id
PATCH  /api/admin/orders/:id/status
GET    /api/admin/orders/:id/invoice
GET    /api/admin/orders/:id/delivery

GET    /api/admin/promos
POST   /api/admin/promos
PUT    /api/admin/promos/:id
DELETE /api/admin/promos/:id
POST   /api/admin/flash-sales
DELETE /api/admin/flash-sales/:id
GET    /api/admin/loyalty
POST   /api/admin/referrals
DELETE /api/admin/referrals/:id
GET    /api/admin/abandoned-carts
POST   /api/admin/abandoned-carts/remind

GET    /api/admin/customers
GET    /api/admin/customers/:id
GET    /api/admin/customers/export?format=csv|xlsx
```

Le token est renvoyé par `/api/auth/login` et stocké dans `localStorage.ithaven_token`.

## Structure du projet

```text
pa/
├── server.js          API Express, auth, commandes, admin, tracking, mail
├── migrate.js         Migration non destructive + seed admin
├── bd.sql             Schéma complet pour installation neuve (destructif)
├── package.json       Dépendances et scripts npm
├── index.html         Page d’accueil
├── shop.html          Boutique
├── promo.html         Promotions
├── categories.html    Catégories
├── produit.html       Fiche produit
├── wishlist.html      Favoris
├── auth.html          Connexion / inscription
├── contact.html       Contact
├── admin.html         Backoffice
├── admin.css          Styles backoffice + impression facture/BL
├── admin.js           Logique backoffice
├── app.js             Navigation mobile, countdown, pages partagées
├── auth.js            Connexion / inscription côté client
├── cart.js            Panier, localisation, promos, confirmation
├── catalog.js         Données de secours et helpers
├── search.js          Recherche header
├── res.js             Ressources partagées
├── style.css          Styles principaux
├── responsive.css     Responsive mobile
├── cart.css           Styles panier
└── img/               Images produits et logo
```

## Vérification rapide

```bash
npm run check
npm run migrate
npm start
```

Puis tester :

```text
http://localhost:3000/api/health
http://localhost:3000/admin.html
```

Résultat attendu pour `/api/health` : `{ "ok": true, ... }`.

## Dépannage

| Symptôme | Solution |
| --- | --- |
| `ECONNREFUSED` MySQL | Vérifier MySQL et les variables `DB_*` dans `.env` |
| `Access denied for user` | Vérifier `DB_USER` / `DB_PASSWORD` |
| Admin redirigé vers `auth.html` | Token expiré ou mauvais identifiants ; se reconnecter |
| `401` sur `/api/admin/*` | En-tête `Authorization: Bearer <token>` absent/invalide |
|produits absents | Lancer `npm run migrate` puis recharger la page |
| Relances non envoyées | Configurer `SMTP_*` et `MAIL_FROM` ; sinon elles restent en file d’attente |
| Port déjà utilisé | Changer `PORT` dans `.env` |
