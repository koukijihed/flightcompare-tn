# FlightCompare TN

Comparateur de vols pour la Tunisie : agrégation d'offres multi-fournisseurs, comparaison, alertes de prix, favoris et espace d'administration. Interface trilingue (français, anglais, arabe) avec support RTL.

> **Aucune offre n'est inventée.** Le site affiche des offres réelles fournies par Travelpayouts (Aviasales) ou Amadeus. Sans identifiants fournisseur, la recherche retourne un message explicite au lieu d'offres fictives. Le mode démonstration est désactivé par défaut et ne s'active que si vous le demandez (`DEMO_MODE=true`).

## Stack

- Next.js 16 (App Router, Turbopack) + React 19
- TypeScript strict
- Tailwind CSS 4
- Prisma 6 + PostgreSQL 16 (Docker Compose)
- next-intl (fr / en / ar)
- Authentification par session cookie signée (`jose`) et mots de passe `bcrypt`
- Vitest (tests unitaires) et Playwright (tests e2e)

## Démarrage

### 1. Prérequis

- Node.js 20.9+ (22 recommandé)
- Docker Desktop (ou une instance PostgreSQL accessible)

### 2. Installation

```bash
npm install
cp .env.example .env
```

Générez un secret de session et renseignez-le dans `.env` :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Base de données

```bash
docker compose up -d
npm run db:deploy   # applique les migrations
npm run db:seed     # données de référence + comptes de test
```

Le port hôte par défaut est **5433** (pour ne pas entrer en conflit avec un PostgreSQL natif sur 5432). Modifiez `POSTGRES_PORT` et `DATABASE_URL` si nécessaire.

### 4. Lancer l'application

```bash
npm run dev
```

Ouvrir <http://localhost:3000> (redirection automatique vers `/fr`).

### Comptes créés par le seed

| Rôle  | E-mail                      | Mot de passe  |
| ----- | --------------------------- | ------------- |
| Admin | `admin@flightcompare.tn`    | `Admin@12345` |
| User  | `user@flightcompare.tn`     | `User@12345`  |

Changez ces mots de passe avant toute mise en production (`SEED_ADMIN_PASSWORD` / `SEED_USER_PASSWORD`).

## Scripts

| Commande              | Description                                      |
| --------------------- | ------------------------------------------------ |
| `npm run dev`         | Serveur de développement                         |
| `npm run build`       | Build de production (typecheck inclus)           |
| `npm run start`       | Serveur de production (après `build`)            |
| `npm run lint`        | ESLint (config Next.js core-web-vitals + TS)     |
| `npm run typecheck`   | `tsc --noEmit`                                   |
| `npm test`            | Tests unitaires Vitest                           |
| `npm run test:e2e`    | Tests Playwright (démarre `npm run dev`)         |
| `npm run i18n:audit`  | Vérifie que toutes les clés de traduction existent |
| `npm run db:migrate`  | Crée/applique une migration en développement     |
| `npm run db:deploy`   | Applique les migrations en production            |
| `npm run db:seed`     | Crée les données de référence et les comptes |
| `npm run db:studio`   | Prisma Studio                                    |
| `npm run monitor:prices` | Vérifie les alertes de prix                   |

## Mise en production

### 1. Fournisseur de vols (obligatoire pour des offres réelles)

**Travelpayouts / Aviasales** (recommandé, gratuit) :

1. Créez un compte affilié sur <https://travelpayouts.com/>.
2. Récupérez le **token API** et le **marker** affilié dans votre compte.
3. Demandez l'accès à l'**API Flights Search** (temps réel) :
   <https://support.travelpayouts.com/hc/en-us/requests/new>. L'API Data (prix en cache) fonctionne immédiatement et alimente les alertes de prix.
4. Renseignez `TRAVELPAYOUTS_TOKEN`, `TRAVELPAYOUTS_MARKER`, `APP_URL` (domaine public) puis redémarrez.

> `APP_URL` sert aussi de base aux liens de réinitialisation, aux liens d'alerte et à `robots.txt` / `sitemap.xml` (générés au build). Définissez-le également dans l'environnement de build, pas seulement à l'exécution.

Le bouton « Réserver » passe par `/api/booking/travelpayouts`, qui demande le lien affilié **au moment du clic** (exigence Travelpayouts). Les liens expirent après 15 minutes ; en cas d'expiration, l'utilisateur est invité à relancer la recherche.

