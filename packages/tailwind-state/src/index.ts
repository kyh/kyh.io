import plugin from "tailwindcss/plugin";

export type StateSelectorResolver = (attribute: string) => string[];
export type StateValue = string | string[] | StateSelectorResolver;
export type StateMap = Record<string, StateValue>;

export type StatePluginOptions = {
  attribute?: string;
  groupAttribute?: string;
  peerAttribute?: string;
  variantPrefix?: string;
  groupVariantPrefix?: string;
  peerVariantPrefix?: string;
  extend?: StateMap;
  states?: StateMap;
};

type NormalizedStateMap = Record<string, StateSelectorResolver>;

const DEFAULT_ATTRIBUTE = "data-state";
const DEFAULT_VARIANT_PREFIX = "state";
const DEFAULT_GROUP_VARIANT_PREFIX = "group-state";
const DEFAULT_PEER_VARIANT_PREFIX = "peer-state";

const DEFAULT_STATE_MAP: NormalizedStateMap = {
  open: (attribute) => [
    attributeSelector(attribute, "open"),
    '[aria-expanded="true"]',
    '[aria-pressed="true"]',
    '[aria-checked="true"]',
    '[open]'
  ],
  closed: (attribute) => [
    attributeSelector(attribute, "closed"),
    '[aria-expanded="false"]',
    ':where(details:not([open]))'
  ],
  active: (attribute) => [
    attributeSelector(attribute, "active"),
    '[aria-current="page"]',
    '[aria-selected="true"]',
    '[aria-pressed="true"]',
    '[aria-checked="true"]'
  ],
  inactive: (attribute) => [
    attributeSelector(attribute, "inactive"),
    '[aria-selected="false"]',
    '[aria-pressed="false"]',
    '[aria-checked="false"]'
  ],
  checked: (attribute) => [
    attributeSelector(attribute, "checked"),
    '[aria-checked="true"]',
    ':checked'
  ],
  unchecked: (attribute) => [
    attributeSelector(attribute, "unchecked"),
    '[aria-checked="false"]',
    ':where(:not(:checked))'
  ],
  selected: (attribute) => [
    attributeSelector(attribute, "selected"),
    '[aria-selected="true"]',
    '[aria-checked="true"]'
  ],
  deselected: (attribute) => [
    attributeSelector(attribute, "deselected"),
    '[aria-selected="false"]',
    '[aria-checked="false"]'
  ],
  disabled: (attribute) => [
    attributeSelector(attribute, "disabled"),
    '[disabled]',
    '[aria-disabled="true"]'
  ],
  enabled: (attribute) => [
    attributeSelector(attribute, "enabled"),
    '[aria-disabled="false"]',
    ':enabled'
  ],
  pressed: (attribute) => [
    attributeSelector(attribute, "pressed"),
    '[aria-pressed="true"]'
  ],
  unpressed: (attribute) => [
    attributeSelector(attribute, "unpressed"),
    '[aria-pressed="false"]'
  ],
  loading: (attribute) => [
    attributeSelector(attribute, "loading"),
    '[aria-busy="true"]'
  ],
  idle: (attribute) => [
    attributeSelector(attribute, "idle"),
    '[aria-busy="false"]'
  ],
  expanded: (attribute) => [
    attributeSelector(attribute, "expanded"),
    '[aria-expanded="true"]'
  ],
  collapsed: (attribute) => [
    attributeSelector(attribute, "collapsed"),
    '[aria-expanded="false"]'
  ],
  visible: (attribute) => [
    attributeSelector(attribute, "visible"),
    '[aria-hidden="false"]',
    ':where(:not([hidden]))'
  ],
  hidden: (attribute) => [
    attributeSelector(attribute, "hidden"),
    '[aria-hidden="true"]',
    '[hidden]'
  ],
  valid: (attribute) => [
    attributeSelector(attribute, "valid"),
    '[aria-invalid="false"]',
    ':valid'
  ],
  invalid: (attribute) => [
    attributeSelector(attribute, "invalid"),
    '[aria-invalid="true"]',
    ':invalid'
  ],
  required: (attribute) => [
    attributeSelector(attribute, "required"),
    '[aria-required="true"]',
    ':required'
  ],
  optional: (attribute) => [
    attributeSelector(attribute, "optional"),
    '[aria-required="false"]',
    ':optional'
  ],
  readonly: (attribute) => [
    attributeSelector(attribute, "readonly"),
    '[aria-readonly="true"]',
    '[readonly]'
  ],
};

const normalizeValue = (value: string): string => {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1);
  }

  return value;
};

const toResolver = (value: StateValue): StateSelectorResolver => {
  if (typeof value === "function") {
    return (attribute) => ensureArray(value(attribute));
  }

  if (Array.isArray(value)) {
    return () => value.map((entry) => entry);
  }

  return () => [value];
};

