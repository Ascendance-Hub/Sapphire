# PHASE_16 — npm Release (changesets + publish) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. Several steps are **USER ACTION** (npm account/org/secret) — the agent must stop and hand those to the maintainer.

**Goal:** Publish all first-party Sapphire packages to the `@ascendance-hub` npm scope at `1.0.0`, with an automated changesets-driven release pipeline.

**Architecture:** `changesets` already manages versioning (`.changeset/` exists, `fixed` group, `access: public`). This phase adds a GitHub Actions release workflow: a push to `main` opens/updates a "Version Packages" PR; merging that PR builds and publishes to npm. Versioning is **fixed** — every first-party package shares one version and bumps together.

**Tech Stack:** `changesets`, `tsup` (already configured per package), GitHub Actions, npm scoped registry.

**Source:** `specs/v1/V1_PLAN.md` §PHASE_16, `specs/v1/V1_DESIGN.md` §12.

---

## Dependency & Scope Notes

- **Depends on season-four landing first.** The mongo/mongoose split (`docs/superpowers/plans/2026-05-15-season-four-sublib-separation.md`) turns 4 packages into **5**. This plan assumes the post-split set: `sapphire-core`, `sapphire-mongo`, `sapphire-mongoose`, `sapphire-json-schema`, `sapphire-drizzle`. If PHASE_16 runs before season-four, drop `sapphire-mongoose` from every list below. **Recommended order: season-four → PHASE_16.**
- This is a release-engineering plan, not a feature plan — tasks verify state and configuration rather than following red-green TDD. "Done when" criteria stand in for test assertions.
- The actual first publish is irreversible (a published npm version cannot be re-published). Treat Task 6's dry-run as the gate.

---

## File Structure

**Created:**
- `.github/workflows/release.yml` — the changesets release pipeline.
- `.changeset/phase-16-v1-release.md` — the changeset that drives the `1.0.0` bump.

