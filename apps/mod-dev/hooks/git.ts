// The diff /score reads, from git.

import type { Diff } from "./grade";

// Prints the commit the work is measured from and what it is, then the stat
// and the patch of everything since: commits, uncommitted edits and untracked
// files, staged into a copy of the index so the real one is left alone.
// Lockfiles stay in the stat but out of the patch. The base is the merge base
// with the default branch, or `$1` when given. Exits 2 when `$1` names no
// commit, 3 outside a repository.
export const DIFF_SCRIPT = `
ref="\${1:-}"
top="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 3
cd "$top" || exit 3
if [ -n "$ref" ]; then
  base="$(git rev-parse --verify --quiet "$ref^{commit}")" || { echo "$ref is not a commit" >&2; exit 2; }
  against="$ref"
else
  base="" against=""
  for branch in "$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null)" origin/main origin/master main master; do
    [ -n "$branch" ] && base="$(git merge-base HEAD "$branch" 2>/dev/null)" && against="$branch" && break
  done
  if [ -z "$base" ]; then
    base="$(git rev-parse --verify --quiet HEAD)" && against="HEAD" ||
      { base=4b825dc642cb6eb9a060e54bf8d69288fbee4904; against="an empty tree"; }
  fi
fi
index="$(mktemp)" || exit 3
trap 'rm -f "$index"' EXIT
cp "$(git rev-parse --git-path index)" "$index" 2>/dev/null || rm -f "$index"
export GIT_INDEX_FILE="$index"
git add -A >/dev/null 2>&1 || exit 3
printf '%s\\n%s\\n' "$base" "$against"
git diff --cached --stat=160,100,200 "$base"
git diff --cached --unified=5 "$base" -- . ':(exclude)*.lock' ':(exclude)*.lockb' ':(exclude)*-lock.json' ':(exclude)*-lock.yaml' | head -c 2000000
`;

export const parseDiff = (stdout: string): Diff => {
  const [base = "", against = "", ...rest] = stdout.split("\n");
  const body = rest.join("\n");
  const at = body.search(/^diff --git /mu);
  return {
    against,
    base,
    patch: at < 0 ? "" : body.slice(at),
    stat: (at < 0 ? body : body.slice(0, at)).trim(),
  };
};
