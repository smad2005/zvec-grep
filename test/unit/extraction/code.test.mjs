import assert from "node:assert/strict";
import test from "node:test";
import { CodeExtractor } from "../../../dist/engine/extraction/code/extractor.js";
import { extractForIndexing } from "../../../dist/engine/extraction/runtime.js";
import { vectorContentForFragment } from "../../../dist/engine/extraction/vector-content.js";

function codeSource(format, text, relativePath = `fixture.${format}`) {
  return {
    kind: "text",
    text,
    file: {
      id: `file-${format}`,
      absolutePath: `/repo/${relativePath}`,
      relativePath,
      rootPath: "/repo",
      sizeBytes: text.length,
      lastModifiedTime: 1,
      kind: "code",
      format,
    },
  };
}

function fragmentNamed(fragments, name) {
  const fragment = fragments.find(
    (candidate) => candidate.metadata?.symbolName === name,
  );
  assert.ok(fragment, `expected a fragment for ${name}`);
  return fragment;
}

function assertSourceBackedFragment(source, fragment) {
  assert.equal(fragment.range.kind, "text");
  assert.equal(fragment.content.kind, "text");
  assert.equal(
    fragment.content.text,
    source.text.slice(fragment.range.startOffset, fragment.range.endOffset),
  );
}

test("code extractor preserves TypeScript metadata, scope, and source ranges", async () => {
  const source = codeSource(
    "typescript",
    [
      "/** Adds one. */",
      "async function add(value: number): Promise<number> {",
      "  return helper(value);",
      "}",
      "export function publish() { return add(1); }",
      "class Box {",
      "  private value = 1;",
      "  static create() { return new Box(); }",
      "}",
    ].join("\n"),
    "contract.ts",
  );
  const fragments = await new CodeExtractor().extract(source, {
    maxChunkChars: 500,
    chunkOverlapChars: 50,
  });
  const add = fragmentNamed(fragments, "add");
  const publish = fragmentNamed(fragments, "publish");
  const create = fragmentNamed(fragments, "create");

  assertSourceBackedFragment(source, add);
  assertSourceBackedFragment(source, publish);
  assertSourceBackedFragment(source, create);
  assert.deepEqual(add.metadata, {
    kind: "code",
    symbolType: "function",
    symbolName: "add",
    scope: null,
    nodeType: "function_declaration",
    signature: "async function add(value: number): Promise<number>",
    doc: "Adds one.",
    modifiers: ["async"],
  });
  assert.deepEqual(publish.metadata.modifiers, ["exported"]);
  assert.deepEqual(create.metadata, {
    kind: "code",
    symbolType: "function",
    symbolName: "create",
    scope: "Box",
    nodeType: "method_definition",
    signature: "static create()",
    doc: null,
    modifiers: ["static"],
  });
  assert.equal(add.range.startLine, 2);
  assert.equal(create.range.startLine, 8);
  assert.equal(
    new Set(fragments.map((fragment) => fragment.id)).size,
    fragments.length,
  );
  assert.equal(
    fragments.every((fragment) => fragment.id.length === 64),
    true,
  );
});

test("code extractor preserves language-specific symbols and scopes", async () => {
  const extractor = new CodeExtractor();
  const c = await extractor.extract(
    codeSource(
      "c",
      [
        "typedef struct Widget { int value; } Widget;",
        "static int add(int a, int b) { return a + b; }",
      ].join("\n"),
      "fixture.c",
    ),
  );
  const go = await extractor.extract(
    codeSource(
      "go",
      [
        "package demo",
        "type Widget struct { value int }",
        "func (w *Widget) Value() int { return w.value }",
        "type Reader interface { Read() string }",
      ].join("\n"),
      "fixture.go",
    ),
  );
  const python = await extractor.extract(
    codeSource(
      "python",
      [
        "class Service:",
        "    @staticmethod",
        "    async def fetch(value: str) -> str:",
        "        return value",
      ].join("\n"),
      "fixture.py",
    ),
  );

  assert.deepEqual(fragmentNamed(c, "Widget").metadata, {
    kind: "code",
    symbolType: "class",
    symbolName: "Widget",
    scope: null,
    nodeType: "type_definition",
    signature: "typedef struct Widget { int value; } Widget",
    doc: null,
    modifiers: [],
  });
  assert.deepEqual(fragmentNamed(c, "add").metadata.modifiers, ["static"]);
  assert.deepEqual(fragmentNamed(go, "Value").metadata, {
    kind: "code",
    symbolType: "function",
    symbolName: "Value",
    scope: "Widget",
    nodeType: "method_declaration",
    signature: "func (w *Widget) Value() int",
    doc: null,
    modifiers: ["exported"],
  });
  assert.equal(fragmentNamed(go, "Reader").metadata.symbolType, "interface");
  assert.equal(fragmentNamed(go, "Read").metadata.scope, "Reader");
  assert.deepEqual(fragmentNamed(python, "fetch").metadata, {
    kind: "code",
    symbolType: "function",
    symbolName: "fetch",
    scope: "Service",
    nodeType: "decorated_definition",
    signature: "async def fetch(value: str) -> str:",
    doc: null,
    modifiers: ["async", "static"],
  });
});

