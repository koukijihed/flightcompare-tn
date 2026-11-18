import { describe, expect, it } from "vitest";
import { locales, messages } from "./messages";

function flattenKeys(value: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object") {
      return flattenKeys(child as Record<string, unknown>, path);
    }
    return [path];
  });
}

describe("translations", () => {
  const reference = flattenKeys(messages.fr as unknown as Record<string, unknown>);

  it.each(locales)("has the same keys in %s as in fr", (locale) => {
    const keys = flattenKeys(messages[locale] as unknown as Record<string, unknown>);
    expect(keys.sort()).toEqual([...reference].sort());
  });

  it("does not contain empty strings", () => {
    for (const locale of locales) {
      const dictionary = messages[locale] as unknown as Record<string, unknown>;
      for (const key of flattenKeys(dictionary)) {
        const value = key.split(".").reduce<unknown>((acc, part) => {
          return acc && typeof acc === "object"
            ? (acc as Record<string, unknown>)[part]
            : undefined;
        }, dictionary);
        expect(value, `${locale}.${key}`).toBeTruthy();
      }
    }
  });
});
