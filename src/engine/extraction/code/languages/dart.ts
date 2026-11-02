import type { CodeSymbolType } from "../../../types.js";
import { namedChildren, type TSNode } from "../tree-sitter/nodes.js";
import type { LanguageAdapter } from "../adapter.js";
import {
  extractCommonModifiers,
  extractGenericSignature,
  extractPrecedingDoc,
} from "../families/metadata.js";

const SIGNATURE_TYPES = new Set([
  "declaration",
  "function_signature",
  "getter_signature",
  "method_signature",
  "setter_signature",
]);

const VARIABLE_LIST_TYPES = new Set([
  "initialized_identifier_list",
  "static_final_declaration_list",
]);

const TYPE_TYPES = new Set([
  "class_definition",
  "enum_declaration",
  "extension_declaration",
  "mixin_declaration",
]);

// The Dart grammar emits a signature and its `function_body` as siblings, so a
// function entity is the span from the signature to the end of the following body.
export const DART_ADAPTER: LanguageAdapter = {
  format: "dart",
  entityTypes: new Set([
    ...TYPE_TYPES,
    "type_alias",
    ...SIGNATURE_TYPES,
    ...VARIABLE_LIST_TYPES,
  ]),
  scopeTypes: TYPE_TYPES,
  shouldIndexEntity(node) {
    if (VARIABLE_LIST_TYPES.has(node.type)) {
      return node.parent?.type === "program";
    }
    return true;
  },
  resolveEntity(node) {
    const body = node.nextNamedSibling;
    return SIGNATURE_TYPES.has(node.type) && body?.type === "function_body"
      ? spanNode(node, body)
      : node;
  },
  extractName(node) {
    switch (node.type) {
      case "mixin_declaration":
        return child(node, "identifier")?.text;
      case "type_alias":
        return child(node, "type_identifier")?.text;
      case "method_signature":
      case "declaration":
        return memberName(node);
      default:
        if (VARIABLE_LIST_TYPES.has(node.type)) {
          return variableNames(node);
        }
        return node.childForFieldName("name")?.text;
    }
  },
  classifyNode(node): CodeSymbolType | undefined {
    if (node.type === "declaration") {
      return namedChildren(node).some((c) =>
        c.type.endsWith("constructor_signature"),
      )
        ? "function"
        : "value";
    }
    if (VARIABLE_LIST_TYPES.has(node.type)) {
      return "value";
    }
    if (
      node.type === "mixin_declaration" ||
      node.type === "extension_declaration"
    ) {
      return "class";
    }
    if (node.type.endsWith("_signature")) {
      return "function";
    }
    return undefined;
  },
  extractSignature: extractGenericSignature,
  extractDoc: extractPrecedingDoc,
  extractModifiers: extractCommonModifiers,
};

function memberName(node: TSNode): string | undefined {
  for (const item of namedChildren(node)) {
    switch (item.type) {
      case "function_signature":
      case "getter_signature":
      case "setter_signature":
      case "constructor_signature":
        return item.childForFieldName("name")?.text;
      case "factory_constructor_signature":
      case "redirecting_factory_constructor_signature":
      case "constant_constructor_signature":
        return namedChildren(item)
          .filter((c) => c.type === "identifier")
          .map((c) => c.text)
          .join(".");
      case "operator_signature":
        return `operator ${child(item, "binary_operator")?.text ?? item.text.split("(")[0]?.replace(/^.*operator\s*/, "")}`.trim();
      default:
        if (VARIABLE_LIST_TYPES.has(item.type)) {
          return variableNames(item);
        }
    }
  }
  return undefined;
}

function variableNames(node: TSNode): string | undefined {
  const names = namedChildren(node)
    .map((item) =>
      item.type === "identifier"
        ? item.text
        : (item.childForFieldName("name") ?? child(item, "identifier"))?.text,
    )
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(", ") : undefined;
}

function child(node: TSNode, type: string): TSNode | undefined {
  return namedChildren(node).find((c) => c.type === type);
}

const SOURCE_TEXT = new WeakMap<object, string>();

function spanNode(signature: TSNode, body: TSNode): TSNode {
  const tree = signature.tree;
  let source = SOURCE_TEXT.get(tree);
  if (source === undefined) {
    source = tree.rootNode.text;
    SOURCE_TEXT.set(tree, source);
  }
  const text = source.slice(signature.startIndex, body.endIndex);

  return new Proxy(signature, {
    get(target, property) {
      switch (property) {
        case "text":
          return text;
        case "endIndex":
          return body.endIndex;
        case "endPosition":
          return body.endPosition;
        case "childForFieldName":
          return (field: string) =>
            field === "body" ? body : target.childForFieldName(field);
        default: {
          const value: unknown = Reflect.get(target, property, target);
          return typeof value === "function"
            ? (value as (...args: unknown[]) => unknown).bind(target)
            : value;
        }
      }
    },
  });
}
