import type { CodeSymbolType } from "../../../types.js";
import { children, namedChildren, type TSNode } from "../tree-sitter/nodes.js";
import type { LanguageAdapter } from "../adapter.js";
import { extractTrailingDoc } from "../families/metadata.js";
import { createNameFieldAdapter } from "../families/name-field.js";

const BASE = createNameFieldAdapter(
  "kotlin",
  [
    "class_declaration",
    "object_declaration",
    "companion_object",
    "function_declaration",
    "secondary_constructor",
    "property_declaration",
    "type_alias",
  ],
  ["class_declaration", "object_declaration", "companion_object"],
);

const BODY_TYPES = new Set(["class_body", "enum_class_body", "function_body"]);

// The Kotlin grammar has no `name` fields: class and object names are `type_identifier`
// children, function names `simple_identifier`, property names sit in `variable_declaration`.
export const KOTLIN_ADAPTER: LanguageAdapter = {
  ...BASE,
  extractName(node) {
    switch (node.type) {
      case "function_declaration":
        return child(node, "simple_identifier")?.text;
      case "secondary_constructor":
        return "constructor";
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
  classifyNode(node): CodeSymbolType | undefined {
    switch (node.type) {
      case "class_declaration":
        return children(node).some((c) => c.type === "interface")
          ? "interface"
          : "class";
      case "object_declaration":
      case "companion_object":
        return "class";
      default:
        return undefined;
    }
  },
  extractDoc(node) {
    const previous = node.previousNamedSibling;
    return (
      BASE.extractDoc?.(node) ??
      (previous &&
      (previous.type === "package_header" || previous.type === "import_list")
        ? extractTrailingDoc(previous)
        : undefined)
    );
  },
  // Bodies are unnamed `class_body`/`enum_class_body`/`function_body` children.
  extractSignature(node) {
    const body = namedChildren(node).find((c) => BODY_TYPES.has(c.type));
    if (
      !body ||
      (body.type === "function_body" && !body.text.startsWith("{"))
    ) {
      return BASE.extractSignature?.(node);
    }
    const signature = node.text
      .slice(0, body.startIndex - node.startIndex)
      .replace(/\s+/g, " ")
      .trim();
    return signature.length > 0 ? signature : undefined;
  },
};

function child(node: TSNode, type: string): TSNode | undefined {
  return namedChildren(node).find((c) => c.type === type);
}
