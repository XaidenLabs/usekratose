import { defineConfig } from "tsup";

export default defineConfig({
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
  bundle: true,
  dts: false,
  entry: ["src/main.ts"],
  format: ["esm"],
  noExternal: [/^@usekratose\//],
  outDir: "dist",
  platform: "node",
  sourcemap: true,
  target: "es2023",
});
