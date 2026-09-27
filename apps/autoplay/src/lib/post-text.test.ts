import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { displayPostText } from "./post-text";

describe("displayPostText", () => {
  it("drops t.co links, which mean nothing to a viewer", () => {
    const text = displayPostText("look at this https://t.co/abc123 and this https://t.co/def456");
    assert.equal(text, "look at this and this");
  });

  it("decodes the entities X returns raw", () => {
    assert.equal(displayPostText("Kids &amp; Family &lt;3"), "Kids & Family <3");
  });

  it("keeps mentions and hashtags, which are part of how a post reads", () => {
    assert.equal(displayPostText("@dhh on #rails"), "@dhh on #rails");
  });

  it("collapses the whitespace a stripped link leaves behind", () => {
    assert.equal(displayPostText("a  https://t.co/x  b"), "a b");
  });
});
