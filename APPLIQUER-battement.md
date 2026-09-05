## Battement Supabase — à configurer APRÈS le push

Le workflow `.github/workflows/battement-supabase.yml` empêche la mise en pause
automatique. Il a besoin de deux secrets GitHub.

Dans **GitHub → ton dépôt → Settings → Secrets and variables → Actions →
New repository secret**, ajoute :

| Nom | Où le trouver |
|---|---|
| `SUPABASE_URL` | Dashboard Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | même page → `service_role` (clé secrète) |

⚠️ La clé `service_role` contourne les RLS. Elle ne doit JAMAIS apparaître dans
le code ni dans une variable d'environnement Vercel exposée au navigateur.
Uniquement dans les secrets GitHub.

Ensuite : onglet **Actions** → « Battement Supabase » → **Run workflow** pour
vérifier tout de suite qu'il passe au vert.

Le droit d'exécution sur `purge_old_activity_logs()` est déjà accordé au rôle
`service_role` en base — rien à faire de ce côté.
