import type { TSNode } from "../tree-sitter/nodes.js";
import type { LanguageAdapter } from "../adapter.js";
import { createNameFieldAdapter } from "../families/name-field.js";

const BASE = createNameFieldAdapter(
  "kotlin",
  [
    "class_declaration",
    "object_declaration",
    "companion_object",
    "function_declaration",
    "property_declaration",
    "type_alias",
  ],
  ["class_declaration", "object_declaration", "companion_object"],
);

// The Kotlin grammar has no `name` fields: class and object names are `type_identifier`
// children, function names `simple_identifier`, property names sit in `variable_declaration`.
export const KOTLIN_ADAPTER: LanguageAdapter = {
  ...BASE,
  extractName(node) {
    switch (node.type) {
      case "function_declaration":
        return child(node, "simple_identifier")?.text;
      case "property_declaration": {
        const variable =
          child(node, "variable_declaration") ??
          child(node, "multi_variable_declaration");
        return variable
          ? (child(variable, "simple_identifier")?.text ?? variable.text)
          : undefined;
      }
      case "companion_object":
        return child(node, "type_identifier")?.text ?? "companion";
      default:
        return child(node, "type_identifier")?.text ?? BASE.extractName(node);
    }
  },
};

function child(node: TSNode, type: string): TSNode | undefined {
  return node.namedChildren.find((c) => c.type === type);
}
