# Admin Control Center and Commerce Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the current Tomoverso admin into a real control center that manages the public site, catalog, users, operations, and the first commerce-ready data model.

**Architecture:** Add a reusable admin shell, a central site-config layer consumed by the public site, moderation/control tables that avoid risky in-place schema edits on existing content tables, and a commerce foundation built as new tables + admin CRUD. Keep public pages reading SQLite directly, but route all configuration through typed helpers and server actions.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind 4, shadcn/ui, better-sqlite3, server actions, Vercel deploy via git push.

## Global Constraints

- Keep SQLite as the live data store.
- Prefer new tables over destructive edits to heavily-used existing tables.
- Every DB-backed page must keep `export const dynamic = "force-dynamic"`.
- Public site must stay readable and deployable at every checkpoint.
- Admin must feel premium, not like a debug panel.

---

### Task 1: Add admin-controlled site + commerce schema

**Files:**
- Modify: `src/lib/db.ts`
- Create: `src/lib/admin/types.ts`
- Create: `src/lib/admin/defaults.ts`

**Interfaces:**
- Produces: `site_settings`, `catalog_controls`, `user_access_controls`, `admin_integrations`, `store_products`, `store_collections`, `store_collection_items` tables.

- [ ] Add new tables with `CREATE TABLE IF NOT EXISTS` only.
- [ ] Add indexes for lookup-heavy fields.
- [ ] Seed default site settings only when missing.
- [ ] Rebuild seed DB after schema change.

### Task 2: Add reusable admin/site helpers

**Files:**
- Create: `src/lib/site-config.ts`
- Create: `src/lib/admin/queries.ts`
- Create: `src/lib/admin/vercel.ts`

**Interfaces:**
- Produces: `getSiteConfig()`, `getAdminOverview()`, `getCatalogAdminRows()`, `getUserAdminRows()`, `getCommerceStats()`, `getIntegrationStatus()`.

- [ ] Centralize DB reads for site config.
- [ ] Centralize admin overview queries.
- [ ] Add masked integration helpers for Vercel metadata/token presence.

### Task 3: Add admin actions layer

**Files:**
- Create: `src/lib/actions/site-admin-actions.ts`
- Create: `src/lib/actions/catalog-admin-actions.ts`
- Create: `src/lib/actions/user-admin-actions.ts`
- Create: `src/lib/actions/commerce-admin-actions.ts`
- Create: `src/lib/actions/integration-admin-actions.ts`

**Interfaces:**
- Produces: `updateSiteConfigAction`, `saveCatalogControlAction`, `setUserRoleAction`, `setUserSuspensionAction`, `createStoreProductAction`, `updateStoreProductAction`, `saveVercelIntegrationAction`, `refreshVercelIntegrationAction`.

- [ ] Guard every action behind admin auth.
- [ ] Revalidate the exact public/admin routes affected.
- [ ] Log every critical action to `activity_log`.

### Task 4: Build a real admin shell + navigation

**Files:**
- Create: `src/components/admin/admin-shell.tsx`
- Create: `src/components/admin/admin-sidebar.tsx`
- Create: `src/components/admin/admin-stat-card.tsx`
- Create: `src/app/admin/layout.tsx`

**Interfaces:**
- Produces: shared admin navigation for `/admin`, `/admin/site`, `/admin/catalog`, `/admin/users`, `/admin/commerce`, `/admin/integrations`, `/admin/imports`, `/admin/stats`.

- [ ] Replace the current isolated admin pages with a consistent shell.
- [ ] Add premium navigation and top-level overview cards.
- [ ] Keep `/admin/imports` and `/admin/stats` plugged into the new shell.

### Task 5: Add site-control pages that drive the public site

**Files:**
- Create: `src/app/admin/site/page.tsx`
- Create: `src/components/admin/site-config-form.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/layout/navbar.tsx`
- Modify: `src/components/layout/footer.tsx`

**Interfaces:**
- Consumes: `getSiteConfig()`
- Produces: admin-editable hero copy, CTA, footer copy, social links, maintenance banner, storefront teaser.

- [ ] Create the site settings editor.
- [ ] Wire home/navbar/footer to DB-driven settings.
- [ ] Add optional storefront teaser slot on public home.

### Task 6: Add catalog control and user control pages

**Files:**
- Create: `src/app/admin/catalog/page.tsx`
- Create: `src/app/admin/users/page.tsx`
- Create: `src/components/admin/catalog-table.tsx`
- Create: `src/components/admin/users-table.tsx`
- Modify: `src/lib/auth.ts`

**Interfaces:**
- Produces: hide/feature/home-spotlight/store-enable per item, role changes, user suspension enforcement.

- [ ] Add catalog-level controls for novels and mangas.
- [ ] Add user moderation tools.
- [ ] Make suspended users fail auth cleanly.

### Task 7: Add commerce foundation page

**Files:**
- Create: `src/app/admin/commerce/page.tsx`
- Create: `src/components/admin/store-product-form.tsx`
- Create: `src/components/admin/store-products-table.tsx`

**Interfaces:**
- Produces: CRUD for store products and collections linked to novels/mangas or manual products.

- [ ] Add product creation/editing.
- [ ] Add collection creation.
- [ ] Show readiness for future sales without requiring checkout now.

### Task 8: Add integrations page with Vercel prep

**Files:**
- Create: `src/app/admin/integrations/page.tsx`
- Create: `src/components/admin/vercel-integration-card.tsx`

**Interfaces:**
- Produces: saved Vercel project metadata, masked token status, refresh action, production URL visibility.

- [ ] Add UI to manage Vercel integration metadata.
- [ ] Show whether token/project/domain are configured.
- [ ] If runtime token works, fetch live project status; otherwise keep graceful fallback.

### Task 9: Verify, rebuild seed, deploy

**Files:**
- Modify: `data/tomoverso.seed.db.gz`

**Interfaces:**
- Produces: verified build + public deployment with working admin/public integration.

- [ ] Run full `npm run build`.
- [ ] Start local prod server and verify `/admin`, `/admin/site`, `/admin/catalog`, `/admin/users`, `/admin/commerce`, `/explore`, `/manga`, `/`.
- [ ] Commit and push.
- [ ] Verify public deployment via HTTP 200 and real content checks.
