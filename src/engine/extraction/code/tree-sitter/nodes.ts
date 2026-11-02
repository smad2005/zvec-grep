import type { Node } from "web-tree-sitter";

export type TSNode = Node;

export function findIdentifierLeaf(node: TSNode): TSNode | null {
  const wrappers = new Set([
    "array_declarator",
    "function_declarator",
    "init_declarator",
    "parenthesized_declarator",
    "pointer_declarator",
    "reference_declarator",
  ]);

  let current: TSNode | null = node;

  for (let depth = 0; current && depth < 16; depth++) {
    if (current.type === "identifier" || current.type.endsWith("_identifier")) {
      return current;
    }

    if (
      current.type === "destructor_name" ||
      current.type === "operator_name"
    ) {
      return current;
    }

    if (wrappers.has(current.type)) {
      current = current.childForFieldName("declarator");
      continue;
    }

    return null;
  }

  return null;
}

// web-tree-sitter types child arrays as (Node | null)[]; real children are never null.
export function namedChildren(node: TSNode): TSNode[] {
  return node.namedChildren.filter((child): child is TSNode => child !== null);
}

export function children(node: TSNode): TSNode[] {
  return node.children.filter((child): child is TSNode => child !== null);
}
