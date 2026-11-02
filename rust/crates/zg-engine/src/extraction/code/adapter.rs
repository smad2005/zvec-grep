use tree_sitter::Node;

use crate::domain::{FileFormat, Language, SymbolType};

#[derive(Clone, Copy, Debug)]
pub(super) struct LanguageAdapter {
    kind: Language,
    entity_types: &'static [&'static str],
    scope_types: &'static [&'static str],
}

const C: LanguageAdapter = LanguageAdapter {
    kind: Language::C,
    entity_types: &[
        "declaration",
        "field_declaration",
        "function_definition",
        "macro_type_specifier",
        "struct_specifier",
        "union_specifier",
        "enum_specifier",
        "type_definition",
    ],
    scope_types: &["struct_specifier", "union_specifier"],
};
const CPP: LanguageAdapter = LanguageAdapter {
    kind: Language::Cpp,
    entity_types: &[
        "alias_declaration",
        "declaration",
        "field_declaration",
        "function_definition",
        "macro_type_specifier",
        "class_specifier",
        "struct_specifier",
        "union_specifier",
        "enum_specifier",
    ],
    scope_types: &[
        "namespace_definition",
        "class_specifier",
        "struct_specifier",
        "union_specifier",
    ],
};
const CSHARP: LanguageAdapter = LanguageAdapter {
    kind: Language::CSharp,
    entity_types: &[
        "class_declaration",
        "constructor_declaration",
        "conversion_operator_declaration",
        "delegate_declaration",
        "destructor_declaration",
        "enum_declaration",
        "event_declaration",
        "event_field_declaration",
        "field_declaration",
        "indexer_declaration",
        "interface_declaration",
        "method_declaration",
        "operator_declaration",
        "property_declaration",
        "record_declaration",
        "record_struct_declaration",
        "struct_declaration",
    ],
    scope_types: &[
        "class_declaration",
        "file_scoped_namespace_declaration",
        "interface_declaration",
        "namespace_declaration",
        "record_declaration",
        "record_struct_declaration",
        "struct_declaration",
    ],
};
const DART: LanguageAdapter = LanguageAdapter {
    kind: Language::Dart,
    entity_types: &[
        "class_declaration",
        "declaration",
        "enum_declaration",
        "extension_declaration",
        "extension_type_declaration",
        "function_declaration",
        "getter_declaration",
        "method_declaration",
        "mixin_declaration",
        "setter_declaration",
        "top_level_variable_declaration",
        "type_alias",
    ],
    scope_types: &[
        "class_declaration",
        "enum_declaration",
        "extension_declaration",
        "extension_type_declaration",
        "mixin_declaration",
    ],
};
const GO: LanguageAdapter = LanguageAdapter {
    kind: Language::Go,
    entity_types: &[
        "function_declaration",
        "method_elem",
        "method_spec",
        "method_declaration",
        "type_alias",
        "type_spec",
    ],
    scope_types: &["type_spec"],
};
const JAVA: LanguageAdapter = LanguageAdapter {
    kind: Language::Java,
    entity_types: &[
        "annotation_type_declaration",
        "class_declaration",
        "constructor_declaration",
        "constant_declaration",
        "enum_declaration",
        "field_declaration",
        "interface_declaration",
        "method_declaration",
        "record_declaration",
    ],
    scope_types: &[
        "annotation_type_declaration",
        "class_declaration",
        "enum_declaration",
        "interface_declaration",
        "record_declaration",
    ],
};
const JAVASCRIPT: LanguageAdapter = LanguageAdapter {
    kind: Language::JavaScript,
    entity_types: &[
        "class_declaration",
        "field_definition",
        "function_declaration",
        "generator_function_declaration",
        "method_definition",
        "pair",
        "variable_declarator",
    ],
    scope_types: &["class_declaration"],
};
const KOTLIN: LanguageAdapter = LanguageAdapter {
    kind: Language::Kotlin,
    entity_types: &[
        "class_declaration",
        "companion_object",
        "function_declaration",
        "object_declaration",
        "property_declaration",
        "secondary_constructor",
        "type_alias",
    ],
    scope_types: &["class_declaration", "companion_object", "object_declaration"],
};
const PYTHON: LanguageAdapter = LanguageAdapter {
    kind: Language::Python,
    entity_types: &[
        "class_definition",
        "decorated_definition",
        "function_definition",
    ],
    scope_types: &["class_definition", "decorated_definition"],
};
const RUBY: LanguageAdapter = LanguageAdapter {
    kind: Language::Ruby,
    entity_types: &[
        "alias",
        "class",
        "method",
        "module",
        "singleton_class",
        "singleton_method",
    ],
    scope_types: &["class", "module", "singleton_class"],
};
const RUST: LanguageAdapter = LanguageAdapter {
    kind: Language::Rust,
    entity_types: &[
        "enum_item",
        "const_item",
        "function_item",
        "function_signature_item",
        "impl_item",
        "mod_item",
        "static_item",
        "struct_item",
        "trait_item",
        "type_item",
        "union_item",
    ],
    scope_types: &["impl_item", "mod_item", "trait_item"],
};
const TYPESCRIPT: LanguageAdapter = LanguageAdapter {
    kind: Language::TypeScript,
    entity_types: &[
        "abstract_class_declaration",
        "abstract_method_signature",
        "class_declaration",
        "enum_declaration",
        "field_definition",
        "function_declaration",
        "function_signature",
        "generator_function_declaration",
        "interface_declaration",
        "internal_module",
        "method_signature",
        "method_definition",
        "module",
        "pair",
        "property_signature",
        "public_field_definition",
        "type_alias_declaration",
        "variable_declarator",
    ],
    scope_types: &[
        "abstract_class_declaration",
        "class_declaration",
        "internal_module",
        "interface_declaration",
        "module",
    ],
};