test("large code entities emit searchable outlines and grouped source windows", async () => {
  const source = codeSource(
    "typescript",
    [
      "export class Service {",
      "  first(value: string) { return value.repeat(20); }",
      "  second() { return this.first(fetchValue()); }",
      "  third() { return new Service(); }",
      "}",
      "export function orchestrate(value: string) {",
      "  const first = load(value);",
      "  const second = client.fetch(first);",
      "  return finalize(second);",
      "}",
    ].join("\n"),
    "large.ts",
  );
  const maxChunkChars = 140;
  const fragments = await new CodeExtractor().extract(source, {
    maxChunkChars,
    chunkOverlapChars: 30,
  });
  const serviceOutline = fragments.find(
    (fragment) =>
      fragment.metadata?.symbolName === "Service" &&
      fragment.group === fragment.id,
  );
  const functionOutline = fragments.find(
    (fragment) =>
      fragment.metadata?.symbolName === "orchestrate" &&
      fragment.group === fragment.id,
  );
  assert.ok(serviceOutline);
  assert.ok(functionOutline);
  assert.match(serviceOutline.content.text, /members:/);
  assert.match(serviceOutline.content.text, /function first\(value: string\)/);
  assert.match(serviceOutline.content.text, /function second\(\)/);
  assert.match(
    functionOutline.content.text,
    /calls: load, client\.fetch, finalize/,
  );

  const serviceWindows = fragments.filter(
    (fragment) =>
      fragment.group === serviceOutline.id && fragment.id !== serviceOutline.id,
  );
  assert.ok(serviceWindows.length >= 2);
  for (const fragment of serviceWindows) {
    assertSourceBackedFragment(source, fragment);
    assert.ok(fragment.content.text.length <= maxChunkChars);
  }
  assert.ok(
    serviceWindows[0].range.endOffset > serviceWindows[1].range.startOffset,
    "adjacent windows should preserve the requested overlap",
  );
});

test("indexing compacts AST gaps without changing stored source windows", async () => {
  const source = codeSource(
    "python",
    [
      "def spaced() -> str:",
      "    first_value = prepare()",
      ...Array.from({ length: 70 }, () => ""),
      "    second_value = transform(first_value)",
      "    return second_value",
    ].join("\n"),
    "spaced.py",
  );
  const maxChunkChars = 120;
  const prepared = await extractForIndexing(source, {
    maxChunkChars,
    chunkOverlapChars: 18,
  });
  const major = prepared.find(
    ({ fragment }) =>
      fragment.metadata?.symbolName === "spaced" &&
      fragment.group === fragment.id,
  );
  assert.ok(major);
  assert.match(major.fragment.content.text, /calls: prepare, transform/);

  const compactWindow = prepared.find(
    ({ fragment, embeddingSource }) =>
      fragment.group === major.fragment.id &&
      embeddingSource?.kind === "text" &&
      embeddingSource.text.includes("first_value = prepare()") &&
      embeddingSource.text.includes("second_value = transform(first_value)"),
  );
  assert.ok(compactWindow);
  assertSourceBackedFragment(source, compactWindow.fragment);
  assert.ok(compactWindow.fragment.content.text.length > maxChunkChars);
  assert.doesNotMatch(compactWindow.embeddingSource.text, /\n\n/u);

  const vectorContent = vectorContentForFragment(
    compactWindow.fragment,
    compactWindow.embeddingSource,
    maxChunkChars,
  );
  assert.equal(vectorContent.kind, "text");
  assert.ok(vectorContent.text.length <= maxChunkChars);
  assert.match(vectorContent.text, /^symbol: function spaced/m);
});

test("component script extraction remaps multiple blocks and preserves fallbacks", async () => {
  const extractor = new CodeExtractor();
  const source = codeSource(
    "svelte",
    [
      "<h1>Hello</h1>",
      "<script>",
      "export const first = () => 1;",
      "</script>",
      "<p>Middle</p>",
      '<script lang="ts">',
      "export function second(value: number) { return value; }",
      "</script>",
    ].join("\n"),
    "fixture.svelte",
  );
  const fragments = await extractor.extract(source);
  const first = fragmentNamed(fragments, "first");
  const second = fragmentNamed(fragments, "second");

  assertSourceBackedFragment(source, first);
  assertSourceBackedFragment(source, second);
  assert.equal(first.range.startLine, 3);
  assert.equal(second.range.startLine, 7);
  assert.equal(
    new Set(fragments.map((fragment) => fragment.id)).size,
    fragments.length,
  );

  const plainSource = codeSource(
    "vue",
    '<template><p>x</p></template>\n<script lang="ts">\n// no declarations\n</script>',
    "plain.vue",
  );
  const [plain] = await extractor.extract(plainSource);
  assertSourceBackedFragment(plainSource, plain);
  assert.equal(plain.metadata, undefined);
  assert.equal(plain.content.text, "\n// no declarations\n");

  const noScriptSource = codeSource(
    "svelte",
    "<h1>No script</h1>",
    "no-script.svelte",
  );
  const [noScript] = await extractor.extract(noScriptSource);
  assertSourceBackedFragment(noScriptSource, noScript);
  assert.equal(noScript.metadata, undefined);
  assert.equal(noScript.content.text, noScriptSource.text);
});

