import { strict as assert } from "node:assert";
import postcss from "postcss";
import tailwindcss from "tailwindcss";

import { createStatePlugin } from "../src/index.js";
import type { Rule } from "postcss";

const buildCss = async (content: string) => {
  const result = await postcss([
    tailwindcss({
      corePlugins: { preflight: false },
      content: [{ raw: content }],
      plugins: [createStatePlugin()],
      theme: {},
    }),
  ]).process("@tailwind utilities;", { from: undefined });

  return result;
};

const main = async () => {
  const { root, css } = await buildCss(
    [
      "state-open:bg-blue-500",
      "group-state-closed:text-white",
      "peer-state-loading:ring-2",
      "state-[busy]:opacity-50",
    ].join(" ")
  );

  const nodes = Array.isArray(root.nodes) ? root.nodes : [];
  assert(nodes.length > 0, "Failed to generate CSS for state variants");

  const getRule = (matcher: (selector: string) => boolean) =>
    nodes.find(
      (node): node is Rule => node.type === "rule" && matcher(node.selector)
    );

  const stateRule = getRule((selector) =>
    selector.includes(".state-open\\:bg-blue-500")
  );
  assert(stateRule, "Expected state-open variant to generate a rule");
  assert(
    stateRule.selector.includes('[data-state~="open"]'),
    "state-open variant should include data-state selector"
  );
  assert(
    stateRule.selector.includes('[aria-expanded="true"]'),
    "state-open variant should include aria-expanded selector"
  );

  const groupRule = getRule((selector) =>
    selector.includes(".group-state-closed\\:text-white")
  );
  assert(groupRule, "Expected group-state variant to generate a rule");
  assert(
    groupRule.selector.includes(".group:is"),
    "group-state variant should target the group selector"
  );
  assert(
    groupRule.selector.includes('[data-state~="closed"]'),
    "group-state variant should include data-state selector"
  );

  const peerRule = getRule((selector) =>
    selector.includes(".peer-state-loading\\:ring-2")
  );
  assert(peerRule, "Expected peer-state variant to generate a rule");
  assert(
    peerRule.selector.includes(".peer:is"),
    "peer-state variant should target the peer selector"
  );
  assert(
    peerRule.selector.includes('[data-state~="loading"]'),
    "peer-state variant should include data-state selector"
  );

  assert(
    css.includes(".state-\\[busy\\]\\:opacity-50"),
    "Dynamic state variant should be generated"
  );
  assert(
    css.includes('[data-state~="busy"]'),
    "Dynamic state variant should fall back to data-state selector"
  );
};

await main();
