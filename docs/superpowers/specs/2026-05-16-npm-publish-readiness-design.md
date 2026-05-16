# npm publish readiness — design

Date: 2026-05-16 · Target branch: a new branch off `main` (merges directly to `main`)

## Context

None of the five packages (`sapphire-core`, `-bson`, `-mongoose`, `-json-schema`,
`-drizzle`) are published — confirmed against the npm registry. This is the
**first publish**. A readiness audit found one blocker and several quality gaps;
this spec covers fixing them and standing up the release automation.

Decisions taken with the maintainer:

- **Changesets:** keep the full phase-by-phase history — fix the stale ones in
  place rather than consolidating.
- **`main` release flow:** publish directly on push to `main` (no intermediate
  "Version Packages" PR).
- **`preview` release flow:** publish a snapshot on every push to the `preview`
  branch, under the npm `preview` dist-tag.

The `preview` branch itself arrives in a later PR; this PR only lays down the
workflow files (the preview workflow simply never triggers until the branch
exists).

---

## Section A — Fix the release pipeline (blocker)

### Problem

`npx changeset status` aborts:

```
Error: Found changeset phase-10-new-fields for package
@ascendance-hub/sapphire-mongo which is not in the workspace
```

Eight changeset files name `@ascendance-hub/sapphire-mongo`, the package renamed
to `@ascendance-hub/sapphire-mongoose` in season-four. `changeset version` and
`changeset publish` both refuse to run until this is resolved. Changeset files
(`.changeset/*.md`) are tracked, committed files that drive releases — not specs.

### Decision

Rename the dead package name in place, preserving every changeset and the
phase-by-phase changelog history.

### Implementation

In each of these 8 files, replace `@ascendance-hub/sapphire-mongo` with
`@ascendance-hub/sapphire-mongoose` in the YAML frontmatter:

`phase-6-monorepo.md`, `phase-7-brand-types.md`, `phase-8-validation-api.md`,
`phase-9-modifiers-vocab.md`, `phase-10-new-fields.md`,
`phase-11-object-composition.md`, `phase-12-mongo-adapter.md` (the `major`
line), `phase-15-docs.md` (only its `sapphire-mongo` line; its
`-json-schema` / `-drizzle` lines are already valid).

This is a mechanical rename — it does not re-attribute history. (Some phases,
e.g. phase-7 "brand-types", are arguably core work mislabelled as the mongo
package; re-attributing is out of scope. The `fixed` changeset group bumps all
five packages together regardless of which one a changeset names.)

### Verification

`npx changeset status --verbose` runs clean and reports the planned bump. With
13 changesets (max severity `major`) on 0.x packages, `changeset version`
resolves to **0.6.0** for all five (a `major` on a `0.x` package bumps the
minor).

---

## Section B — Package quality

### B1 — `sapphire-core` README

`npm pack --dry-run` confirms the core tarball ships **no `README.md`** — its npm
page would be blank. The four adapters each have one.

Create `packages/core/README.md`, modelled on the adapter READMEs and the root
README: one-line pitch, install, a short quickstart (define a schema, infer a
type, parse, register an adapter, `getSchema`), and a link to `docs/`.

### B2 — `LICENSE` in each package

No package ships a `LICENSE` file; only the repo root has one. Each package
declares `"license": "MIT"` but ships no license text.

Copy the root `LICENSE` to `packages/<pkg>/LICENSE` for all five. npm
auto-includes a `LICENSE` file in the tarball — no `files` change needed.

### B3 — real `peerDependencies` range for core

The four adapters declare `"@ascendance-hub/sapphire-core": "*"` as a peer
dependency — "any version". After core reaches a breaking 1.0 an adapter built
for 0.x would still silently accept it.

Change `"*"` to `">=0.5.0"` in each adapter's `peerDependencies`. `>=0.5.0` is
satisfied by every 0.5+ release, so it never needs per-release rewriting and
does not depend on changesets updating a peer range (which is fragile —
`^0.5.0` would stop matching once core reaches `0.6.0`). `devDependencies` keep
`"*"`: they resolve to the local workspace package.

---

## Section C — exports & package-size polish

### C1 — precise `exports` map (CJS type resolution)

`tsup` emits both `index.d.ts` (ESM) and `index.d.cts` (CJS), but the `exports`
map has a single hoisted `"types": "./dist/index.d.ts"`. A CJS consumer on
`moduleResolution: nodenext` resolves the ESM `.d.ts` — `@arethetypeswrong/cli`
flags this.

Replace the `exports` block in all five packages with per-condition types:

```json
"exports": {
  ".": {
    "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
  },
  "./package.json": "./package.json"
}
```

Keep the top-level `main` / `module` / `types` fields for older tooling.

### C2 — drop sourcemaps from the published package

The core tarball is ~622 KB unpacked, roughly half of which is
`index.js.map` + `index.cjs.map`. Set `sourcemap: false` in each package's
`tsup.config.ts` so the maps are not generated or shipped. (Library sourcemaps
are a debugging nicety, but the maintainer wants the smaller package; consumers
debug against source via the repo.)