pub(super) fn resolve_adapter(format: FileFormat) -> Option<&'static LanguageAdapter> {
    match format {
        FileFormat::C => Some(&C),
        FileFormat::Cpp => Some(&CPP),
        FileFormat::CSharp => Some(&CSHARP),
        FileFormat::Dart => Some(&DART),
        FileFormat::Go => Some(&GO),
        FileFormat::Java => Some(&JAVA),
        FileFormat::JavaScript => Some(&JAVASCRIPT),
        FileFormat::Kotlin => Some(&KOTLIN),
        FileFormat::Python => Some(&PYTHON),
        FileFormat::Ruby => Some(&RUBY),
        FileFormat::Rust => Some(&RUST),
        FileFormat::TypeScript => Some(&TYPESCRIPT),
        _ => None,
    }
}

impl LanguageAdapter {
    pub(super) const fn language(self) -> Language {
        self.kind
    }

    pub(super) fn is_entity(self, node: Node<'_>) -> bool {
        self.entity_types.contains(&node.kind()) && self.should_index_entity(node)
    }

    pub(super) fn is_scope(self, node: Node<'_>) -> bool {
        self.scope_types.contains(&node.kind()) && self.should_enter_scope(node)
    }

    pub(super) fn resolve_entities<'tree>(
        self,
        node: Node<'tree>,
        source: &[u8],
    ) -> Vec<Node<'tree>> {
        if matches!(self.kind, Language::JavaScript | Language::TypeScript)
            && node.kind() == "variable_declarator"
        {
            let entities = exported_object_function_entities(node, source);
            if !entities.is_empty() {
                return entities;
            }
        }
        vec![node]
    }

    pub(super) fn enter_scope_node(self, node: Node<'_>) -> Node<'_> {
        match self.kind {
            Language::Go => node.child_by_field_name("type").unwrap_or(node),
            Language::Python if node.kind() == "decorated_definition" => {
                inner_python_definition(node)
                    .filter(|inner| inner.kind() == "class_definition")
                    .unwrap_or(node)
            }
            _ => node,
        }
    }

    pub(super) fn extract_name(self, node: Node<'_>, source: &[u8]) -> Option<String> {
        match self.kind {
            Language::C | Language::Cpp => extract_c_family_name(node, source),
            Language::Go => field_text(node, "name", source),
            Language::Java
                if matches!(node.kind(), "field_declaration" | "constant_declaration") =>
            {
                node.child_by_field_name("declarator")
                    .and_then(|declarator| field_text(declarator, "name", source))
            }
            Language::Java => name_field(node, source),
            Language::JavaScript | Language::TypeScript => {
                extract_javascript_typescript_name(node, source)
            }
            Language::Python => {
                if node.kind() == "decorated_definition" {
                    inner_python_definition(node)
                        .and_then(|inner| field_text(inner, "name", source))
                } else {
                    field_text(node, "name", source)
                }
            }
            Language::Rust => {
                if node.kind() == "impl_item" {
                    field_text(node, "type", source)
                } else {
                    field_text(node, "name", source)
                }
            }
            Language::CSharp => extract_csharp_name(node, source),
            Language::Dart => extract_dart_name(node, source),
            Language::Kotlin => extract_kotlin_name(node, source),
            Language::Ruby => extract_ruby_name(node, source),
        }
    }

    pub(super) fn scope_breadcrumb(
        self,
        node: Node<'_>,
        source: &[u8],
        breadcrumb: &[String],
    ) -> Vec<String> {
        match self.kind {
            Language::C | Language::Cpp if is_c_function_type(node.kind()) => {
                let Some(name) = extract_raw_c_function_name(node, source) else {
                    return breadcrumb.to_vec();
                };
                let mut qualifier = name
                    .split("::")
                    .filter(|part| !part.is_empty())
                    .map(str::to_owned)
                    .collect::<Vec<_>>();
                qualifier.pop();
                if qualifier.is_empty() {
                    return breadcrumb.to_vec();
                }
                if breadcrumb.last() == qualifier.first() {
                    qualifier.remove(0);
                }
                breadcrumb.iter().cloned().chain(qualifier).collect()
            }
            Language::Go if node.kind() == "method_declaration" => {
                let Some(receiver) = node.child_by_field_name("receiver") else {
                    return breadcrumb.to_vec();
                };
                let Some(receiver_type) = text(receiver, source)
                    .split(|character: char| !character.is_ascii_alphanumeric() && character != '_')
                    .rfind(|part| !part.is_empty())
                else {
                    return breadcrumb.to_vec();
                };
                breadcrumb
                    .iter()
                    .cloned()
                    .chain([receiver_type.to_owned()])
                    .collect()
            }
            Language::JavaScript | Language::TypeScript => {
                let Some(object_name) = exported_object_variable_name(node, source) else {
                    return breadcrumb.to_vec();
                };
                breadcrumb.iter().cloned().chain([object_name]).collect()
            }
            _ => breadcrumb.to_vec(),
        }
    }

    pub(super) fn classify(self, node: Node<'_>) -> Option<SymbolType> {
        match self.kind {
            Language::C | Language::Cpp => classify_c_family(node),
            Language::Go => classify_go(node),
            Language::Java if node.kind() == "field_declaration" => Some(SymbolType::Value),
            Language::JavaScript | Language::TypeScript => classify_javascript_typescript(node),
            Language::CSharp => classify_csharp(node),
            Language::Dart => classify_dart(node),
            Language::Kotlin => classify_kotlin(node),
            Language::Ruby => classify_ruby(node),
            _ => classify_code_node(node),
        }
    }

    pub(super) fn extract_signature(self, node: Node<'_>, source: &[u8]) -> Option<String> {
        match self.kind {
            Language::JavaScript | Language::TypeScript => {
                extract_javascript_signature(node, source)
            }
            Language::Python => {
                let definition = inner_python_definition(node).unwrap_or(node);
                extract_generic_signature(definition, source)
            }
            // An endless method (`def name(arg) = value`) keeps its `=` before the body.
            Language::Ruby => extract_generic_signature(node, source)
                .map(|signature| signature.trim_end_matches('=').trim_end().to_owned())
                .filter(|signature| !signature.is_empty()),
            _ => extract_generic_signature(node, source),
        }
    }

    pub(super) fn extract_doc(self, node: Node<'_>, source: &[u8]) -> Option<String> {
        let mut documentation = extract_preceding_doc(node, source);
        let mut declaration = node;
        while let Some(parent) = declaration.parent().filter(|parent| match self.kind {
            Language::JavaScript | Language::TypeScript => matches!(
                parent.kind(),
                "export_statement"
                    | "ambient_declaration"
                    | "lexical_declaration"
                    | "variable_declaration"
            ),
            Language::Go => parent.kind() == "type_declaration",
            // Comments sit beside the `class_member` wrapper, not the declaration.
            Language::Dart => parent.kind() == "class_member",
            // Comments above the first member of a body are siblings of the body.
            Language::Ruby => {
                parent.kind() == "body_statement"
                    && parent.named_child(0).is_some_and(|first| first == declaration)
            }
            _ => false,
        }) {
            if let Some(outer) = extract_preceding_doc(parent, source) {
                documentation = Some(match documentation {
                    Some(inner) => format!("{outer}\n{inner}"),
                    None => outer,
                });
            }
            declaration = parent;
        }
        if self.kind == Language::Rust {
            let inner = extract_rust_inner_doc(node, source);
            documentation = match (documentation, inner) {
                (Some(outer), Some(inner)) => Some(format!("{outer}\n{inner}")),
                (outer, inner) => outer.or(inner),
            };
        }
        documentation
    }

    fn should_index_entity(self, node: Node<'_>) -> bool {
        match self.kind {
            Language::C | Language::Cpp => {
                if matches!(node.kind(), "declaration" | "field_declaration") {
                    find_descendant_by_kind(node, "function_declarator").is_some()
                } else if node.kind() == "macro_type_specifier" {
                    // The text check is repeated by name extraction; keeping the node here
                    // lets malformed macro function types fall out when no name is found.
                    true
                } else {
                    true
                }
            }
            Language::JavaScript | Language::TypeScript => {
                should_index_javascript_typescript_entity(node)
            }
            Language::Java
                if matches!(node.kind(), "field_declaration" | "constant_declaration") =>
            {
                named_children(node)
                    .into_iter()
                    .filter(|child| child.kind() == "variable_declarator")
                    .count()
                    == 1
                    && find_descendant_by_kind(node, "class_body").is_none()
            }
            _ => true,
        }
    }

    fn should_enter_scope(self, node: Node<'_>) -> bool {
        match self.kind {
            Language::Go if node.kind() == "type_spec" => node
                .child_by_field_name("type")
                .is_some_and(|kind| matches!(kind.kind(), "interface_type" | "struct_type")),
            Language::Python if node.kind() == "decorated_definition" => {
                inner_python_definition(node)
                    .is_some_and(|inner| inner.kind() == "class_definition")
            }
            _ => true,
        }
    }
}

