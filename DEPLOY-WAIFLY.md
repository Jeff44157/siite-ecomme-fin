# Déploiement gratuit sur Waifly (sans carte bancaire)

> Le plan gratuit Waifly est souvent complet. Si tu vois « All our free servers are currently full », utilise [DEPLOY-RENDER.md](DEPLOY-RENDER.md) à la place.

Oracle Cloud exige une micro-autorisation de 0,63 € ; si ta carte ne peut pas la valider, on change d’hébergeur. Waifly propose un serveur Node.js **24/7**, une base MySQL et **aucune carte bancaire** : 300 Mo RAM, 1 Go de disque, 30 % d’un CPU. Le projet fait ~16 Mo hors `node_modules`, donc il entre dans le plan gratuit.

Le compte `dash.waifly.com` et le compte `panel.waifly.com` sont distincts : tu auras deux mots de passe.

## 1. Créer le compte

1. Va sur https://dash.waifly.com.
2. Inscris-toi avec un nom d’utilisateur, ton email et un mot de passe.
3. Confirme ton email si demandé.

## 2. Créer le serveur

1. Onglet **Servers** → **Create**.
2. Nom : `ithaven`.
3. Egg : **NodeJS**.
4. Localisation : **FR2 Paris** (FR1 si disponible).
5. Laisse les ressources du plan gratuit.
6. Clique sur Create, puis ouvre la fiche du serveur pour récupérer son URL/panel.

## 3. Préparer la base MySQL

1. Ouvre le lien du serveur vers `panel.waifly.com`. Si tu n’as pas le mot de passe panel : dashboard → **Account** → **Reset Panel Password**.
2. Dans le panel : **Databases** → **Create Database**.
3. Note précisément : host, port, utilisateur, mot de passe et nom de la base.

## 4. Variables d’environnement

Dans **Startup** → **Variables d’environnement**, ajoute/modifie :

```text
PORT=3000
DB_HOST=<host fourni par Waifly>
DB_PORT=<port fourni par Waifly>
DB_USER=<utilisateur fourni par Waifly>
DB_PASSWORD=<mot de passe fourni par Waifly>
DB_NAME=<nom de base fourni par Waifly>
JWT_SECRET=<cle longue et aleatoire>
ADMIN_EMAIL=admin@ithaven.tg
ADMIN_PASSWORD=<mot de passe admin choisi>
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
```

Pour générer `JWT_SECRET` sur Windows :

```powershell
[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
```

Ne remplace pas la variable `PORT` si l’egg Waifly en fournit déjà une : utilise sa valeur.

## 5. Commande de démarrage

Toujours dans **Startup**, replace la commande par :

```bash
npm install --omit=dev && npm run bootstrap && npm run migrate && node server.js
```

`bootstrap` importe `bd.sql` uniquement si la base est vide. `migrate` prépare les tables supplémentaires et le compte admin.

## 6. Envoyer les fichiers

Depuis `C:\Users\jeffs\Desktop\pa`, prépare l’archive sans `node_modules`, `.git` ni `.env` local :

```powershell
$items = (Get-ChildItem -Force | Where-Object { $_.Name -notin @('node_modules', '.git', '.env', 'ithaven.zip') }).FullName
Compress-Archive -Path $items -DestinationPath ithaven.zip -Force
```

Dans le panel Waifly : **Files** → upload `ithaven.zip` → décompresse à la racine. La racine doit contenir `server.js`, `package.json`, `bd.sql` et le dossier `deploy`.

Tu peux aussi utiliser SFTP avec les identifiants indiqués dans l’onglet **SFTP** du panel.

## 7. Démarrer et vérifier

Clique sur **Start**. La console doit afficher dans cet ordre :

```text
Schéma bd.sql importé.
Migration terminée : base prête pour la boutique et le backoffice admin.
Serveur IT Haven lancé sur http://localhost:3000
```

Puis ouvre l’URL publique du serveur :

```text
/<ton-url>/api/health
/<ton-url>/admin.html
```

Réponse attendue pour `/api/health` : `{"ok":true}`.

Connecte-toi à `/admin.html` avec `admin@ithaven.tg` et le `ADMIN_PASSWORD` défini à l’étape 4.

## Dépannage

| Erreur | Solution |
| --- | --- |
| `ER_ACCESS_DENIED_ERROR` | Vérifie `DB_USER` / `DB_PASSWORD` dans Startup |
| `ER_BAD_DB_ERROR` | Vérifie `DB_NAME` et que la base existe dans le panel |
| `EADDRINUSE` | Utilise exactement le `PORT` attendu par l’egg Waifly |
| `Cannot find module` | Vérifie que `package.json` est bien à la racine et que `npm install` s’affiche dans la console |
| `Table 'users' doesn't exist` | Vérifie que `bd.sql` et `deploy/bootstrap-db.js` sont présents |
| Serveur suspendu | Waifly suspend un serveur resté éteint 3 jours ; redémarre-le depuis le panel |

## Mises à jour

Remplace les fichiers dans le panel, puis clique sur **Restart**. L’import `bd.sql` sera ignoré car la base contient déjà des tables. Attention : chaque `npm run migrate` réinitialise le mot de passe admin à la valeur de `ADMIN_PASSWORD`.
