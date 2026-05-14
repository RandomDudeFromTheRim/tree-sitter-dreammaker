// Tree-sitter grammar for DreamMaker (DM) - the BYOND scripting language
// Based on the SpacemanDMM parser/lexer at:
// https://github.com/SpaceManiac/SpacemanDMM

module.exports = grammar({
  name: "dreammaker",

  extras: ($) => [$.comment, /\s/],

  conflicts: ($) => [
    // identifier '(' could be function call or just an identifier
    [$.function_call, $.identifier],
    [$.function_call, $.member_access],
    [$.function_call, $._primary],
    // type_path can be a value or the start of proc/verb definition
    [$._primary, $.proc_definition, $.verb_definition],
    // 'return' could be standalone or followed by an expression
    [$.return_statement, $._statement],
    [$.return_statement, $.expression_statement],
    // 'set' could be standalone or followed by expression
    [$.set_statement, $.expression_statement],
    // 'del' could be standalone or followed by expression
    [$.del_statement, $.expression_statement],
    // for( could be for statement or function call
    [$.for_statement, $.function_call],
  ],

  precedences: ($) => [
    ["call", "primary"],
    ["call", "value"],
  ],

  rules: {
    source_file: ($) =>
      repeat(choice($._statement, $.preproc_directive, $.newline)),

    // ---- Comments ----
    comment: ($) =>
      token(
        choice(seq("//", /[^\n]*/), seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),
      ),

    newline: ($) => /\n/,

    // ---- Preprocessor ----
    preproc_directive: ($) =>
      seq(
        "#",
        choice(
          seq(
            choice("define", "undef"),
            field("name", $.identifier),
            optional($._preproc_value),
          ),
          seq(choice("if", "ifdef", "ifndef"), $._preproc_value),
          seq(choice("else", "endif")),
          seq(choice("include", "warn", "error"), $._preproc_value),
        ),
      ),

    _preproc_value: ($) => /.*/,

    // ---- Identifiers ----
    identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,

    // ---- Numbers ----
    number: ($) =>
      token(
        choice(/0x[0-9a-fA-F]+/, /[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?/, /[0-9]+/),
      ),

    // ---- Strings ----
    string: ($) =>
      choice(
        $.ordinary_string,
        $.interpolated_string,
        $.block_string,
        $.resource,
      ),

    ordinary_string: ($) =>
      seq(
        '"',
        repeat(choice(/[^"\\\n\[\]]+/, /\\(.|\n)/, seq("[[", /[^\]]*/, "]]"))),
        '"',
      ),

    interpolated_string: ($) =>
      seq(
        '"',
        repeat(choice(/[^"\\\n\[]+/, /\\(.|\n)/, seq("[", $._expression, "]"))),
        '"',
      ),

    block_string: ($) =>
      seq('{"', repeat(choice(/[^"\\\n]+/, /\\(.|\n)/)), '"}'),

    resource: ($) => seq("'", repeat(choice(/[^'\\\n]+/, /\\(.|\n)/)), "'"),

    // ---- Type paths ----
    type_path: ($) =>
      token(
        seq(
          choice("/", ".", ":"),
          /[a-zA-Z_][a-zA-Z0-9_]*(\/[a-zA-Z_][a-zA-Z0-9_]*)*/,
        ),
      ),

    // ---- Primary values ----
    _primary: ($) =>
      choice(
        $.number,
        $.string,
        $.type_path,
        $.identifier,
        prec("primary", seq("'", $.identifier, "'")),
        $.list_literal,
        $.parenthesized_expression,
      ),

    // ---- Calls and accesses ----
    function_call: ($) =>
      prec(
        "call",
        seq(
          choice($.identifier, $.member_access, $.type_path),
          "(",
          optional(seq($._expression, repeat(seq(",", $._expression)))),
          ")",
        ),
      ),

    member_access: ($) => seq($._expression, ".", $.identifier),

    array_access: ($) => seq($._expression, "[", $._expression, "]"),

    list_literal: ($) =>
      seq(
        "list",
        "(",
        optional(seq($._expression, repeat(seq(",", $._expression)))),
        ")",
      ),

    parenthesized_expression: ($) => seq("(", $._expression, ")"),

    // ---- Values ----
    _value: ($) =>
      choice($.function_call, $.member_access, $.array_access, $._primary),

    // ---- Expressions ----
    _expression: ($) =>
      choice(
        $.unary_expression,
        $._postfix_expression,
        $.binary_expression,
        $.ternary_expression,
        $.assignment_expression,
        $._value,
      ),

    unary_expression: ($) =>
      seq(choice("!", "~", "-", "+", "++", "--", "&", "*"), $._expression),

    _postfix_expression: ($) => seq($._expression, choice("++", "--")),

    binary_expression: ($) =>
      prec.left(
        seq(
          $._expression,
          choice(
            "+",
            "-",
            "*",
            "/",
            "%",
            "**",
            "==",
            "!=",
            "<",
            ">",
            "<=",
            ">=",
            "<>",
            "<=>",
            "&&",
            "||",
            "&",
            "|",
            "^",
            "~",
            "<<",
            ">>",
            "in",
            "??",
          ),
          $._expression,
        ),
      ),

    ternary_expression: ($) =>
      prec.right(seq($._expression, "?", $._expression, ":", $._expression)),

    assignment_expression: ($) =>
      prec.left(
        -1,
        seq(
          $._expression,
          choice(
            "=",
            "+=",
            "-=",
            "*=",
            "/=",
            "%=",
            "&=",
            "|=",
            "^=",
            "<<=",
            ">>=",
            "&&=",
            "||=",
            ":=",
            "%%=",
          ),
          $._expression,
        ),
      ),

    // ---- Statements ----
    _statement: ($) =>
      choice(
        $.var_statement,
        $.proc_definition,
        $.verb_definition,
        $.if_statement,
        $.for_statement,
        $.while_statement,
        $.do_while_statement,
        $.switch_statement,
        $.return_statement,
        $.del_statement,
        $.set_statement,
        $.expression_statement,
        $.block,
      ),

    var_statement: ($) =>
      seq(
        "var",
        optional(
          seq(
            "/",
            $.identifier,
            "/",
            $.identifier,
            optional(seq("=", $._expression)),
          ),
        ),
      ),

    proc_definition: ($) =>
      seq(
        $.type_path,
        "/",
        "proc",
        "/",
        field("name", $.identifier),
        "(",
        optional($.parameter_list),
        ")",
        optional($.block),
      ),

    verb_definition: ($) =>
      seq(
        $.type_path,
        "/",
        "verb",
        "/",
        field("name", $.identifier),
        "(",
        optional($.parameter_list),
        ")",
        optional($.block),
      ),

    parameter_list: ($) => seq($.parameter, repeat(seq(",", $.parameter))),

    parameter: ($) =>
      seq(
        optional(seq("var", "/")),
        $.identifier,
        optional(seq("=", $._expression)),
      ),

    if_statement: ($) =>
      seq(
        "if",
        "(",
        $._expression,
        ")",
        $._statement,
        optional(seq("else", $._statement)),
      ),

    for_statement: ($) =>
      seq(
        "for",
        "(",
        optional(seq($.identifier, optional(seq(",", $._expression)))),
        ")",
        $._statement,
      ),

    while_statement: ($) => seq("while", "(", $._expression, ")", $._statement),

    do_while_statement: ($) =>
      seq("do", $._statement, "while", "(", $._expression, ")", optional(";")),

    switch_statement: ($) =>
      seq("switch", "(", $._expression, ")", "{", repeat($.switch_case), "}"),

    switch_case: ($) =>
      seq(
        choice(seq("if", "(", $._expression, ")"), "else"),
        optional($.block),
      ),

    return_statement: ($) => prec.right(seq("return", optional($._expression))),

    del_statement: ($) => seq("del", $._expression),

    set_statement: ($) => seq("set", $._expression),

    expression_statement: ($) => seq($._expression, optional(";")),

    // Block
    block: ($) => seq("{", repeat(choice($._statement, $.newline)), "}"),
  },
});
