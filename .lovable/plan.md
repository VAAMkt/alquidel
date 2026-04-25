## Plan

1. Stabilize the authentication bootstrap
- Add a single auth-readiness layer so the app waits for session restoration before rendering protected admin content or firing protected queries.
- Update the `/admin` layout to show a controlled loading state while auth is resolving, redirect unauthenticated users to `/login`, and stop rendering the admin shell prematurely.
- Keep the login redirect flow consistent: unauthenticated `/admin` requests go to `/login?redirect=...`, and successful login lands on the requested admin page or `/admin/dashboard`.

2. Remove the fragile admin-status dependency that is breaking the shell
- Stop relying on `getAdminStatus` inside the sidebar/render path, since that transformed server-function export is the direct source of the current module crash.
- Replace the sidebar and admin-role checks with a client-safe role query against the backend, gated by auth readiness and existing RLS.
- Keep privileged team actions on the server, but isolate them so a broken admin-check import cannot take down the whole dashboard.

3. Harden route and module permissions
- Apply a clear role model across admin routes:
  - `/admin/*` requires authenticated staff
  - `/admin/equipo` requires admin
- Prevent dashboard and module queries from running until the user is authenticated and authorized.
- For unauthorized users, show a controlled access-denied state or redirect instead of letting queries fail into the global error boundary.

4. Make admin pages fail safely instead of blanking out
- Add route-level error handling for the admin area so one bad query/import does not collapse the whole panel.
- Guard sidebar badges, dashboard stats, and module data loads with `enabled` conditions tied to auth + role state.
- Remove any remaining direct dependencies on unstable exports from `src/server/team.functions.ts` in always-rendered components.

5. Verify backend permissions match the UI flow
- Re-check the current RLS setup for `user_roles`, `agents`, `leads`, `properties`, and `property_alerts`.
- Use the existing policies where possible rather than changing schema unnecessarily: the current role table and access rules are mostly correct, but the frontend is consuming them unsafely.
- Only introduce a migration if I find a real policy gap during implementation.

6. End-to-end verification
- Confirm `/admin` without session redirects to `/login`.
- Confirm login completes and lands on `/admin/dashboard` with no white screen.
- Confirm dashboard data loads only after auth is ready.
- Confirm non-admin staff can use normal admin modules but not `Equipo`.
- Confirm admin users can access `Equipo` and team actions still work.

## What appears to be wrong now
- The admin shell is crashing because `AdminSidebar` imports `getAdminStatus` from `src/server/team.functions.ts`, and the browser is receiving a transformed module that does not currently expose that export.
- Separately, several admin pages assume auth/role state is ready immediately, so protected queries can run too early and hit permission or session timing issues.
- The backend role model is present, but the frontend guard flow is not robust enough, so permission checks are causing app rupture instead of controlled redirects/states.

## Technical details
- Files likely involved:
  - `src/hooks/useAuth.ts`
  - `src/routes/login.tsx`
  - `src/routes/admin.tsx`
  - `src/components/layout/AdminSidebar.tsx`
  - `src/routes/admin/dashboard.tsx`
  - `src/routes/admin/equipo.tsx`
  - `src/server/team.functions.ts`
- Preferred implementation direction:
  - use a shared auth-ready pattern
  - query the current user’s role from `user_roles` on the client for UI gating
  - reserve server functions for privileged mutations/list operations
  - avoid making the sidebar depend on a server-function export that can fail module resolution
- Database review result so far:
  - `user_roles` is correctly separated from `agents`
  - existing RLS already allows users to read their own roles and admins to manage roles
  - current breakage looks primarily like frontend auth/permission orchestration, not a missing table design
