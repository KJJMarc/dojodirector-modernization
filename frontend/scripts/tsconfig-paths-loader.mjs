import { access } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const srcRoot = join(
  new URL(".", import.meta.url).pathname,
  "..",
  "src",
);

async function resolvePath(specifier) {
  const relativePath = specifier.slice(2);
  const candidates = [
    join(srcRoot, relativePath),
    join(srcRoot, `${relativePath}.ts`),
    join(srcRoot, `${relativePath}.tsx`),
    join(srcRoot, relativePath, "index.ts"),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return pathToFileURL(candidate).href;
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = await resolvePath(specifier);

    if (resolved) {
      return nextResolve(resolved, context);
    }
  }

  return nextResolve(specifier, context);
}
