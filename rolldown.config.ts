import { defineConfig } from "rolldown";
import pkg from "./package.json";

export default defineConfig([
  {
    input: "./src/index.ts",
    external: Object.keys(pkg.dependencies),
    output: [
      {
        file: "dist/index.js",
        format: "commonjs",
        minify: false,
      },
    ],
  },
]);
