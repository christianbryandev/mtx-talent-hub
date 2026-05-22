I identified that the journey system is split between two architectures: a legacy per-user system (System A using `journey_phases`) and a modern global catalog system (System B using `journey_phase_catalog`). The reported sync bug occurs because several key areas (Dashboard, Profile, and Badges) still rely on hardcoded labels or the legacy table, ignoring edits made to the official catalog.

### Technical Analysis
1.  **Hardcoded Fallbacks**: `src/types/index.ts` contains `TRAIL_PHASE_LABELS` which are used in `ColaboradorDashboard` and `MeuPerfil`. These do not reflect database changes.
2.  **Legacy Table**: `journey_phases` is still being queried in the Dashboard, while the Admin edits `journey_phase_catalog`.
3.  **Source of Truth**: The `get_user_journey()` RPC is already correctly joining with the catalog, but its data is only used in the `/jornada` route, leaving other areas of the app "stale".

### Implementation Plan

#### 1. Database Refinement (Migration)
*   Ensure `journey_phase_catalog` and `user_phase_status` are the primary tables.
*   Update `get_user_journey` to be more resilient and ensure it's the latest version (System B).
*   Add a helper function `get_catalog_phases()` to easily fetch metadata for badges and summaries.

#### 2. Service & Hooks Update
*   Update `journeyService.ts` to include a method for fetching phase metadata.
*   Create a new hook `usePhaseMetadata` to provide catalog titles/descriptions globally, preventing hardcoded lookups.

#### 3. Frontend Consolidation (SSOT)
*   **`src/routes/_authenticated/meu-perfil.tsx`**: Replace hardcoded `TRAIL_PHASE_LABELS` and `PHASE_MESSAGES` with dynamic data from the journey catalog.
*   **`src/components/dashboard/ColaboradorDashboard.tsx`**: Update the progress overview to use the `useJourney` hook (RPC-based) instead of the legacy `journey_phases` table.
*   **`src/components/jovens/PhaseBadge.tsx`**: Update to accept an optional `label` or use a dynamic lookup to reflect catalog edits.
*   **`src/routes/_authenticated/jornada.tsx`**: Refine to ensure it never falls back to static strings for phase names/descriptions.

#### 4. Cleanup
*   Deprecate `TRAIL_PHASE_LABELS` in `src/types/index.ts` to prevent future hardcoding bugs.

This will ensure that a single edit in the Admin Journey Catalog immediately propagates to the young person's dashboard, profile, and journey track.

### Files to be modified:
- `supabase/migrations/<timestamp>_fix_journey_ssot.sql` (New)
- `src/services/journeyService.ts`
- `src/hooks/useJourney.ts`
- `src/routes/_authenticated/meu-perfil.tsx`
- `src/components/dashboard/ColaboradorDashboard.tsx`
- `src/components/jovens/PhaseBadge.tsx`
- `src/types/index.ts`