test("code chunk boundaries never split Unicode surrogate pairs", async () => {
  const source = codeSource(
    "typescript",
    `export function emoji() { return "${"😀".repeat(80)}"; }`,
    "unicode.ts",
  );
  const fragments = await new CodeExtractor().extract(source, {
    maxChunkChars: 31,
    chunkOverlapChars: 7,
  });
  const windows = fragments.filter(
    (fragment) =>
      fragment.metadata?.symbolName === "emoji" &&
      fragment.group !== fragment.id,
  );
  assert.ok(windows.length > 2);

  for (const fragment of windows) {
    assertSourceBackedFragment(source, fragment);
    assert.ok(fragment.content.text.length <= 31);
    assert.doesNotMatch(fragment.content.text, /[\uD800-\uDBFF]$/u);
    assert.doesNotMatch(fragment.content.text, /^[\uDC00-\uDFFF]/u);
  }
});

test("code extractor parses Ruby, Dart, C#, and Kotlin structurally", async () => {
  const extractor = new CodeExtractor();
  const ruby = codeSource(
    "ruby",
    [
      "module Shop",
      "  class Cart < Base",
      "    # Adds an item.",
      "    def add(item)",
      "      items << item",
      "    end",
      "    def self.empty; end",
      "  end",
      "end",
    ].join("\n"),
    "fixture.rb",
  );
  const dart = codeSource(
    "dart",
    [
      "class Cart {",
      "  final List<int> items;",
      "  Cart(this.items);",
      "  /// Adds an item.",
      "  void add(int item) {",
      "    items.add(item);",
      "  }",
      "}",
      "int total(Cart cart) => cart.items.length;",
    ].join("\n"),
    "fixture.dart",
  );
  const csharp = codeSource(
    "csharp",
    [
      "namespace Shop;",
      "public class Cart {",
      "  private int _count = 0;",
      "  public delegate void Changed(int count);",
      "  public static Cart operator +(Cart a, Cart b) => a;",
      "}",
    ].join("\n"),
    "fixture.cs",
  );
  const kotlin = codeSource(
    "kotlin",
    [
      "package shop",
      "/** Storage. */",
      "interface Repo { fun load(): String }",
      "object Registry { fun get() = 1 }",
      "enum class Color { RED; fun x() = 1 }",
    ].join("\n"),
    "fixture.kt",
  );

  const rubyFragments = await extractor.extract(ruby);
  const add = fragmentNamed(rubyFragments, "add");
  assert.equal(add.metadata.symbolType, "function");
  assert.equal(add.metadata.scope, "Shop::Cart");
  assert.equal(add.metadata.signature, "def add(item)");
  assert.equal(add.metadata.doc, "Adds an item.");
  assert.equal(
    fragmentNamed(rubyFragments, "Shop").metadata.symbolType,
    "module",
  );
  assert.equal(
    fragmentNamed(rubyFragments, "self.empty").metadata.scope,
    "Shop::Cart",
  );
  assert.ok(rubyFragments.every((fragment) => fragment.metadata?.symbolName));

  const dartFragments = await extractor.extract(dart);
  const dartAdd = fragmentNamed(dartFragments, "add");
  assert.equal(dartAdd.metadata.scope, "Cart");
  assert.equal(dartAdd.metadata.signature, "void add(int item)");
  assert.equal(dartAdd.metadata.doc, "Adds an item.");
  // The signature and its sibling body form a single entity.
  assert.match(dartAdd.content.text, /items\.add\(item\);\n {2}\}$/);
  assertSourceBackedFragment(dart, dartAdd);
  assert.equal(
    fragmentNamed(dartFragments, "items").metadata.symbolType,
    "value",
  );
  assert.equal(
    fragmentNamed(dartFragments, "total").content.text,
    "int total(Cart cart) => cart.items.length;",
  );

  const csharpFragments = await extractor.extract(csharp);
  assert.equal(
    fragmentNamed(csharpFragments, "_count").metadata.symbolType,
    "value",
  );
  assert.equal(
    fragmentNamed(csharpFragments, "Changed").metadata.symbolType,
    "alias",
  );
  assert.equal(
    fragmentNamed(csharpFragments, "operator +").metadata.scope,
    "Shop::Cart",
  );

  const kotlinFragments = await extractor.extract(kotlin);
  assert.equal(
    fragmentNamed(kotlinFragments, "Repo").metadata.symbolType,
    "interface",
  );
  assert.equal(fragmentNamed(kotlinFragments, "Repo").metadata.doc, "Storage.");
  assert.equal(
    fragmentNamed(kotlinFragments, "Registry").metadata.symbolType,
    "class",
  );
  assert.equal(
    fragmentNamed(kotlinFragments, "Color").metadata.signature,
    "enum class Color",
  );
});
