# Déploiement gratuit d’IT Haven

> Oracle demande une carte bancaire. Si ta carte ne peut pas valider la micro-autorisation, utilise [DEPLOY-RENDER.md](DEPLOY-RENDER.md), qui fonctionne sans carte.

Le projet utilise Node.js + MySQL en permanence. Les offres gratuites classiques ne conviennent pas : Render fait dormir les services et sa base Postgres gratuite expire, et le MySQL gratuit d’Aiven est supprimé. La solution gratuite durable retenue est une VM **Oracle Cloud Always Free** (Ubuntu 24.04, Ampere A1 : 2 OCPU / 12 Go RAM) avec MySQL installé dessus.

Oracle demande une carte bancaire pour vérifier l’identité, mais les ressources **Always Free** restent à 0 € tant qu’on respecte les quotas. Choisis bien ta région d’origine lors de l’inscription : elle n’est pas modifiable ensuite.

## 1. Créer le serveur

1. Crée un compte sur https://www.oracle.com/cloud/free/.
2. Dans la console : **Compute → Instances → Create instance**.
3. Paramètres :
   - Nom : `ithaven`
   - Image : **Ubuntu 24.04**
   - Shape : **VM.Standard.A1.Flex**, 2 OCPU et 12 Go de RAM
   - Volume de démarrage : 50 Go
   - Clé SSH : génère-en une nouvelle ou colle ta clé publique
4. Dans la sécurité réseau du VCN, ajoute des règles entrantes TCP **80** et **443** depuis `0.0.0.0/0` (le port 22 est déjà présent).
5. Note l’adresse IP publique de la VM. Si Oracle affiche `Out of host capacity`, réessaie dans un autre domaine de disponibilité ou plus tard.

Générer la clé SSH sur Windows :

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\ithaven_oci" -N ""
Get-Content "$env:USERPROFILE\.ssh\ithaven_oci.pub"
```

Colle le contenu affiché dans Oracle lors de la création de l’instance.

## 2. Envoyer le projet

Depuis `C:\Users\jeffs\Desktop\pa`, remplace `IP` par l’adresse de la VM :

```powershell
$items = (Get-ChildItem -Force | Where-Object { $_.Name -notin @('node_modules', '.git', '.env', 'ithaven.zip') }).FullName
Compress-Archive -Path $items -DestinationPath ithaven.zip -Force
scp -i "$env:USERPROFILE\.ssh\ithaven_oci" ithaven.zip ubuntu@IP:/tmp/ithaven.zip
ssh -i "$env:USERPROFILE\.ssh\ithaven_oci" ubuntu@IP "sudo mkdir -p /opt/ithaven && sudo unzip -o /tmp/ithaven.zip -d /opt/ithaven"
```

Le `.env` local n’est pas envoyé : le serveur en génère un nouveau avec des secrets aléatoires.

## 3. Installer automatiquement

Sans domaine (accès par IP) :

```bash
sudo bash /opt/ithaven/deploy/setup-ubuntu.sh /opt/ithaven
```

Avec un domaine `exemple.com` :

```bash
sudo bash /opt/ithaven/deploy/setup-ubuntu.sh /opt/ithaven exemple.com
```

Le script :
- installe Node.js, MySQL, Nginx et Certbot ;
- crée la base `ecommerce` et l’utilisateur MySQL `ithaven` ;
- importe `bd.sql` uniquement si la base est vide ;
- génère `.env`, `JWT_SECRET` et un mot de passe admin aléatoire ;
- lance `npm install` et `npm run migrate` ;
- démarre le service systemd `ithaven` et Nginx.

À la fin, note les identifiants affichés. Le mot de passe admin affiché est celui à utiliser sur `/admin.html`.

## 4. Activer HTTPS

Crée un enregistrement A chez ton registrar pointant vers l’IP publique (et un CNAME `www` vers `exemple.com`), puis sur le serveur :

```bash
sudo certbot --nginx -d exemple.com -d www.exemple.com -m ton-email@exemple.com --agree-tos --non-interactive
```

## 5. Vérifier

```text
http://IP/api/health
https://exemple.com/api/health
https://exemple.com/admin.html
```

Réponse attendue pour `/api/health` : `{"ok":true}`.

## Commandes utiles

```bash
sudo systemctl status ithaven
sudo systemctl restart ithaven
sudo journalctl -u ithaven -f
sudo systemctl status mysql
```

## Mettre à jour le site

Depuis Windows, renvoie le zip puis :

```powershell
scp -i "$env:USERPROFILE\.ssh\ithaven_oci" ithaven.zip ubuntu@IP:/tmp/ithaven.zip
ssh -i "$env:USERPROFILE\.ssh\ithaven_oci" ubuntu@IP "sudo unzip -o /tmp/ithaven.zip -d /opt/ithaven && sudo chown -R www-data:www-data /opt/ithaven && sudo systemctl restart ithaven"
```

Si de nouvelles migrations sont ajoutées, exécute aussi :

```bash
cd /opt/ithaven && sudo -u www-data npm run migrate && sudo systemctl restart ithaven
```

Attention : `npm run migrate` réinitialise le mot de passe du compte admin à `ADMIN_PASSWORD` présent dans `.env`.

## Sauvegardes

Oracle inclut jusqu’à 5 sauvegardes de volume gratuites. Pour une sauvegarde SQL manuelle :

```bash
sudo mysqldump ecommerce | gzip > /opt/backup-ecommerce-$(date +%F).sql.gz
```
