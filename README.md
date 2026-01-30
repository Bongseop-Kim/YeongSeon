## Supabase Workflow (Branch/CI/CD)

- **Branch policy (Git)**:
  - `main` = production, protected.
  - Feature branches must include migrations and function changes together.
  - No direct pushes to `main`; merge via PR only.
- **Supabase Branches policy (optional)**:
  - Use preview branches for PR validation only.
  - Never hotfix directly on preview; always change source in Git.
- **CI/CD policy**:
  - On PR: run lint/tests + `supabase db diff` (ensure no untracked schema drift).
  - On merge to `main`: `supabase db push` then `supabase functions deploy`.
  - Manual approval gate for production deploys if required.
- **Deploy rules**:
  - DB migrations deploy before functions that depend on them.
  - Rollback plan: revert commit + new forward migration (no destructive rollback in prod).
