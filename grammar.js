// Tree-sitter grammar for DreamMaker (DM) - the BYOND scripting language
// Based on the SpacemanDMM parser/lexer at:
// https://github.com/SpaceManiac/SpacemanDMM

module.exports = grammar({
  name: "dreammaker",

  extras: ($) => [$.comment, /\s/],

  conflicts: ($) => [
    [$._expression, $.type_path],
    [$._expression, $.proc_definition],
  ],

  // ---------------------------------------------------------------
  // Super-simple rules first
  // ---------------------------------------------------------------

  rules: {
    source_file: ($) =>
      repeat(choice($._statement, $.preproc_directive, $.newline)),

    // ---- Comments ----
    comment: ($) =>
      token(
        choice(seq("//", /[^\n]*/), seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),
      ),

    // ---- Newlines (significant in DM) ----
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
        choice(
          /0x[0-9a-fA-F]+/, // hex
          /[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?/, // float
          /[0-9]+/, // integer
        ),
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
        repeat(
          choice(
            /[^"\\\n\[\]]+/,
            /\\(.|\n)/,
            seq("[[", /[^\]]*/, "]]"), // skip interpolation brackets in ordinary strings
          ),
        ),
        '"',
      ),

    interpolated_string: ($) =>
      seq(
        '"',
        repeat(choice(/[^"\\\n\[]+/, /\\(.|\n)/, seq("[", $._expression, "]"))),
        '"',
      ),

    // Block strings {"..."}
    block_string: ($) =>
      seq('{"', repeat(choice(/[^"\\\n]+/, /\\(.|\n)/)), '"}'),

    // Resource file: 'filename'
    resource: ($) => seq("'", repeat(choice(/[^'\\\n]+/, /\\(.|\n)/)), "'"),

    // ---- Type paths ----
    // /datum, /mob/living/carbon, /datum/var/name
    type_path: ($) =>
      seq(
        choice("/", ".", ":"),
        optional(
          seq(
            $.identifier,
            repeat(
              seq("/", optional(choice(seq($.identifier, "/"))), $.identifier),
            ),
          ),
        ),
      ),

    // ---- Variables and values ----
    _value: ($) =>
      choice(
        $.number,
        $.string,
        $.type_path,
        $.identifier,
        prec(1, seq("'", $.identifier, "'")), // quoted identifiers
        $.list_literal,
        $.parenthesized_expression,
        $.function_call,
        $.member_access,
        $.array_access,
      ),

    list_literal: ($) =>
      seq(
        "list",
        "(",
        optional(seq($._expression, repeat(seq(",", $._expression)))),
        ")",
      ),

    parenthesized_expression: ($) => seq("(", $._expression, ")"),

    function_call: ($) =>
      seq(
        choice($.identifier, $.member_access, $.type_path),
        "(",
        optional(seq($._expression, repeat(seq(",", $._expression)))),
        ")",
      ),

    member_access: ($) => seq($._expression, ".", $.identifier),

    array_access: ($) => seq($._expression, "[", $._expression, "]"),

    // ---- Expressions ----
    _expression: ($) =>
      choice(
        $.unary_expression,
        $.binary_expression,
        $.ternary_expression,
        $.assignment_expression,
        $._value,
      ),

    unary_expression: ($) =>
      seq(choice("!", "~", "-", "+", "++", "--", "&", "*"), $._expression),

    // Postfix ++ and --
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

    // var/type/name = value
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

    // type/proc/name (args) { body }
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

    // type/verb/name (args) { body }
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
        optional(
          choice(
            seq(
              choice(
                seq(
                  optional("var"),
                  "/",
                  $.identifier,
                  optional(seq("/", $.identifier)),
                ),
                $.identifier,
              ),
              optional(seq(",", $._expression)),
            ),
          ),
        ),
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
        choice(seq("if", "(", $._expression, ")"), seq("else")),
        optional($.block),
      ),

    return_statement: ($) => seq("return", optional($._expression)),

    del_statement: ($) => seq("del", $._expression),

    set_statement: ($) => seq("set", $._expression),

    expression_statement: ($) => seq($._expression, optional(";")),

    // Block
    block: ($) => seq("{", repeat(choice($._statement, $.newline)), "}"),
  },
});