> Travelpayouts interdit les recherches depuis `localhost` et exige un `user_ip` public. Pour tester en local, déployez sur un domaine public ou renseignez `TRAVELPAYOUTS_USER_IP` avec votre IP publique.

**Amadeus** (alternative) : renseignez `AMADEUS_CLIENT_ID` et `AMADEUS_CLIENT_SECRET`. Les prix du sandbox ne sont pas réservables ; utilisez l'environnement de production pour des tarifs réels.

### 2. E-mails transactionnels (Resend)

1. Créez une clé sur <https://resend.com/api-keys>.
2. Vérifiez votre domaine d'envoi.
3. Renseignez `RESEND_API_KEY` et `EMAIL_FROM` (ex. `FlightCompare TN <noreply@votre-domaine.tn>`).

Sans clé Resend, la réinitialisation de mot de passe affiche le lien uniquement en développement ; en production, aucun secret n'est renvoyé au navigateur. Les alertes de prix restent visibles dans le tableau de bord.

### 3. Monitoring planifié

Protégez l'endpoint avec `CRON_SECRET` :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://votre-domaine.tn/api/cron/monitor
```

`vercel.json` planifie l'appel quotidien à 06:00 UTC. Sur un autre hébergeur, utilisez cron, Windows Task Scheduler ou `npm run monitor:prices`.

### 4. Base de données et build

```bash
npm run db:deploy
npm run db:seed
npm run build
npm run start
```

## Configuration des fournisseurs

- **Travelpayouts** : `TRAVELPAYOUTS_TOKEN`, `TRAVELPAYOUTS_MARKER`, `TRAVELPAYOUTS_HOST` (optionnel, dérivé de `APP_URL`). Les recherches temps réel nécessitent l'approbation de l'API Flights Search.
- **Amadeus** : `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET`.
- **Skyscanner** : nécessite un accès partenaire commercial ; aucun appel sans contrat.
- **Mode démo** : `DEMO_MODE=true` uniquement pour le développement. Jamais en production.
- **Devise** : taux statiques en base par défaut ; `EXCHANGE_RATE_API_URL` permet d'utiliser un flux externe.
- **IA** : optionnelle. Sans `AI_API_KEY`, un analyseur déterministe prend le relais.

## Structure

```
src/
  app/[locale]/          Pages App Router (public, dashboard, admin)
  app/api/               Routes API (auth, vols, favoris, alertes, admin…)
  components/            UI, recherche, dashboard, administration
  i18n/                  Messages fr/en/ar et configuration next-intl
  lib/                   Utilitaires, Prisma, validation, sécurité
  modules/               Logique métier (vols, fournisseurs, AI, comparaison)
prisma/                  Schéma, migrations, seed
e2e/                     Tests Playwright
scripts/                 Audit i18n et monitoring des prix
```

## Tests

```bash
npm test          # unitaires
npm run test:e2e  # Playwright, installe les navigateurs si besoin :
                  # npx playwright install chromium
```

## Sécurité

- Sessions HTTP-only signées, contrôle d'origine sur les routes mutantes, rate limiting sur la connexion.
- Mots de passe hachés avec bcrypt, messages d'erreur non énumérants.
- En-têtes CSP, HSTS (production), `X-Frame-Options`, `Referrer-Policy`.
- Les pages `/dashboard` et `/admin` vérifient l'utilisateur côté serveur ; `/admin` exige le rôle `ADMIN`.
- Les pages de résultats (`/search`, `/compare`, `/flights`) sont exclues de l'indexation via `robots.txt`.
- Le rate limiting est en mémoire : pour un déploiement multi-instances, remplacez-le par Redis/Upstash (`src/lib/security/rate-limit.ts`).

## Limites connues

- Sans identifiants fournisseur, aucune offre réelle n'est affichée : la recherche renvoie un message explicite. N'activez `DEMO_MODE=true` que pour le développement.
- Les alertes de prix sont vérifiées par lots (`/api/cron/monitor` protégé par `CRON_SECRET`, ou `/api/admin/monitor`). Ce n'est pas un service continu.
- Travelpayouts n'autorise pas les recherches automatisées : le monitoring utilise l'API Data (prix en cache), pas l'API Search.
- Les taux de change statiques sont indicatifs.
