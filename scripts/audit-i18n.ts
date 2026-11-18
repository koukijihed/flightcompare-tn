import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { messages } from "../src/i18n/messages";

function flatten(value: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object") keys.push(...flatten(child as Record<string, unknown>, path));
    else keys.push(path);
  }
  return keys;
}

const frKeys = new Set(flatten(messages.fr as unknown as Record<string, unknown>));
const files: string[] = [];
function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
}
walk("src");

const problems: string[] = [];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  const namespaces = new Map<string, string>();
  for (const match of source.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:useTranslations|getTranslations)\(\s*(?:"([^"]+)")?/g)) {
    namespaces.set(match[1]!, match[2] ?? "");
  }
  for (const [variable, namespace] of namespaces) {
    const call = new RegExp(`\\b${variable}\\(\\s*"([^"]+)"`, "g");
    for (const match of source.matchAll(call)) {
      const key = namespace ? `${namespace}.${match[1]}` : match[1]!;
      if (!frKeys.has(key)) problems.push(`${file}: ${variable}("${match[1]}") -> missing ${key}`);
    }
  }
}
console.log(problems.length === 0 ? "No missing keys" : problems.join("\n"));
