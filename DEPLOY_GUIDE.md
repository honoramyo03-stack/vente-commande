# 🚀 Guide de déploiement QuickOrder sur Vercel

## Prérequis
- Compte GitHub (gratuit)
- Compte Vercel (gratuit)

## Option 1 : Déploiement rapide via GitHub

### Étape 1 : Créer un dépôt GitHub

1. Allez sur [GitHub.com](https://github.com)
2. Cliquez sur **"+ New repository"**
3. Nommez-le `quickorder-app`
4. Cliquez **"Create repository"** (sans fichier README)

### Étape 2 : Préparer les fichiers localement

Dans votre dossier de projet, supprimez les fichiers non nécessaires au déploiement :

```
Gardez ces fichiers :
✓ package.json
✓ vite.config.ts
✓ tsconfig.json
✓ index.html
✓ tailwind.config.js
✓ postcss.config.js
✓ src/ (tout le dossier)
✓ dist/ (généré previously)
✓ vercel.json
✓ vercel.config.json
```

### Étape 3 : Uploader sur GitHub

**Via Git Bash (recommandé) :**
```bash
cd votre-dossier-quickorder
git init
git add .
git commit -m "First commit"
git branch -M main
git remote add origin https://github.com/VOTRE-NOM/quickorder-app.git
git push -u origin main
```

**OU via GitHub Desktop :**
1. Téléchargez GitHub Desktop
2. Ajoutez votre dossier local
3. Cliquez sur "Publish"

### Étape 4 : Connecter à Vercel

1. Allez sur [Vercel.com](https://vercel.com)
2. Cliquez sur **"+ New Project"**
3. Importez votre dépôt GitHub `quickorder-app`
4. Cliquez **"Deploy"**

✅ **Votre site sera en ligne !**

---

## Option 2 : Déploiement via Vercel CLI

### Installation
```bash
npm install -g vercel
vercel login
```

### Déploiement
```bash
cd votre-dossier-quickorder
vercel
```

Suivez les instructions à l'écran :
- Set up and deploy? → **Yes**
- Which scope? → Votre compte
- Link to existing project? → **No**
- Project Name: → `quickorder-app`
- Directory? → `./`
- Want to modify settings? → **No**

---

## 🌐 URL de votre site

Une fois déployé, vous recevrez une URL comme :
```
https://quickorder-app.vercel.app
```

Ou votre propre domaine personnalisé.

---

## 🔧 Configuration Supabase

N'oubliez pas que votre application utilise Supabase. Assurez-vous que :
1. Les clés API dans `src/lib/supabase.ts` sont correctes
2. Les tables existent dans votre projet Supabase
3. Les politiques RLS sont configurées

---

## ✅ Vérification du déploiement

Après le déploiement, testez :
1. **Sur mobile** : Ouvrez l'URL sur votre téléphone
2. **Multi-utilisateur** : Testez sur 2 appareils différents
3. **Synchronisation** : Vérifiez que les données sont partagées

---

## 📝 Notes importantes

- Le site est **accessible depuis n'importe où** (4G, WiFi, autre pays)
- **HTTPS** est automatiquement activé par Vercel
- Les **données Supabase** sont stockées séparément (pas sur Vercel)

---

## 💬 Besoin d'aide ?

Si vous avez des problèmes lors du déploiement, vérifiez :
1. Les erreurs dans le dashboard Vercel
2. Les logs de build
3. La configuration dans `vercel.json`

Bon déploiement ! 🎉