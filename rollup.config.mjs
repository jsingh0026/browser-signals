// Two builds from one source:
//   - ESM for bundler users (npm install), unminified so their bundler can tree-shake it.
//   - IIFE for a <script> tag, minified, exposing a single global: window.BrowserSignals.
// Babel does the syntax lowering (targets come from "browserslist" in package.json);
// tsc only type-checks and emits .d.ts files (see tsconfig.build.json).
import { readFileSync } from "node:fs";
import { babel } from "@rollup/plugin-babel";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import terser from "@rollup/plugin-terser";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const extensions = [".ts", ".js"];

const plugins = [
  replace({ preventAssignment: true, values: { __SDK_VERSION__: JSON.stringify(pkg.version) } }),
  nodeResolve({ extensions }),
  babel({
    babelHelpers: "bundled",
    extensions,
    exclude: "node_modules/**",
    presets: [
      // bugfixes: smaller output for browsers that need only partial transforms.
      ["@babel/preset-env", { bugfixes: true }],
      "@babel/preset-typescript",
    ],
  }),
];

export default [
  {
    input: "src/index.ts",
    output: { file: "dist/browser-signals.esm.js", format: "es", sourcemap: true },
    plugins,
  },
  {
    input: "src/index.ts",
    output: {
      file: "dist/browser-signals.iife.min.js",
      format: "iife",
      name: "BrowserSignals",
      sourcemap: true,
    },
    plugins: [
      ...plugins,
      // Mangle private-looking names too: smaller file and a bit harder to read.
      // This is minification, not real obfuscation (see README "Obfuscation").
      terser({ mangle: { properties: { regex: /^_/ } }, format: { comments: false } }),
    ],
  },
];
