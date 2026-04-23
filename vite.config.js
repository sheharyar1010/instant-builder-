import { defineConfig } from "vite";
import path from "path";
import fs from "fs";
import legacy from '@vitejs/plugin-legacy';

function getAllJsEntries(dir, prefix = "") {
  const entries = {};

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const nestedEntries = getAllJsEntries(fullPath, path.join(prefix, file));
      Object.assign(entries, nestedEntries);
    } else if (stat.isFile() && file.endsWith(".js")) {
      const nameKey = path
        .join(prefix, file)
        .replace(/\.js$/, "")
        .replace(/\\/g, "_")
        .replace(/\//g, "_");
      entries[nameKey] = fullPath;
    }
  }

  return entries;
}

const inputFiles = getAllJsEntries(path.resolve(__dirname, "resources/js"));

export default defineConfig({
  root: "resources",
  base: "",
  resolve: {
    alias: {
      "@global": path.resolve(__dirname, "resources/scss/global"),
    },
  },
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
  ],
  build: {
    outDir: "../assets",
    emptyOutDir: false,

    rollupOptions: {
      input: inputFiles,
      output: {
        entryFileNames: (chunkInfo) => {
          return `js/${chunkInfo.name.replace(/_/g, "/")}.js`;
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            const nameWithoutExt = assetInfo.name.replace(".css", "");
            const path = nameWithoutExt.replace(/_/g, "/");
            return `css/${path}.css`;
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@global/_variables.scss" as *;`,
        includePaths: ["resources/scss"],
      },
    },
  },
});
