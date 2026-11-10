# StockFlow — Logiciel de gestion de stock

Next.js (App Router) + Prisma + PostgreSQL + NextAuth.

## 🚀 Installation

### 1. Prérequis
- Node.js 18+
- Une base PostgreSQL (locale ou hébergée : Supabase, Neon, Railway...)

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer les variables d'environnement
Copie `.env.example` en `.env` et renseigne :
```bash
cp .env.example .env
```
- `DATABASE_URL` : ton URL de connexion PostgreSQL
- `AUTH_SECRET` : génère-en une avec `openssl rand -base64 32`

### 4. Créer les tables en base
```bash
npx prisma db push
```

### 5. Charger les données de démo
```bash
npm run db:seed
```
Cela crée 4 comptes de test (mot de passe : `password123`) :
| Email | Rôle |
|---|---|
| admin@stockflow.fr | Admin |
| gestionnaire@stockflow.fr | Gestionnaire |
| magasinier@stockflow.fr | Magasinier |
| auditeur@stockflow.fr | Auditeur |

### 6. Lancer le serveur de développement
```bash
npm run dev
```
Ouvre [http://localhost:3000](http://localhost:3000)

---

## 📁 Structure du projet

```
app/
├── login/                  # Page de connexion
├── (dashboard)/            # Groupe de routes protégées
│   ├── layout.tsx          # Sidebar + Topbar + vérification de session
│   ├── dashboard/          # KPIs, graphique, alertes
│   ├── stock/              # Liste, historique, entrée/sortie, transfert, inventaire
│   ├── produits/           # Catalogue + catégories
│   ├── fournisseurs/
│   ├── entrepots/
│   ├── rapports/
│   ├── utilisateurs/       # Gestion des comptes + rôles
│   ├── logs/                # Traçabilité (lecture seule)
│   └── parametres/         # Config entreprise
├── api/auth/[...nextauth]/ # Route NextAuth
lib/
├── prisma.ts               # Client Prisma singleton
├── auth.ts                 # Config NextAuth (Credentials + rôles)
└── permissions.ts          # Matrice des permissions par rôle
components/                 # Composants d'affichage (client components)
prisma/
├── schema.prisma           # Modèle de données complet
└── seed.ts                 # Données de démo
middleware.ts                # Protection des routes selon le rôle
```

## 🔑 Gestion des rôles

Les permissions sont centralisées dans `lib/permissions.ts`. Pour changer ce qu'un rôle peut faire, il suffit de modifier la matrice `MATRIX` dans ce fichier — le reste de l'app (menu, boutons, routes) s'adapte automatiquement.

| Module | Admin | Gestionnaire | Magasinier | Auditeur |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Stock (lecture) | ✅ | ✅ | ✅ | ✅ |
| Stock (entrée/sortie/transfert) | ✅ | ✅ | ✅ | ❌ |
| Inventaire | ✅ | ✅ | ❌ | ❌ |
| Produits (modification) | ✅ | ✅ | ❌ | ❌ |
| Fournisseurs | ✅ | ✅ | ❌ | ❌ |
| Entrepôts | ✅ | ✅ | ❌ | ❌ |
| Rapports | ✅ | ✅ | ❌ | ✅ |
| Utilisateurs | ✅ | ❌ | ❌ | ❌ |
| Logs | ✅ | ❌ | ❌ | ✅ |
| Paramètres | ✅ | ❌ | ❌ | ❌ |

## 🛠️ Commandes utiles

```bash
npm run db:studio   # Interface graphique pour explorer la base (Prisma Studio)
npm run db:push     # Synchronise le schéma Prisma avec la base
npm run db:seed     # Recharge les données de démo
npm run build        # Build de production
```

## 📌 Prochaines étapes suggérées
- Ajouter l'upload d'image produit / logo entreprise (ex: UploadThing, S3)
- Ajouter l'export CSV/PDF réel des rapports
- Ajouter la pagination sur les grandes listes (mouvements, logs)
- Ajouter des tests (Vitest / Playwright)
- Déployer sur Vercel + une base PostgreSQL managée (Neon, Supabase, Railway)