**Modified:**
- `.changeset/config.json` — `fixed` group must list all 5 packages (the season-four plan's Task C4 already adds `sapphire-mongoose`; this plan verifies it).
- Each `packages/*/package.json` — only if the publish-readiness audit (Task 4) finds a gap.

**External (USER ACTION — not files):**
- npm: the `@ascendance-hub` organization/scope must exist.
- npm: an automation access token.
- GitHub repo: `NPM_TOKEN` secret.

---

## Task 1: USER ACTION — npm org, token, and repo secret

**Files:** none (external setup).

- [ ] **Step 1: Ensure the npm scope exists**

The maintainer runs locally:

```bash
npm whoami            # confirms login; if not, `npm login`
npm org ls ascendance-hub 2>/dev/null || echo "org missing — create it"
```

If the `@ascendance-hub` org does not exist, create it at https://www.npmjs.com/org/create (free plan covers public packages). A scoped package cannot publish to a non-existent scope.

- [ ] **Step 2: Create an automation token**

On npmjs.com → Access Tokens → Generate New Token → **Granular Access Token** (or Classic "Automation"). Scope it to publish for the `@ascendance-hub` packages. Automation tokens bypass 2FA, which is required for CI publishing.

- [ ] **Step 3: Add the token as a GitHub secret**

```bash
gh secret set NPM_TOKEN --repo Ascendance-Hub/Sapphire
# paste the token when prompted
```

- [ ] **Step 4: Confirm**

Run: `gh secret list --repo Ascendance-Hub/Sapphire`
Expected: `NPM_TOKEN` listed.

**Done when:** the `@ascendance-hub` scope exists, and `NPM_TOKEN` is a repo secret.

---

## Task 2: Verify the changesets `fixed` group

**Files:**
- Modify (if needed): `.changeset/config.json`

- [ ] **Step 1: Inspect `.changeset/config.json`**

Run: `cat .changeset/config.json`
Expected: the `fixed` array's inner list contains all five packages:

```json
  "fixed": [
    [
      "@ascendance-hub/sapphire-core",
      "@ascendance-hub/sapphire-mongo",
      "@ascendance-hub/sapphire-mongoose",
      "@ascendance-hub/sapphire-json-schema",
      "@ascendance-hub/sapphire-drizzle"
    ]
  ],
```

- [ ] **Step 2: If `sapphire-mongoose` is missing, add it**

(It is missing only if season-four has not landed.) Add `"@ascendance-hub/sapphire-mongoose"` to the inner list. Confirm `"access": "public"` and `"baseBranch": "main"` are already set (they are).

- [ ] **Step 3: Verify changesets can read the config**

Run: `npx changeset status`
Expected: prints pending releases without a config error.

- [ ] **Step 4: Commit (only if Step 2 changed the file)**

```bash
git add .changeset/config.json
git commit -m "chore(release): include sapphire-mongoose in the changesets fixed group"
```

**Done when:** `fixed` lists all 5 packages and `changeset status` runs clean.

---

## Task 3: The `1.0.0` release changeset

**Files:**
- Create: `.changeset/phase-16-v1-release.md`
- Inspect: existing `.changeset/phase-*.md`

The packages are at `0.5.0`. A `major` changeset bumps a `0.x` package to `1.0.0`. The `fixed` group means one `major` entry bumps all five together.

- [ ] **Step 1: Review the pending changesets**

Run: `ls .changeset/*.md && npx changeset status --verbose`
The `.changeset/phase-6..15-*.md` files are pending — they become the `1.0.0` CHANGELOG body. Keep them (they document the road to v1). Do **not** delete them.

- [ ] **Step 2: Create the release changeset**

`.changeset/phase-16-v1-release.md`:

```markdown
---
'@ascendance-hub/sapphire-core': major
'@ascendance-hub/sapphire-mongo': major
'@ascendance-hub/sapphire-mongoose': major
'@ascendance-hub/sapphire-json-schema': major
'@ascendance-hub/sapphire-drizzle': major
---

Sapphire v1.0.0 — first public release. The schema-and-types generator and its
adapters (Mongo native-driver, Mongoose, JSON Schema, Drizzle) are published to
the `@ascendance-hub` scope. The previous `0.x` line was workspace-local only.
```

- [ ] **Step 3: Dry-run the version bump locally**

```bash
git stash --include-untracked   # keep a clean tree to restore
npx changeset version
```

Inspect: every `packages/*/package.json` now reads `"version": "1.0.0"`, and each package has an updated `CHANGELOG.md`.

- [ ] **Step 4: Restore — do not commit the local bump**

```bash
git checkout -- . && git clean -fd packages/*/CHANGELOG.md 2>/dev/null
git stash pop
```

The real version bump happens in CI via the "Version Packages" PR (Task 7). Step 3 is only a local sanity check.

- [ ] **Step 5: Commit the changeset**

```bash
git add .changeset/phase-16-v1-release.md
git commit -m "chore(release): changeset for the v1.0.0 release"
```

**Done when:** the release changeset exists and a local `changeset version` dry-run produces `1.0.0` across all packages.

---

## Task 4: Publish-readiness audit

**Files:**
- Inspect (modify only on a finding): every `packages/*/package.json`, `LICENSE`.

- [ ] **Step 1: Audit each package.json**

For each of the 5 packages, confirm:
- No `"private": true` (must be publishable — the root `package.json` keeps `private: true`, packages must not).
- `"files": ["dist"]` present.
- `"exports"`, `"main"`, `"module"`, `"types"` point into `dist/`.
- `"repository.directory"` matches the actual folder.
- `"license": "BSD-3-Clause"` and a root `LICENSE` file exists.
- `peerDependencies` on `@ascendance-hub/sapphire-core` use `"*"` (or a `1`-compatible range — `"*"` is acceptable for the fixed group; leave as-is unless the maintainer wants a pinned range).

Run: `node -e "for(const d of require('fs').readdirSync('packages')){const p=require('./packages/'+d+'/package.json');console.log(p.name, p.version, 'private='+!!p.private, 'files='+JSON.stringify(p.files))}"`
Expected: 5 lines, all `private=false`, all `files=["dist"]`.

- [ ] **Step 2: Confirm the build produces clean output**

Run: `npm run build`
Expected: every package has `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`.

- [ ] **Step 3: Fix and commit any gaps**

If Step 1 found a problem, fix that `package.json` and commit with `chore(release): make <pkg> publish-ready`.

**Done when:** all 5 packages are publishable and build cleanly.

---

## Task 5: The release workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency: release-${{ github.ref }}

permissions:
  contents: write
  pull-requests: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
      - run: npm install --no-audit --no-fund
      - run: npm run build
      - name: Create Release PR or publish
        uses: changesets/action@v1
        with:
          version: npm run version-packages
          publish: npm run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          NPM_CONFIG_PROVENANCE: true
```

Notes:
- `id-token: write` + `NPM_CONFIG_PROVENANCE: true` make npm attach build provenance (the V1_PLAN "npm-provenance if desired" item). Provenance requires the publish to run from a public GitHub repo — it is.
- `changesets/action@v1` decides automatically: if changesets are pending it opens/updates the "Version Packages" PR; if none are pending (the Version PR was merged) it runs `publish`.
- Action major versions match the repo's modernized workflows (`checkout@v6`, `setup-node@v6`).

- [ ] **Step 2: Lint the workflow**

Run: `npx prettier --check .github/workflows/release.yml`
Expected: clean (or `prettier --write` it).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci(release): changesets publish workflow"
```

**Done when:** `release.yml` exists and is prettier-clean.

---

## Task 6: Local publish dry-run (the release gate)

**Files:** none (verification).

- [ ] **Step 1: Build fresh**

Run: `npm run build`

- [ ] **Step 2: Dry-run the publish of each package**

```bash
for d in core mongo mongoose json-schema drizzle; do
  echo "=== $d ==="
  npm publish "packages/$d" --dry-run --access public
done
```

Inspect each tarball listing: it must contain `dist/` files and `package.json` only — **no `src/`, no `tests/`, no `node_modules/`**. If `src/` appears, the package's `files` field is wrong — fix and re-run.

- [ ] **Step 3: Confirm the scope is claimable**

Run: `npm view @ascendance-hub/sapphire-core version 2>&1 || echo "not yet published — expected"`
Expected: "not yet published" (a 404). If a version already exists, stop and consult the maintainer — versions are immutable.

**Done when:** all 5 dry-run tarballs contain only `dist/` + `package.json`, and the scope has no conflicting published versions.

---

## Task 7: First release

**Files:** none (CI-driven).

- [ ] **Step 1: Merge the PHASE_16 branch to `main`**

Open a PR with Tasks 2–6's commits, get it reviewed, merge to `main`.

- [ ] **Step 2: Watch the release workflow open the Version PR**

On the merge, `release.yml` runs and `changesets/action` opens a **"Version Packages"** PR that bumps all 5 packages to `1.0.0` and writes `CHANGELOG.md` files (consuming every pending `.changeset/*.md`).

Run: `gh pr list --repo Ascendance-Hub/Sapphire`
Expected: a "Version Packages" PR appears.

- [ ] **Step 3: Review and merge the Version Packages PR**

Verify the version bumps (`1.0.0`) and the generated changelogs read correctly. Merge it.

- [ ] **Step 4: Watch the publish**

Merging the Version PR triggers `release.yml` again; this run finds no pending changesets and runs `npm run release` (`changeset publish`).

Run: `gh run watch $(gh run list --workflow Release --limit 1 --json databaseId --jq '.[0].databaseId')`
Expected: the run succeeds and publishes 5 packages.

**Done when:** the Release workflow completes green and the publish step reports 5 packages published.

---

## Task 8: Post-publish verification

**Files:** none (verification).

- [ ] **Step 1: Confirm the packages are live**

```bash
for p in core mongo mongoose json-schema drizzle; do
  echo -n "@ascendance-hub/sapphire-$p: "
  npm view "@ascendance-hub/sapphire-$p" version
done
```

Expected: each prints `1.0.0`.

- [ ] **Step 2: Clean-room install + smoke test**

```bash
cd "$(mktemp -d)"
npm init -y >/dev/null
npm install @ascendance-hub/sapphire-core @ascendance-hub/sapphire-mongoose mongoose
node --input-type=module -e "
  import { Sapphire } from '@ascendance-hub/sapphire-core'
  const a = new Sapphire()
  const User = a.object({ name: a.string() })
  console.log(JSON.stringify(User.toSchema().kind))
"
```

Expected: prints `"object"` — i.e. a fresh consumer can install from npm and use the API. Run the actual README quickstart snippet here too.

- [ ] **Step 3: Tag the GitHub release**

`changesets/action` typically creates GitHub releases per tag when publishing. Confirm:

Run: `gh release list --repo Ascendance-Hub/Sapphire`
Expected: a `v1.0.0` (or per-package) release with the changelog. If absent, create it: `gh release create v1.0.0 --title "v1.0.0" --notes-file <changelog>`.

- [ ] **Step 4: Deprecate the abandoned `0.x` line**

If the old `sapphire-lib` package exists on npm (V1_PLAN PHASE_16 step 6):

```bash
npm deprecate sapphire-lib@"<1.0.0" "Renamed — use @ascendance-hub/sapphire-core and its adapters."
```

If `sapphire-lib` was never published, skip this step.

**Done when:** all 5 packages resolve at `1.0.0` from a clean install, the quickstart runs, and the `v1.0.0` GitHub release exists.

---

## Self-Review

**Spec coverage (V1_PLAN §PHASE_16 steps 1–8):** changeset bumping to `1.0.0` → Task 3. `config.json` (`access`/`baseBranch`/`fixed`) → Task 2. GitHub Action with `changesets/action` → Task 5. `NPM_TOKEN` + provenance → Task 1 + Task 5. Clean-machine install verification → Task 8. Deprecate old `sapphire-lib` → Task 8 Step 4. Tag GH release → Task 8 Step 3. (Step 8 "Announce" is a marketing action, intentionally out of scope for an implementation plan.)

**Spec coverage (V1_DESIGN §12):** `tsup` dual build → Task 4 Step 2 (already configured per package). Versioning starts at `1.0.0` → Task 3. `changesets` release workflow → Task 5. `fixed` versioning → Task 2.

**Placeholder scan:** no "TBD"/"later". Every step has a concrete command or file. USER ACTION steps (Task 1) are explicitly delegated, not vague.

**Consistency:** package set is the 5-package post-split list in every task. Root scripts referenced (`version-packages` → `changeset version`, `release` → `npm run build && changeset publish`) match `package.json`. Workflow action versions (`@v6`) match the repo's other workflows.

**Open risk:** Task 7 is irreversible once the Version PR merges. Task 6's dry-run is the gate — do not skip it.
