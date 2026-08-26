/** Keep in sync with .babelrc — the PostCSS scan and the Babel transform must agree on
 * StyleX options or the emitted class names never resolve against the generated CSS.
 * Turbopack bundles this config, so it cannot read .babelrc directly. */
const stylexOptions = {
  dev: false,
  runtimeInjection: false,
  enableInlinedConditionalMerge: true,
  treeshakeCompensation: true,
  unstable_moduleResolution: { type: "commonJS" },
};

export default {
  plugins: {
    "@stylexjs/postcss-plugin": {
      include: ["src/**/*.{js,jsx,ts,tsx}", "../../packages/stylex-tokens/tokens.stylex.js"],
      babelConfig: {
        babelrc: false,
        parserOpts: { plugins: ["typescript", "jsx"] },
        plugins: [["@stylexjs/babel-plugin", stylexOptions]],
      },
      useCSSLayers: true,
    },
  },
};
