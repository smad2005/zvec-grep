import { createNameFieldAdapter } from "../families/name-field.js";

export const CSHARP_ADAPTER = createNameFieldAdapter(
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
