export const STRUCTURED_CODE_FORMATS = [
  "c",
  "cpp",
  "csharp",
  "dart",
  "go",
  "java",
  "javascript",
  "jsx",
  "kotlin",
  "python",
  "ruby",
  "rust",
  "tsx",
  "typescript",
] as const;

export type StructuredCodeFormat = (typeof STRUCTURED_CODE_FORMATS)[number];

export const COMPONENT_CODE_FORMATS = ["vue", "svelte"] as const;
