# Déploiement gratuit sans carte : Render + TiDB Cloud

Oracle exige une carte, Waifly est souvent complet. Cette solution fonctionne avec **aucune carte bancaire** :

- **Render** : serveur Node.js gratuit (se réveille après ~1 min d’inactivité).
- **TiDB Cloud Starter** : base MySQL-compatible gratuite, 5 Go de données, sans carte.

Le code utilise déjà `mysql2` : il suffit d’ajouter les variables `DB_SSL`, `DB_SSL_CA` et les identifiants TiDB.

## 1. Base de données TiDB

1. Va sur https://tidbcloud.com et crée un compte avec ton email.
2. Sur **My TiDB**, clique sur **Create Resource**.
3. Choisis **Starter** → compatibilité **MySQL Compatible**.
4. Laisse le spending limit à **0** (aucune carte demandée).
5. Choisis une région, puis **Create**. Si une instance `Instance0` existe déjà, utilise-la.
6. Ouvre l’instance → **Connect** et note : host, port, user, password.
7. Dans **SQL Editor**, exécute :

```sql
CREATE DATABASE IF NOT EXISTS ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

8. Télécharge le certificat CA si proposé, puis convertis-le en une seule ligne pour la variable `DB_SSL_CA` :

```powershell
$ca = (Get-Content "ca.pem" -Raw) -replace "`r`n", "\n" -replace "`n", "\n"
$ca
```

Copie la ligne affichée. Si tu veux aller plus vite, laisse `DB_SSL_CA` vide et mets seulement `DB_SSL=1`.

## 2. Mettre le projet sur GitHub

Depuis `C:\Users\jeffs\Desktop\pa` :

```powershell
git add .
git commit -m "Prepare free deployment"
$repo = "https://github.com/<TON_COMPTE>/ithaven.git"
git remote add origin $repo
git branch -M main
git push -u origin main
```

Crée d’abord le dépôt privé `ithaven` sur GitHub si nécessaire. Le `.env` local n’est pas poussé car il est dans `.gitignore`.

## 3. Serveur Render

1. Va sur https://dashboard.render.com/register et crée un compte sans carte.
2. **New** → **Web Service** → connecte le dépôt GitHub `ithaven`.
3. Paramètres :
   - Name : `ithaven`
   - Runtime : `Node`
   - Branch : `main`
   - Instance type : **Free**
   - Build command : `npm install`
   - Start command : `npm run bootstrap && npm run migrate && npm start`
4. Dans **Environment Variables**, ajoute :

```text
DB_HOST=<host TiDB>
DB_PORT=4000
DB_USER=<user TiDB>
DB_PASSWORD=<mot de passe TiDB>
DB_NAME=ecommerce
DB_SSL=1
DB_SSL_CA=<certificat CA sur une ligne, ou vide>

JWT_SECRET=<cle longue et aleatoire>
ADMIN_EMAIL=admin@ithaven.tg
ADMIN_PASSWORD=<mot de passe admin choisi>

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
```

Ne définis pas `PORT` : Render le fournit automatiquement.

Pour générer `JWT_SECRET` :

```powershell
[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
```

5. Clique sur **Create Web Service**.

## 4. Vérifier

Attends la fin du déploiement, puis ouvre l’URL fournie par Render :

```text
https://ithaven.onrender.com/api/health
https://ithaven.onrender.com/admin.html
```

Réponse attendue : `{"ok":true}`.

Connecte-toi à `/admin.html` avec `admin@ithaven.tg` et ton `ADMIN_PASSWORD`.

## Dépannage

| Erreur | Solution |
| --- | --- |
| `Access denied` | Vérifie `DB_USER` / `DB_PASSWORD` TiDB |
| `Unknown database` | Vérifie `DB_NAME=ecommerce` et l’exécution du `CREATE DATABASE` |
| `SSL connection error` | Vérifie `DB_SSL=1` et le contenu de `DB_SSL_CA` |
| `Table 'users' doesn't exist` | Vérifie que `npm run bootstrap` apparaît dans la commande de démarrage |
| Page lente au premier clic | Render réveille le service gratuit après ~1 min |
| `401` sur `/api/admin/*` | Reconnecte-toi pour obtenir un nouveau token |

## Mises à jour

Pousse tes modifications sur GitHub :

```powershell
git add .
git commit -m "Update site"
git push
```

Render redéploie automatiquement. `bootstrap-db.js` ignore l’import si la base existe déjà. Attention : `npm run migrate` réinitialise le mot de passe admin à la valeur de `ADMIN_PASSWORD`.