pub(super) fn named_children(node: Node<'_>) -> Vec<Node<'_>> {
    let mut cursor = node.walk();
    node.named_children(&mut cursor).collect()
}

pub(super) fn text<'source>(node: Node<'_>, source: &'source [u8]) -> &'source str {
    node.utf8_text(source).unwrap_or_default()
}

fn field_text(node: Node<'_>, field: &str, source: &[u8]) -> Option<String> {
    node.child_by_field_name(field)
        .map(|child| text(child, source).to_owned())
}

fn name_field(node: Node<'_>, source: &[u8]) -> Option<String> {
    field_text(node, "name", source).or_else(|| {
        named_children(node)
            .into_iter()
            .find(|child| {
                matches!(
                    child.kind(),
                    "identifier" | "property_identifier" | "type_identifier"
                )
            })
            .map(|child| text(child, source).to_owned())
    })
}

fn is_c_function_type(kind: &str) -> bool {
    matches!(
        kind,
        "declaration" | "field_declaration" | "function_definition" | "macro_type_specifier"
    )
}

fn extract_c_family_name(node: Node<'_>, source: &[u8]) -> Option<String> {
    if is_c_function_type(node.kind()) {
        return extract_raw_c_function_name(node, source)
            .map(|name| name.rsplit("::").next().unwrap_or(&name).to_owned());
    }
    if let Some(name) = node.child_by_field_name("name") {
        return Some(text(find_identifier_leaf(name).unwrap_or(name), source).to_owned());
    }
    if node.kind() == "type_definition" {
        return node
            .child_by_field_name("declarator")
            .and_then(find_identifier_leaf)
            .map(|name| text(name, source).to_owned());
    }
    None
}

fn extract_raw_c_function_name(node: Node<'_>, source: &[u8]) -> Option<String> {
    let declarator = node
        .child_by_field_name("declarator")
        .or_else(|| find_descendant_by_kind(node, "function_declarator"));
    if let Some(name) = declarator.and_then(find_identifier_leaf) {
        let name = text(name, source);
        if is_simple_c_identifier(name) {
            return Some(name.to_owned());
        }
    }
    extract_c_function_name(
        declarator.map_or_else(|| text(node, source), |item| text(item, source)),
    )
}

fn find_identifier_leaf(mut node: Node<'_>) -> Option<Node<'_>> {
    for _ in 0..16 {
        if node.kind() == "identifier"
            || node.kind().ends_with("_identifier")
            || matches!(node.kind(), "destructor_name" | "operator_name")
        {
            return Some(node);
        }
        if matches!(
            node.kind(),
            "array_declarator"
                | "function_declarator"
                | "init_declarator"
                | "parenthesized_declarator"
                | "pointer_declarator"
                | "reference_declarator"
        ) {
            node = node.child_by_field_name("declarator")?;
        } else {
            return None;
        }
    }
    None
}

fn extract_c_function_name(value: &str) -> Option<String> {
    let mut last = None;
    for (index, character) in value.char_indices() {
        if character != '(' {
            continue;
        }
        let prefix = value[..index].trim_end();
        let start = prefix
            .char_indices()
            .rev()
            .find(|(_, item)| !item.is_ascii_alphanumeric() && !matches!(item, '_' | '~' | ':'))
            .map_or(0, |(offset, item)| offset + item.len_utf8());
        let candidate = &prefix[start..];
        if is_simple_c_identifier(candidate) {
            last = Some(candidate.to_owned());
        }
    }
    last
}

fn is_simple_c_identifier(value: &str) -> bool {
    !value.is_empty()
        && value.split("::").all(|part| {
            let part = part.strip_prefix('~').unwrap_or(part);
            let mut chars = part.chars();
            chars
                .next()
                .is_some_and(|character| character.is_ascii_alphabetic() || character == '_')
                && chars.all(|character| character.is_ascii_alphanumeric() || character == '_')
        })
}

fn classify_c_family(node: Node<'_>) -> Option<SymbolType> {
    match node.kind() {
        "type_definition" => {
            let definition = node
                .child_by_field_name("type")
                .filter(|item| item.child_by_field_name("body").is_some());
            match definition.map(|item| item.kind()) {
                Some("struct_specifier") => Some(SymbolType::Class),
                Some("enum_specifier") => Some(SymbolType::Enum),
                Some("union_specifier") => None,
                _ => Some(SymbolType::Alias),
            }
        }
        "alias_declaration" => Some(SymbolType::Alias),
        "declaration" | "field_declaration"
            if find_descendant_by_kind(node, "function_declarator").is_some() =>
        {
            Some(SymbolType::Function)
        }
        _ => classify_code_node(node),
    }
}

fn classify_go(node: Node<'_>) -> Option<SymbolType> {
    match node.kind() {
        "type_alias" => Some(SymbolType::Alias),
        "type_spec" => match node.child_by_field_name("type").map(|item| item.kind()) {
            Some("interface_type") => Some(SymbolType::Interface),
            Some("struct_type") => Some(SymbolType::Class),
            _ => None,
        },
        "method_elem" | "method_spec" => Some(SymbolType::Function),
        _ => classify_code_node(node),
    }
}

fn has_child_kind(node: Node<'_>, kind: &str) -> bool {
    let mut cursor = node.walk();
    node.children(&mut cursor).any(|child| child.kind() == kind)
}

fn first_named_child_text(node: Node<'_>, kind: &str, source: &[u8]) -> Option<String> {
    named_children(node)
        .into_iter()
        .find(|child| child.kind() == kind)
        .map(|child| text(child, source).to_owned())
}

fn join_names(names: &[String]) -> Option<String> {
    (!names.is_empty()).then(|| names.join(", "))
}

fn extract_csharp_name(node: Node<'_>, source: &[u8]) -> Option<String> {
    match node.kind() {
        "field_declaration" | "event_field_declaration" => {
            let declaration = named_children(node)
                .into_iter()
                .find(|child| child.kind() == "variable_declaration")?;
            join_names(
                &named_children(declaration)
                    .into_iter()
                    .filter(|child| child.kind() == "variable_declarator")
                    .filter_map(|declarator| name_field(declarator, source))
                    .collect::<Vec<_>>(),
            )
        }
        "indexer_declaration" => Some("this[]".to_owned()),
        "operator_declaration" => {
            field_text(node, "operator", source).map(|operator| format!("operator {operator}"))
        }
        "conversion_operator_declaration" => {
            let direction = if has_child_kind(node, "explicit") {
                "explicit"
            } else {
                "implicit"
            };
            field_text(node, "type", source)
                .map(|target| format!("{direction} operator {target}"))
        }
        _ => name_field(node, source),
    }
}

fn classify_csharp(node: Node<'_>) -> Option<SymbolType> {
    match node.kind() {
        "record_struct_declaration" | "struct_declaration" => Some(SymbolType::Class),
        "delegate_declaration" => Some(SymbolType::Alias),
        "event_declaration" | "event_field_declaration" | "field_declaration"
        | "property_declaration" => Some(SymbolType::Value),
        "conversion_operator_declaration"
        | "destructor_declaration"
        | "indexer_declaration"
        | "operator_declaration" => Some(SymbolType::Function),
        _ => classify_code_node(node),
    }
}

fn extract_dart_name(node: Node<'_>, source: &[u8]) -> Option<String> {
    match node.kind() {
        "function_declaration" | "getter_declaration" | "setter_declaration" => node
            .child_by_field_name("signature")
            .and_then(|signature| field_text(signature, "name", source)),
        "method_declaration" => node
            .child_by_field_name("signature")
            .and_then(|signature| extract_dart_member_name(signature, source)),
        "declaration" | "top_level_variable_declaration" => {
            extract_dart_member_name(node, source)
        }
        "type_alias" => first_named_child_text(node, "type_identifier", source),
        "extension_type_declaration" => node
            .child_by_field_name("name")
            .map(|name| find_descendant_by_kind(name, "identifier").unwrap_or(name))
            .map(|name| text(name, source).to_owned()),
        _ => name_field(node, source),
    }
}

// Dart members wrap their names in one of several signature or variable-list nodes.
fn extract_dart_member_name(node: Node<'_>, source: &[u8]) -> Option<String> {
    named_children(node).into_iter().find_map(|item| match item.kind() {
        "constructor_signature" | "function_signature" | "getter_signature"
        | "setter_signature" => field_text(item, "name", source),
        "constant_constructor_signature"
        | "factory_constructor_signature"
        | "redirecting_factory_constructor_signature" => {
            let parts = named_children(item)
                .into_iter()
                .filter(|child| child.kind() == "identifier")
                .map(|child| text(child, source))
                .collect::<Vec<_>>();
            (!parts.is_empty()).then(|| parts.join("."))
        }
        "operator_signature" => {
            let value = text(item, source);
            let operator = value
                .split('(')
                .next()?
                .rsplit_once("operator")?
                .1
                .trim();
            (!operator.is_empty()).then(|| format!("operator {operator}"))
        }
        "identifier_list" | "initialized_identifier_list" | "static_final_declaration_list" => {
            join_names(
                &named_children(item)
                    .into_iter()
                    .filter_map(|variable| {
                        if variable.kind() == "identifier" {
                            Some(text(variable, source).to_owned())
                        } else {
                            name_field(variable, source)
                        }
                    })
                    .collect::<Vec<_>>(),
            )
        }
        _ => None,
    })
}

fn classify_dart(node: Node<'_>) -> Option<SymbolType> {
    match node.kind() {
        "class_declaration"
        | "extension_declaration"
        | "extension_type_declaration"
        | "mixin_declaration" => Some(SymbolType::Class),
        "enum_declaration" => Some(SymbolType::Enum),
        "type_alias" => Some(SymbolType::Alias),
        "function_declaration" | "getter_declaration" | "method_declaration"
        | "setter_declaration" => Some(SymbolType::Function),
        "declaration" => Some(
            if named_children(node)
                .into_iter()
                .any(|child| child.kind().ends_with("_signature"))
            {
                SymbolType::Function
            } else {
                SymbolType::Value
            },
        ),
        "top_level_variable_declaration" => Some(SymbolType::Value),
        _ => classify_code_node(node),
    }
}

fn extract_kotlin_name(node: Node<'_>, source: &[u8]) -> Option<String> {
    match node.kind() {
        "companion_object" => {
            field_text(node, "name", source).or_else(|| Some("companion".to_owned()))
        }
        "secondary_constructor" => Some("constructor".to_owned()),
        "property_declaration" => {
            if let Some(variable) = named_children(node)
                .into_iter()
                .find(|child| child.kind() == "variable_declaration")
            {
                first_named_child_text(variable, "identifier", source)
            } else {
                first_named_child_text(node, "multi_variable_declaration", source)
            }
        }
        // The alias name is the `type` field; the aliased type is a `type` child.
        "type_alias" => first_named_child_text(node, "identifier", source),
        _ => name_field(node, source),
    }
}

fn classify_kotlin(node: Node<'_>) -> Option<SymbolType> {
    match node.kind() {
        "class_declaration" if has_child_kind(node, "interface") => Some(SymbolType::Interface),
        "class_declaration" if has_child_kind(node, "enum_class_body") => Some(SymbolType::Enum),
        "class_declaration" | "companion_object" | "object_declaration" => {
            Some(SymbolType::Class)
        }
        "function_declaration" | "secondary_constructor" => Some(SymbolType::Function),
        "property_declaration" => Some(SymbolType::Value),
        "type_alias" => Some(SymbolType::Alias),
        _ => classify_code_node(node),
    }
}

fn extract_ruby_name(node: Node<'_>, source: &[u8]) -> Option<String> {
    match node.kind() {
        "singleton_class" => Some(format!(
            "<< {}",
            field_text(node, "value", source).unwrap_or_else(|| "self".to_owned())
        )),
        "singleton_method" => {
            let name = field_text(node, "name", source)?;
            Some(match field_text(node, "object", source) {
                Some(object) => format!("{object}.{name}"),
                None => name,
            })
        }
        _ => field_text(node, "name", source),
    }
}

fn classify_ruby(node: Node<'_>) -> Option<SymbolType> {
    match node.kind() {
        "class" | "singleton_class" => Some(SymbolType::Class),
        "module" => Some(SymbolType::Module),
        "alias" | "method" | "singleton_method" => Some(SymbolType::Function),
        _ => None,
    }
}

fn should_index_javascript_typescript_entity(node: Node<'_>) -> bool {
    if node.kind() == "method_definition"
        && node
            .parent()
            .is_some_and(|parent| matches!(parent.kind(), "object" | "object_expression"))
    {
        return false;
    }
    if node.kind() == "pair" {
        return has_function_value(node) && exported_object_variable(node).is_some();
    }
    if !matches!(
        node.kind(),
        "field_definition" | "public_field_definition" | "variable_declarator"
    ) {
        return true;
    }
    if node.kind() == "variable_declarator"
        && !exported_object_function_entities(node, &[]).is_empty()
    {
        return true;
    }
    if !has_function_value(node) && find_descendant_by_kind(node, "class_body").is_some() {
        return false;
    }
    if node.kind() == "variable_declarator" {
        return node
            .child_by_field_name("name")
            .is_some_and(|name| name.kind() == "identifier");
    }
    true
}

fn has_function_value(node: Node<'_>) -> bool {
    let value = node.child_by_field_name("value").or_else(|| {
        named_children(node)
            .into_iter()
            .find(|child| matches!(child.kind(), "arrow_function" | "function_expression"))
    });
    value.is_some_and(contains_function_value)
}

fn contains_function_value(node: Node<'_>) -> bool {
    if matches!(node.kind(), "arrow_function" | "function_expression") {
        return true;
    }
    if !matches!(node.kind(), "call_expression" | "arguments") {
        return false;
    }
    named_children(node)
        .into_iter()
        .any(contains_function_value)
}

fn exported_object_function_entities<'tree>(node: Node<'tree>, _source: &[u8]) -> Vec<Node<'tree>> {
    if node.kind() != "variable_declarator" || closest_ancestor(node, "export_statement").is_none()
    {
        return Vec::new();
    }
    let Some(value) = node.child_by_field_name("value") else {
        return Vec::new();
    };
    if !matches!(value.kind(), "object" | "object_expression") {
        return Vec::new();
    }
    named_children(value)
        .into_iter()
        .filter(|child| {
            (child.kind() == "pair" && has_function_value(*child))
                || child.kind() == "method_definition"
        })
        .collect()
}

