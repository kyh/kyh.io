import type { Diff } from "./grade";

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
cp -p "$(git rev-parse --git-path index)" "$index" 2>/dev/null || rm -f "$index"
export GIT_INDEX_FILE="$index"
git add -A >/dev/null 2>&1 || exit 3
printf '%s\\n%s\\n' "$base" "$against"
git diff --cached --stat=160,100,200 "$base"
git diff --cached --unified=5 "$base" -- . ':(exclude)*.lock' ':(exclude)*.lockb' ':(exclude)*-lock.json' ':(exclude)*-lock.yaml' | head -c 2000000
`;

export const parseDiff = (stdout: string) => {
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

const PRIME = 4_294_967_291;

export const hashOf = (text: string) => {
  let hash = 0;

  for (const char of text) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % PRIME;
  }

  return hash.toString(16).padStart(8, "0");
};

export const fingerprintOf = ({ base, patch, stat }: Diff) => hashOf(`${base}\n${stat}\n${patch}`);
