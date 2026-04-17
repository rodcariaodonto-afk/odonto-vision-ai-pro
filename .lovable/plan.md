
The user is providing a SQL migration to fix the build errors. The errors are:
1. `analyze-exam/index.ts` — duplicate `isValidImageType` function (unrelated to this SQL, pre-existing)
2. `odonto-chat/index.ts` — `getClaims` doesn't exist (pre-existing)
3. `Upload.tsx` — `reviewer_flags` and `case_feedback` table missing → fixed by this SQL

## Plan

**1. Run the migration** (creates `case_feedback` table + adds `reviewer_flags`, `review_score`, `reviewer_analysis`, `patient_folder` to `cases`). This regenerates `types.ts` and resolves the Upload.tsx errors.

**2. Fix `analyze-exam/index.ts`** — remove the duplicate `isValidImageType` function (keep one definition).

**3. Fix `odonto-chat/index.ts`** — replace `supabaseClient.auth.getClaims(token)` with `supabaseClient.auth.getUser(token)` (standard Supabase JS API).

These 3 fixes will clear all build errors.
