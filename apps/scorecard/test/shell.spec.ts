import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { commandsOf, unwrap, withoutHeredocs } from "../hooks/shell";

describe("commandsOf", () => {
  it("splits at operators and keeps quoted words whole", () => {
    assert.deepEqual(commandsOf(`cd "apps/my app" && pnpm test | tail -5; echo 'a && b'`), [
      { input: "", op: "&&", words: ["cd", "apps/my app"] },
      { input: "", op: "|", words: ["pnpm", "test"] },
      { input: "", op: ";", words: ["tail", "-5"] },
      { input: "", op: "", words: ["echo", "a && b"] },
    ]);
  });

  it("gives a heredoc's body to the command that reads it", () => {
    const [cat, lint] = commandsOf(
      "cat > src/a.ts <<'EOF'\npnpm test && rm -rf /\nEOF\npnpm lint 2>&1",
    );
    assert.equal(cat?.input, "pnpm test && rm -rf /");
    assert.deepEqual(cat?.words.slice(0, 4), ["cat", ">", "src/a.ts", "<<"]);
    assert.deepEqual(lint, { input: "", op: "", words: ["pnpm", "lint"] });
  });

  it("drops stream duplications and splits off redirections", () => {
    assert.deepEqual(commandsOf("pnpm test 2> err.log"), [
      { input: "", op: "", words: ["pnpm", "test", ">", "err.log"] },
    ]);
  });

  it("joins continued lines and unescapes double quotes", () => {
    assert.deepEqual(commandsOf('pnpm \\\n  test -- "say \\"hi\\""'), [
      { input: "", op: "", words: ["pnpm", "test", "--", 'say "hi"'] },
    ]);
  });
});

describe("unwrap", () => {
  it("finds the command under its wrappers", () => {
    assert.deepEqual(unwrap(["CI=1", "timeout", "60", "npx", "-y", "vitest", "run"]), [
      "vitest",
      "run",
    ]);
    assert.deepEqual(unwrap(["python3", "-m", "pytest", "-x"]), ["pytest", "-x"]);
    assert.deepEqual(unwrap(["env", "-u", "CI", "npx", "-p", "typescript", "tsc"]), ["tsc"]);
  });
});

describe("withoutHeredocs", () => {
  it("keeps a heredoc's command on one line without its body", () => {
    assert.equal(
      withoutHeredocs("python3 - <<'EOF' > out.txt\nprint(1)\nEOF\nls"),
      "python3 - <<EOF > out.txt\nls",
    );
  });
});