### C3 — explicit `publishConfig.access`

Scoped packages default to a private publish. `changeset publish` works because
`.changeset/config.json` sets `access: public`, but add
`"publishConfig": { "access": "public" }` to each package.json so a manual
`npm publish` is also safe and the intent is explicit.

### C4 — `engines`

Add `"engines": { "node": ">=20" }` to each package.json (Node 20 is the
oldest active LTS; CI runs 22 and 24). Warns consumers on unsupported Node.

---

## Section D — release workflows

Two new workflow files. Both publish with `changeset`, authenticated by an
`NPM_TOKEN` repository secret (see Rollout).

### D1 — `.github/workflows/release.yml` (main, via `changesets/action`)

`main` is branch-protected (Section E), so the workflow cannot push a version
commit to it directly. It uses `changesets/action`, which on push to `main`:

- **changesets present** → opens/updates a "Version Packages" PR (from the bot
  branch `changeset-release/main` into `main`) carrying the version bumps, the
  assembled CHANGELOG, and the consumed changesets. That PR is the release PR —
  review it, merge it.
- **no changesets** (the Version Packages PR was merged) → runs the `release`
  script and publishes to npm.

A release is therefore two protection-safe PR merges: feature work lands on
`main`, the bot opens the Version PR, you merge it, the publish fires.

```yaml
name: Release
on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

concurrency: release-main

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
      - run: npm install --no-audit --no-fund
      - uses: changesets/action@v1
        with:
          version: npm run version-packages
          publish: npm run release
          commit: 'chore: version packages'
          title: 'chore: version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

The root scripts already exist: `version-packages` = `changeset version`,
`release` = `npm run build && changeset publish`. The action's Version PR is a
normal PR, so it satisfies branch protection; the publish path pushes git tags
only, never a branch commit.

### D2 — `.github/workflows/release-preview.yml` (snapshot, on push to `preview`)

On every push to `preview`: build and publish a snapshot under the `preview`
dist-tag. Snapshot versions (`0.6.0-preview-<datetime>`) are ephemeral — nothing
is committed or tagged.

```yaml
name: Release Preview
on:
  push:
    branches: [preview]
  workflow_dispatch:

concurrency: release-preview

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
      - run: npm install --no-audit --no-fund
      - run: npm run build
      - name: Publish preview snapshot
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: |
          npx changeset version --snapshot preview
          npx changeset publish --tag preview --no-git-tag
```

Note: a snapshot is computed from pending changesets, so a push to `preview`
with no pending changesets publishes nothing. Consumers install previews with
`npm install @ascendance-hub/sapphire-core@preview`.

---

## Section E — branch protection

Applied by Claude via `gh` as part of this work.

**`main`** (exists now):

- Require a pull request before merging; **0 required approvals** (solo
  maintainer — requiring approvals would block self-merges).
- `enforce_admins: true` — `main` changes only through PRs, the maintainer
  included. (Can be toggled off in Settings for an emergency direct push.)
- Required status checks: **deferred.** `ci.yml` has
  `paths-ignore: [website/**, docs/**]`, so a docs-only PR produces no CI run
  and a required check would never report — blocking the PR. Start with
  "require PR" only; add `test (22)` / `test (24)` as required checks once
  `ci.yml`'s path filter is reconciled.

**`preview`**: the same "require PR" rule, applied in the later PR that creates
the branch.

## Rollout & prerequisites

1. **npm org + `NPM_TOKEN`** — the maintainer creates the npm org
   `ascendance-hub` (the scope `@ascendance-hub` requires a user or org of that
   exact name), generates an **Automation** access token, and adds it as the
   `NPM_TOKEN` repository secret. _Claude cannot do this._ Until the secret
   exists the publish step fails; the Version Packages PR flow still works.
2. **First release is gated, not automatic-on-merge** — merging this PR puts
   the 13 changesets on `main`; `changesets/action` then opens a "Version
   Packages" PR showing the `0.6.0` bump and the assembled CHANGELOG. **Nothing
   publishes until that PR is merged** — the first publish is a deliberate,
   reviewable second step.
3. **Branch protection** — applied by Claude (Section E). The `changesets/action`
   flow is protection-safe by design (its Version PR is a normal PR; the publish
   step pushes only tags).

## Verification

- `npx changeset status` runs clean (Section A).
- `npm pack --dry-run` for `sapphire-core` includes `README.md` and `LICENSE`;
  no `.map` files in any package tarball (Section B, C2).
- `tsc --noEmit`, `eslint .`, `vitest run` stay green.
- A local `npx @arethetypeswrong/cli --pack packages/core` reports no errors
  (Section C1).
- The two workflow files are valid YAML and the jobs are syntactically sound.

## Out of scope

- Creating the `preview` branch (a later PR).
- `--provenance` / OIDC trusted publishing — a future hardening step.
- Review findings I1–I3, S3–S4.
- S6 (committed lockfile) — still deferred; needs a Linux-generated lockfile.