const ensureArray = (value: string | string[]): string[] =>
  Array.isArray(value) ? value : [value];

const mergeStateMaps = (options?: StatePluginOptions): NormalizedStateMap => {
  const extended = normalizeStateMap(options?.extend);
  const override = normalizeStateMap(options?.states);

  if (options?.states) {
    return override;
  }

  return { ...DEFAULT_STATE_MAP, ...extended };
};

const normalizeStateMap = (stateMap?: StateMap): NormalizedStateMap => {
  if (!stateMap) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(stateMap).map(([key, value]) => [key, toResolver(value)])
  );
};

const attributeSelector = (attribute: string, value: string): string =>
  `[${attribute}~="${escapeQuotes(value)}"]`;

const escapeQuotes = (value: string): string => value.replace(/"/g, '\\"');

const withSelf = (selectors: string[]): string => {
  if (selectors.length === 0) {
    return "&";
  }

  if (selectors.length === 1) {
    return ensureLeadingAmpersand(selectors[0]);
  }

  const normalized = normalizeForGrouping(selectors);

  if (normalized.length === 0) {
    return "&";
  }

  return `&:is(${normalized.join(", ")})`;
};

const forGroup = (selectors: string[]): string => {
  if (selectors.length === 0) {
    return ":merge(.group) &";
  }

  const normalized = normalizeForGrouping(selectors);

  if (normalized.length === 0) {
    return ":merge(.group) &";
  }

  const target = normalized.length === 1 ? normalized[0] : `:is(${normalized.join(", ")})`;
  return `:merge(.group)${target} &`;
};

const forPeer = (selectors: string[]): string => {
  if (selectors.length === 0) {
    return ":merge(.peer) ~ &";
  }

  const normalized = normalizeForGrouping(selectors);

  if (normalized.length === 0) {
    return ":merge(.peer) ~ &";
  }

  const target = normalized.length === 1 ? normalized[0] : `:is(${normalized.join(", ")})`;
  return `:merge(.peer)${target} ~ &`;
};

const normalizeForGrouping = (selectors: string[]): string[] =>
  selectors
    .map(stripLeadingAmpersand)
    .map((selector) => selector.trim())
    .filter((selector) => selector !== "" && selector !== "&");

const ensureLeadingAmpersand = (selector: string | undefined): string => {
  const trimmed = selector?.trim() ?? "";

  if (!trimmed) {
    return "&";
  }

  return trimmed.startsWith("&") ? trimmed : `&${trimmed}`;
};

const stripLeadingAmpersand = (selector: string): string => {
  const trimmed = selector.trim();

  if (trimmed.startsWith("&")) {
    return trimmed.slice(1).trim() || "&";
  }

  return trimmed;
};

const resolveSelectors = (
  value: string,
  attribute: string,
  stateMap: NormalizedStateMap
): string[] => {
  const normalizedValue = normalizeValue(value);
  const resolver = stateMap[normalizedValue];

  if (!resolver) {
    return [attributeSelector(attribute, normalizedValue)];
  }

  const selectors = resolver(attribute);

  if (selectors.length === 0) {
    return [attributeSelector(attribute, normalizedValue)];
  }

  return selectors;
};

const statePlugin = plugin.withOptions<StatePluginOptions | undefined>(
  (userOptions = {}) => {
    const attribute = userOptions.attribute ?? DEFAULT_ATTRIBUTE;
    const groupAttribute = userOptions.groupAttribute ?? attribute;
    const peerAttribute = userOptions.peerAttribute ?? attribute;
    const variantPrefix = userOptions.variantPrefix ?? DEFAULT_VARIANT_PREFIX;
    const groupVariantPrefix =
      userOptions.groupVariantPrefix ?? DEFAULT_GROUP_VARIANT_PREFIX;
    const peerVariantPrefix =
      userOptions.peerVariantPrefix ?? DEFAULT_PEER_VARIANT_PREFIX;

    const stateMap = mergeStateMaps(userOptions);
    const values = Object.fromEntries(
      Object.keys(stateMap).map((state) => [state, state])
    );

    return (api) => {
      api.matchVariant(
        variantPrefix,
        (value) => withSelf(resolveSelectors(value, attribute, stateMap)),
        {
          values,
        }
      );

      api.matchVariant(
        groupVariantPrefix,
        (value) => forGroup(resolveSelectors(value, groupAttribute, stateMap)),
        {
          values,
        }
      );

      api.matchVariant(
        peerVariantPrefix,
        (value) => forPeer(resolveSelectors(value, peerAttribute, stateMap)),
        {
          values,
        }
      );
    };
  },
  () => ({})
);

export const createStatePlugin: ((
  options?: StatePluginOptions
) => ReturnType<typeof statePlugin>) & typeof statePlugin = Object.assign(
  (options?: StatePluginOptions) => statePlugin(options),
  statePlugin
);

export default createStatePlugin;