fn exported_object_variable(node: Node<'_>) -> Option<Node<'_>> {
    let object =
        closest_ancestor(node, "object").or_else(|| closest_ancestor(node, "object_expression"))?;
    let variable = object.parent()?;
    (variable.kind() == "variable_declarator"
        && closest_ancestor(variable, "export_statement").is_some())
    .then_some(variable)
}

fn exported_object_variable_name(node: Node<'_>, source: &[u8]) -> Option<String> {
    exported_object_variable(node)
        .and_then(|variable| extract_javascript_typescript_name(variable, source))
}

fn extract_javascript_typescript_name(node: Node<'_>, source: &[u8]) -> Option<String> {
    if node.kind() == "pair" {
        return field_text(node, "key", source)
            .map(|value| value.trim_matches(['\'', '"', '`']).to_owned());
    }
    name_field(node, source)
}

fn classify_javascript_typescript(node: Node<'_>) -> Option<SymbolType> {
    if node.kind() == "pair"
        || matches!(
            node.kind(),
            "field_definition" | "public_field_definition" | "variable_declarator"
        )
    {
        return Some(if has_function_value(node) {
            SymbolType::Function
        } else {
            SymbolType::Value
        });
    }
    classify_code_node(node)
}

fn inner_python_definition(node: Node<'_>) -> Option<Node<'_>> {
    if node.kind() != "decorated_definition" {
        return None;
    }
    named_children(node)
        .into_iter()
        .find(|child| matches!(child.kind(), "function_definition" | "class_definition"))
}

fn extract_javascript_signature(node: Node<'_>, source: &[u8]) -> Option<String> {
    let mut signature = if let Some(value) = node.child_by_field_name("value").filter(|value| {
        matches!(
            value.kind(),
            "arrow_function" | "function_expression" | "generator_function"
        )
    }) {
        let prefix = extract_signature_prefix(node, source, value.start_byte());
        format!(
            "{} {}",
            prefix.trim(),
            extract_generic_signature(value, source)?
        )
    } else {
        extract_generic_signature(node, source)?
    };
    let mut declaration = node;
    if let Some(parent) = node.parent().filter(|parent| {
        node.kind() == "variable_declarator"
            && matches!(
                parent.kind(),
                "lexical_declaration" | "variable_declaration"
            )
    }) {
        let keyword = parent
            .child_by_field_name("kind")
            .or_else(|| parent.child(0))?;
        signature = format!("{} {signature}", text(keyword, source));
        declaration = parent;
    }
    while let Some(wrapper) = declaration
        .parent()
        .filter(|parent| matches!(parent.kind(), "ambient_declaration" | "export_statement"))
    {
        let prefix = extract_signature_prefix(wrapper, source, declaration.start_byte());
        signature = format!("{} {signature}", prefix.trim());
        declaration = wrapper;
    }
    Some(signature)
}

fn extract_generic_signature(node: Node<'_>, source: &[u8]) -> Option<String> {
    let mut raw = String::new();
    append_signature(node, source, node.end_byte(), false, &mut raw);
    let signature = raw.trim().trim_end_matches(['{', ';']).trim();
    (!signature.is_empty()).then(|| signature.to_owned())
}

fn extract_signature_prefix(node: Node<'_>, source: &[u8], end_byte: usize) -> String {
    let mut prefix = String::new();
    append_signature(node, source, end_byte, false, &mut prefix);
    prefix
}

// Empty nested bodies preserve declaration suffixes, such as a C typedef's alias.
fn append_signature(
    node: Node<'_>,
    source: &[u8],
    end_byte: usize,
    nested: bool,
    out: &mut String,
) {
    // Exclude prose-bearing syntax by node kind, preserving literal types and defaults.
    if matches!(
        node.kind(),
        "comment"
            | "line_comment"
            | "block_comment"
            | "documentation_comment"
            | "attribute_item"
            | "inner_attribute_item"
            | "attribute_specifier"
            | "attribute_declaration"
            | "annotation"
            | "marker_annotation"
            | "decorator"
    ) {
        // A comment may be the only separator between two declaration tokens.
        out.push(' ');
        return;
    }
    let body = node.child_by_field_name("body").or_else(|| {
        named_children(node).into_iter().find(|child| {
            matches!(
                child.kind(),
                "statement_block"
                    | "compound_statement"
                    | "block"
                    | "class_body"
                    | "declaration_list"
                    | "enum_class_body"
                    | "field_declaration_list"
                    | "function_body"
            )
        })
    });
    let mut offset = node.start_byte();
    for child in named_children(node) {
        if child.start_byte() >= end_byte {
            break;
        }
        out.push_str(std::str::from_utf8(&source[offset..child.start_byte()]).unwrap_or_default());
        if Some(child) == body {
            if !nested {
                return;
            }
            out.push_str("{}");
        } else if matches!(child.kind(), "object" | "object_expression")
            && matches!(
                node.kind(),
                "field_definition" | "public_field_definition" | "variable_declarator"
            )
            && node.child_by_field_name("value") == Some(child)
        {
            out.push_str("{}");
        } else {
            append_signature(child, source, child.end_byte(), true, out);
        }
        offset = child.end_byte();
    }
    out.push_str(std::str::from_utf8(&source[offset..end_byte]).unwrap_or_default());
}

fn extract_preceding_doc(node: Node<'_>, source: &[u8]) -> Option<String> {
    let mut comments = Vec::new();
    let mut sibling = node.prev_named_sibling();
    while let Some(item) = sibling {
        // File documentation remains context for the leading declaration because
        // structured extraction has no separate file entity to carry it.
        let file_level = item
            .parent()
            .is_some_and(|parent| parent.kind() == "source_file");
        if item.kind() == "attribute_item" || (file_level && item.kind() == "inner_attribute_item")
        {
            if let Some(doc) = extract_rust_doc_attribute(item, source) {
                comments.push(doc);
            }
            sibling = item.prev_named_sibling();
            continue;
        }
        if !is_comment(item) || (!file_level && item.child_by_field_name("inner").is_some()) {
            break;
        }
        comments.push(clean_comment_text(text(item, source)));
        sibling = item.prev_named_sibling();
    }
    comments.reverse();
    let doc = comments.join("\n").trim().to_owned();
    (!doc.is_empty()).then_some(doc)
}

fn is_comment(node: Node<'_>) -> bool {
    matches!(
        node.kind(),
        "comment"
            | "line_comment"
            | "block_comment"
            | "documentation_block_comment"
            | "documentation_comment"
    )
}

fn extract_rust_inner_doc(node: Node<'_>, source: &[u8]) -> Option<String> {
    let body = node.child_by_field_name("body")?;
    let mut comments = Vec::new();
    for child in named_children(body) {
        if child.kind() == "inner_attribute_item" {
            if let Some(doc) = extract_rust_doc_attribute(child, source) {
                comments.push(doc);
            }
        } else if is_comment(child) {
            if child.child_by_field_name("inner").is_some() {
                comments.push(clean_comment_text(text(child, source)));
            }
        } else {
            break;
        }
    }
    let doc = comments.join("\n").trim().to_owned();
    (!doc.is_empty()).then_some(doc)
}

fn extract_rust_doc_attribute(node: Node<'_>, source: &[u8]) -> Option<String> {
    let attribute = named_children(node)
        .into_iter()
        .find(|child| child.kind() == "attribute")?;
    let name = named_children(attribute)
        .into_iter()
        .find(|child| !is_comment(*child))?;
    if name.kind() != "identifier" || text(name, source) != "doc" {
        return None;
    }
    let value = attribute.child_by_field_name("value")?;
    let literal = if attribute.has_error() && value.kind() == "string_literal" {
        // The grammar can recover Unicode escapes containing digit separators as
        // an error before the value node. Decode the complete literal in that case.
        let mut cursor = attribute.walk();
        let assignment = attribute
            .children(&mut cursor)
            .find(|child| child.kind() == "=")?;
        std::str::from_utf8(&source[assignment.end_byte()..attribute.end_byte()])
            .ok()?
            .trim()
    } else {
        text(value, source)
    };
    match value.kind() {
        "raw_string_literal" => {
            let (hashes, rest) = literal.strip_prefix('r')?.split_once('"')?;
            if !hashes.chars().all(|ch| ch == '#') {
                return None;
            }
            rest.strip_suffix(&format!("\"{hashes}")).map(str::to_owned)
        }
        "string_literal" => decode_rust_string(literal),
        // Macro values need expansion context; never treat their tokens as documentation.
        _ => None,
    }
}

fn decode_rust_string(literal: &str) -> Option<String> {
    let mut chars = literal
        .strip_prefix('"')?
        .strip_suffix('"')?
        .chars()
        .peekable();
    let mut decoded = String::new();
    while let Some(ch) = chars.next() {
        if ch == '"' {
            return None;
        }
        if ch != '\\' {
            decoded.push(ch);
            continue;
        }
        match chars.next()? {
            'n' => decoded.push('\n'),
            'r' => decoded.push('\r'),
            't' => decoded.push('\t'),
            '0' => decoded.push('\0'),
            ch @ ('\\' | '\'' | '"') => decoded.push(ch),
            'x' => {
                let high = chars.next()?.to_digit(16)?;
                let low = chars.next()?.to_digit(16)?;
                let code = high * 16 + low;
                if code > 0x7f {
                    return None;
                }
                decoded.push(char::from_u32(code)?);
            }
            'u' => {
                if chars.next()? != '{' {
                    return None;
                }
                let mut digits = String::new();
                loop {
                    match chars.next()? {
                        '}' => break,
                        '_' => {}
                        ch if ch.is_ascii_hexdigit() && digits.len() < 6 => digits.push(ch),
                        _ => return None,
                    }
                }
                decoded.push(char::from_u32(u32::from_str_radix(&digits, 16).ok()?)?);
            }
            ch @ ('\n' | '\r') => {
                if ch == '\r' && chars.next()? != '\n' {
                    return None;
                }
                while chars
                    .next_if(|ch| matches!(ch, ' ' | '\t' | '\n' | '\r'))
                    .is_some()
                {}
            }
            _ => return None,
        }
    }
    Some(decoded)
}

fn clean_comment_text(value: &str) -> String {
    let stripped = value
        .strip_prefix("/**")
        .or_else(|| value.strip_prefix("/*!"))
        .or_else(|| value.strip_prefix("/*"))
        .unwrap_or(value);
    let stripped = stripped.strip_suffix("*/").unwrap_or(stripped);
    stripped
        .lines()
        .map(|line| {
            let trimmed = line.trim_start();
            if let Some(rest) = trimmed.strip_prefix("//") {
                rest.strip_prefix(['/', '!']).unwrap_or(rest).trim_start()
            } else if let Some(rest) = trimmed.strip_prefix('#') {
                rest.trim_start()
            } else if let Some(rest) = trimmed.strip_prefix('*') {
                rest.trim_start()
            } else {
                line
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_owned()
}

fn closest_ancestor<'tree>(mut node: Node<'tree>, kind: &str) -> Option<Node<'tree>> {
    while let Some(parent) = node.parent() {
        if parent.kind() == kind {
            return Some(parent);
        }
        node = parent;
    }
    None
}

fn find_descendant_by_kind<'tree>(node: Node<'tree>, kind: &str) -> Option<Node<'tree>> {
    if node.kind() == kind {
        return Some(node);
    }
    named_children(node)
        .into_iter()
        .find_map(|child| find_descendant_by_kind(child, kind))
}

// Nodes without a matching symbol category remain unclassified.
fn classify_code_node(node: Node<'_>) -> Option<SymbolType> {
    Some(match node.kind() {
        "decorated_definition" => {
            return inner_python_definition(node).and_then(classify_code_node);
        }
        "alias_declaration" | "type_alias" | "type_alias_declaration" | "type_item" => {
            SymbolType::Alias
        }
        "abstract_class_declaration"
        | "class_declaration"
        | "class_definition"
        | "class_specifier"
        | "impl_item"
        | "record_declaration"
        | "struct_item"
        | "struct_specifier" => SymbolType::Class,
        "enum_declaration" | "enum_item" | "enum_specifier" => SymbolType::Enum,
        "abstract_method_signature"
        | "constructor_declaration"
        | "function_declaration"
        | "function_definition"
        | "function_item"
        | "function_signature"
        | "function_signature_item"
        | "generator_function_declaration"
        | "macro_type_specifier"
        | "method_declaration"
        | "method_definition"
        | "method_elem"
        | "method_signature"
        | "method_spec" => SymbolType::Function,
        "annotation_type_declaration" | "interface_declaration" | "trait_item" => {
            SymbolType::Interface
        }
        "internal_module" | "mod_item" | "module" | "namespace_definition" => SymbolType::Module,
        "const_item" | "constant_declaration" | "property_signature" | "static_item" => {
            SymbolType::Value
        }
        _ => return None,
    })
}
