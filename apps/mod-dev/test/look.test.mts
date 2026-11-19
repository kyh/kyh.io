import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_LOOKS,
  entriesOf,
  isSafePath,
  linesOf,
  lookLabel,
  lookedText,
  looksOf,
  matchesOf,
} from "../hooks/look";

describe("looksOf", () => {
  it("reads the reviewer's look lines, markdown and ranges allowed", () => {
    assert.deepEqual(
      looksOf(
        [
          "Let me look first.",
          "read: src/lib/config.ts",
          "- `read: src/app/page.tsx:40-60`",
          "grep: useEffect\\( in apps/kyh/src",
          "grep: createRoute",
          "list: node_modules/next/",
        ].join("\n"),
      ),
      [
        { kind: "read", target: "src/lib/config.ts" },
        { from: 40, kind: "read", target: "src/app/page.tsx", to: 60 },
        { kind: "grep", path: "apps/kyh/src", target: "useEffect\\(" },
        { kind: "grep", target: "createRoute" },
        { kind: "list", target: "node_modules/next" },
      ],
    );
  });

  it("refuses paths outside the repository, and keeps the first few", () => {
    assert.deepEqual(looksOf("read: /etc/passwd\nread: ../x\nlist: ~\ngrep: a in ../b"), []);
    assert.deepEqual(looksOf("list: ."), [{ kind: "list", target: "." }]);
    const many = Array.from({ length: 20 }, (_, i) => `read: f${i}.ts`).join("\n");
    assert.equal(looksOf(many).length, MAX_LOOKS);
  });

  it("finds none in a scorecard", () => {
    assert.deepEqual(looksOf("confidence: 8 | ok\nfix: x | src/a.ts:1"), []);
  });
});

describe("isSafePath", () => {
  it("allows relative paths inside the repository", () => {
    assert.equal(isSafePath("apps/kyh/src/x.ts"), true);
    assert.equal(isSafePath("a/../../b"), false);
    assert.equal(isSafePath("/abs"), false);
    assert.equal(isSafePath(""), false);
  });
});

describe("what the reviewer sees", () => {
  it("numbers a file's lines within the range, and says what's left", () => {
    const text = Array.from({ length: 500 }, (_, i) => `line ${i + 1}`).join("\n");
    const shown = linesOf(text, { from: 10, kind: "read", target: "a.ts", to: 12 });
    assert.equal(
      shown,
      "   10  line 10\n   11  line 11\n   12  line 12\n[… 488 more lines: read: a.ts:13-212]",
    );
    assert.equal(linesOf("a\nb", { kind: "read", target: "b.ts" }), "    1  a\n    2  b");
  });

  it("caps matches and entries", () => {
    assert.equal(matchesOf(""), "(no matches)");
    const matches = Array.from({ length: 70 }, (_, i) => `a.ts:${i}:x`).join("\n");
    assert.match(matchesOf(matches), /\[… 10 more matches\]$/u);
    assert.equal(
      entriesOf([
        { kind: "file", name: "b.ts" },
        { kind: "directory", name: "a" },
      ]),
      "a/\nb.ts",
    );
  });

  it("names each look back with what it showed", () => {
    assert.equal(lookLabel({ from: 1, kind: "read", target: "a.ts", to: 5 }), "read: a.ts:1-5");
    assert.equal(
      lookedText(2, [{ look: { kind: "grep", path: "src", target: "x" }, text: "src/a.ts:1:x" }]),
      '<looked round="2">\n--- grep: x in src\nsrc/a.ts:1:x\n</looked>',
    );
  });
});
