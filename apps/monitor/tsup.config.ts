import { defineConfig } from "tsup";

export default defineConfig({
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
