import type { TSNode } from "../tree-sitter/nodes.js";
import type { LanguageAdapter } from "../adapter.js";
import { extractPrecedingDoc } from "../families/metadata.js";
import { createNameFieldAdapter } from "../families/name-field.js";

const BASE = createNameFieldAdapter(
  "ruby",
  ["class", "module", "singleton_class", "method", "singleton_method", "alias"],
  ["class", "module", "singleton_class"],
  // Keywords such as `class` and `alias` are anonymous nodes sharing the declaration types.
  { shouldIndexEntity: (node) => node.isNamed },
);

export const RUBY_ADAPTER: LanguageAdapter = {
  ...BASE,
  shouldEnterScope: (node) => node.isNamed,
  extractName(node) {
    switch (node.type) {
      case "singleton_class":
        return `<< ${node.childForFieldName("value")?.text ?? "self"}`;
      case "singleton_method": {
        const object = node.childForFieldName("object")?.text;
        const name = node.childForFieldName("name")?.text;
        return object && name ? `${object}.${name}` : name;
      }
      default:
        return node.childForFieldName("name")?.text;
    }
  },
  extractSignature(node) {
    const body = node.childForFieldName("body");
    const text =
      body && body.startIndex > node.startIndex
        ? node.text.slice(0, body.startIndex - node.startIndex)
        : (node.text.split(/\r?\n/)[0] ?? "");
    // A class may hold comments between its header and body; keep only code.
    const signature = text
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*#.*$/, ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\s*=$/, "");

    return signature.length > 0 ? signature : undefined;
  },
  extractDoc(node) {
    return extractPrecedingDoc(node) ?? leadingBodyDoc(node);
  },
};

// The first member of a class body sits inside body_statement, while comments written
// above it are siblings of that body_statement inside the class node.
function leadingBodyDoc(node: TSNode): string | undefined {
  const body = node.parent;
  if (
    body?.type !== "body_statement" ||
    body.firstNamedChild?.startIndex !== node.startIndex
  ) {
    return undefined;
  }

  return extractPrecedingDoc(body);
}
