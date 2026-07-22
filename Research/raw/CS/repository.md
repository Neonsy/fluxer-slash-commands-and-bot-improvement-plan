# Repository Baseline State

Verified on 2026-07-20 UTC before the authorized research-publication operation.
This is a baseline snapshot, not a claim that the later orphan branch or final
publication commit does not exist.

- Baseline commit:
  `fd62b46faf3505d738f6d5800e787473b14cacd6` (`fix(devcontainer): wait for
  documentation server readiness`). It has one parent,
  `311a1addce2f7a9a993482fb5d15d9455e5c8749`.
- The primary worktree at `/home/neon/dev/fluxer` was on `main` with no tracked or
  untracked status entries. Local `main` and the fetched `origin/main` ref both
  pointed to the baseline commit.
- Verification work occurred in
  `/home/neon/dev/fluxer-research.KgNPVZ`, a detached worktree at the same
  baseline commit. Before CS edits, `git status --ignored=matching` reported only
  `!! Research/`; no product-code path was modified.
- The baseline `main` tree contains no tracked `Research/` path, and the then
  available local/fetched refs contain no commit touching `Research/`.
- At this pre-publication snapshot, no local or fetched remote ref named
  `implementation-plan` existed. This deliberately does not make a claim about
  the branch after the separately authorized publication step.
- `/home/neon/.config/git/ignore` contained the exact case-insensitive rule
  `[Rr][Ee][Ss][Ee][Aa][Rr][Cc][Hh]/`, so these research files were globally
  ignored at the snapshot.
- `origin` was configured as `git@github-fluxer-fork:Neonsy/fluxer.git` for fetch
  and push. No live-host pull-request assertion was made from local Git state.

## Verification commands

The claims above were checked with:

```sh
git rev-parse HEAD
git log -1 --format='%H%n%P%n%s'
git status --short --branch --ignored=matching
git -C /home/neon/dev/fluxer status --short --branch
git worktree list --porcelain
git for-each-ref --format='%(refname) %(objectname)' refs/heads refs/remotes
git ls-tree -r --name-only main -- Research research
git log --all --oneline -- Research research
git check-ignore -v Research/CS/README.md
git remote -v
```

## Current schema, generation, and SDK boundary

- The pnpm workspace owns shared TypeScript wire schemas in the private
  `@fluxer/schema` package. It contains hand-authored Zod domain schemas and
  Buf-generated protobuf TypeScript under `packages/schema/src/gen`; its
  package-owned `generate` script runs Buf, the repository cleanup tool, and
  formatting. Evidence: `pnpm-workspace.yaml`, `packages/schema/package.json`,
  `packages/schema/proto/buf.gen.yaml`, and `tools/ci/src/schema.rs`
  (`run_clean_generated_files`).
- The private `@fluxer/openapi` workspace package derives public/admin
  specifications from route/schema sources, validates them, and writes the
  generated specifications. Root scripts delegate `openapi:generate` and
  `openapi:validate` to that owner. This generator produces specifications, not
  a bot/client SDK. Evidence: root `package.json`,
  `packages/openapi/package.json`, and
  `packages/openapi/src/scripts/GenerateSpec.ts` (`buildTargetSpec`,
  `getTargetOutputPath`, `writeSpec`).
- The complete baseline tree has no tracked official Fluxer command SDK package,
  SDK directory, or TypeScript client generator. Existing schema/OpenAPI
  packages are private internal contract owners and cannot by themselves be
  treated as a supported external SDK. Evidence: `git ls-tree -r --name-only
  main`, `pnpm-workspace.yaml`, and the package manifests above.
