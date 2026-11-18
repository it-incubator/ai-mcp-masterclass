#!/usr/bin/env bash
# Builds the three step branches from the authoring tree. Run it yourself (the AI never commits).
#
#   scripts/create-branches.sh --dry-run   # show what would happen
#   scripts/create-branches.sh             # create branches + tags
#   scripts/create-branches.sh --force     # recreate branches that already exist
#
# Authoring layout (on the current tree):
#   apps/backend                     -> step 01 (fat controllers)
#   variants/02-use-cases/           -> overlay: files copied over the repo root for step 02 (apps/backend replaced)
#   variants/03-use-cases-mcp/       -> overlay for step 03 (apps/backend replaced, plus .mcp.json, e2e/tests/mcp.spec.ts, ...)
# Branches never contain `variants/`.
set -euo pipefail

DRY=0; FORCE=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --force) FORCE=1 ;;
    *) echo "unknown arg $a"; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
run() { echo "+ $*"; [ "$DRY" = 1 ] || "$@"; }

B1=01-fat-controllers; B2=02-use-cases; B3=03-use-cases-mcp
[ -d variants/02-use-cases ] && [ -d variants/03-use-cases-mcp ] || { echo "variants/ missing"; exit 1; }

if [ ! -d .git ]; then run git init -b main; fi

if [ "$DRY" = 0 ] && git rev-parse --verify HEAD >/dev/null 2>&1 && [ -n "$(git status --porcelain)" ] && [ "$FORCE" = 0 ]; then
  echo "Working tree is not clean and a repository already exists. Commit/stash first or pass --force."; exit 1
fi
for b in $B1 $B2 $B3; do
  if git show-ref --verify --quiet "refs/heads/$b" && [ "$FORCE" = 0 ]; then
    echo "Branch $b already exists. Use --force to recreate."; exit 1
  fi
done

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
rsync -a --exclude .git --exclude node_modules --exclude dist --exclude variants --exclude e2e/test-results --exclude e2e/playwright-report ./ "$STAGE/base/"

make_branch() { # name, variant-dir|"" , tag, message
  local name="$1" variant="$2" tag="$3" msg="$4"
  echo "== $name"
  [ "$DRY" = 1 ] && { echo "(dry-run) would create $name from base${variant:+ + $variant}, tag $tag"; return; }
  git checkout -q --orphan "tmp-$name"
  git rm -rf -q --cached . >/dev/null 2>&1 || true
  find . -mindepth 1 -maxdepth 1 ! -name .git ! -name node_modules -exec rm -rf {} +
  rsync -a "$STAGE/base/" ./
  if [ -n "$variant" ]; then
    rm -rf apps/backend
    rsync -a "$ROOT_VARIANTS/$variant/" ./
  fi
  git add -A
  git commit -q -m "$msg"
  git branch -M "tmp-$name" "$name" 2>/dev/null || { [ "$FORCE" = 1 ] && git branch -D "$name" && git branch -M "tmp-$name" "$name"; }
  git tag -f "$tag" >/dev/null
}

# keep variants outside the work dir while we wipe/checkout
ROOT_VARIANTS="$STAGE/variants"
rsync -a --exclude node_modules --exclude dist variants/ "$ROOT_VARIANTS/"

make_branch "$B1" "" step-01-fat-controllers "feat: add ledger admin demo with fat controllers

Why: the master class needs a working admin panel whose backend keeps all
logic in controllers, to show how hard it is to add a second entry point
(MCP) when presentation and application logic are glued together.

- NestJS + TypeORM backend with fat controllers
- React + TanStack Query + Ant Design admin panel
- docker-compose, seed data, Playwright e2e tests, docs and scenarios"
make_branch "$B2" 02-use-cases step-02-use-cases "refactor(backend): split controller logic into CQRS use cases

Why: logic glued to HTTP controllers cannot be reused by another
presentation layer. Use cases make the application layer independent.

- one command/query + handler per use case, one folder each
- domain rules and errors extracted; controllers are thin adapters
- REST contract and error messages unchanged (e2e stays green)"
make_branch "$B3" 03-use-cases-mcp step-03-use-cases-mcp "feat(mcp): expose use cases as MCP tools

Why: once logic lives in use cases, an AI client can be added as a
second presentation layer without duplicating business rules.

- 21 MCP tools over Streamable HTTP at /mcp (@rekog/mcp-nest)
- .mcp.json, MCP docs and Playwright MCP spec"

[ "$DRY" = 1 ] || { git checkout -q "$B1"; echo "Done. Branches: $B1 $B2 $B3 (tags step-01..03). Default left on $B1."; }
