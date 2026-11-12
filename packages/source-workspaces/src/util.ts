import { createHash } from "node:crypto";
import type { SourceSpan } from "./types";

export const digest = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}
export const objectHash = (value: unknown): string => digest(canonical(value));
export function sourceSpan(path: string, hash: string, text: string, start: number, end: number): SourceSpan {
  const location = (offset: number) => {
    const before = text.slice(0, offset);
    const lastNewline = before.lastIndexOf("\n");
    return { line: before.split("\n").length, column: offset - lastNewline };
  };
  const a = location(start), b = location(end);
  return { path, hash, startLine: a.line, startColumn: a.column, endLine: b.line, endColumn: b.column, startOffset: start, endOffset: end, startByte: Buffer.byteLength(text.slice(0, start)), endByte: Buffer.byteLength(text.slice(0, end)) };
}
export function safeLabel(value: string, fallback = "Unresolved syntax"): string {
  return /^[\w@./: ()$-]{1,120}$/.test(value) && !value.startsWith("/") && !/^[A-Za-z]:/.test(value) ? value : fallback;
}
export function discoveredOrigins(value: string): string[] {
  const found = new Set<string>();
  for (const match of value.matchAll(/\b(?:https?|wss?):\/\/[^\s"'`<>\\{}]+/gi)) {
    try {
      const url = new URL(match[0]);
      if (["http:", "https:", "ws:", "wss:"].includes(url.protocol) && !url.username && !url.password && url.hostname.length <= 253) found.add(url.origin);
    } catch { /* Dynamic declarations are not resolved destination claims. */ }
  }
  return [...found].sort();
}
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
