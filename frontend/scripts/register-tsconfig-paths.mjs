import { register } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const scriptsDir = dirname(new URL(import.meta.url).pathname);
const srcRoot = join(scriptsDir, "..", "src");

register("./tsconfig-paths-loader.mjs", pathToFileURL(`${scriptsDir}/`));

export { srcRoot };
