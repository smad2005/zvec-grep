import type { CodeSymbolType } from "../../../types.js";
import type { LanguageAdapter } from "../adapter.js";
import { createNameFieldAdapter } from "../families/name-field.js";
import { namedChildren, type TSNode } from "../tree-sitter/nodes.js";

const BASE = createNameFieldAdapter(
  "csharp",
  [
    "class_declaration",
    "struct_declaration",
    "record_declaration",
    "record_struct_declaration",
    "interface_declaration",
    "enum_declaration",
    "delegate_declaration",
    "method_declaration",
    "constructor_declaration",
    "destructor_declaration",
    "property_declaration",
    "field_declaration",
    "event_field_declaration",
    "event_declaration",
    "indexer_declaration",
    "operator_declaration",
    "conversion_operator_declaration",
  ],
  [
    "namespace_declaration",
    "file_scoped_namespace_declaration",
    "class_declaration",
    "struct_declaration",
    "record_declaration",
    "record_struct_declaration",
    "interface_declaration",
  ],
);

export const CSHARP_ADAPTER: LanguageAdapter = {
  ...BASE,
  extractName(node) {
    switch (node.type) {
      case "field_declaration":
      case "event_field_declaration":
        return variableNames(node);
      case "indexer_declaration":
        return "this[]";
      case "operator_declaration":
        return /\boperator\s*([^\s(]+)/.exec(node.text)?.[0];
      case "conversion_operator_declaration":
        return /\b(?:implicit|explicit)\s+operator\s+[^\s(]+/.exec(
          node.text,
        )?.[0];
      default:
        return BASE.extractName(node);
    }
  },
  classifyNode(node): CodeSymbolType | undefined {
    switch (node.type) {
      case "delegate_declaration":
        return "alias";
      case "field_declaration":
      case "event_field_declaration":
      case "event_declaration":
        return "value";
      case "indexer_declaration":
      case "operator_declaration":
      case "conversion_operator_declaration":
        return "function";
      default:
        return undefined;
    }
  },
};

function variableNames(node: TSNode): string | undefined {
  const declaration = namedChildren(node).find(
    (child) => child.type === "variable_declaration",
  );
  const names = (declaration ? namedChildren(declaration) : [])
    .filter((child) => child.type === "variable_declarator")
    .map(
      (declarator) =>
        (
          declarator.childForFieldName("name") ??
          namedChildren(declarator).find((c) => c.type === "identifier")
        )?.text,
    )
    .filter((name): name is string => Boolean(name));

  return names.length > 0 ? names.join(", ") : undefined;
}
