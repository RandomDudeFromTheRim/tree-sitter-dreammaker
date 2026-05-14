module.exports = grammar({
  name: "dreammaker",

  extras: ($) => [$.comment, /\s/],

  rules: {
    source_file: ($) => repeat($._token),

    _token: ($) =>
      choice(
        $.comment,
        $.string,
        $.number,
        $.preproc,
        $.keyword,
        $.type_path,
        $.operator,
        $.identifier,
      ),

    comment: ($) =>
      token(
        choice(seq("//", /[^\n]*/), seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),
      ),

    string: ($) =>
      seq(
        '"',
        repeat(
          choice(
            /[^"\\\n\[]+/,
            /\\(.|\n)/,
            seq("[[", /[^\]]*/, "]]"),
            seq("[", /[^\]]*/, "]"),
          ),
        ),
        '"',
      ),

    number: ($) => token(choice(/0x[0-9a-fA-F]+/, /[0-9]+\.[0-9]+/, /[0-9]+/)),

    preproc: ($) => token(seq("#", /.*/)),

    keyword: ($) =>
      choice(
        "var",
        "proc",
        "verb",
        "set",
        "if",
        "else",
        "for",
        "while",
        "do",
        "switch",
        "case",
        "default",
        "return",
        "new",
        "del",
        "in",
        "to",
        "step",
        "as",
        "global",
        "static",
        "const",
        "tmp",
        "list",
        "src",
        "usr",
        "world",
        "null",
        "TRUE",
        "FALSE",
      ),

    type_path: ($) =>
      token(
        seq(
          choice("/", "."),
          /[a-zA-Z_*][a-zA-Z0-9_*]*(?:\/[a-zA-Z_*][a-zA-Z0-9_*]*)*/,
          optional(
            seq(
              /\/(?:proc|verb|var)/,
              optional(/\/(?:[a-zA-Z_][a-zA-Z0-9_]*)/),
            ),
          ),
        ),
      ),

    operator: ($) =>
      choice(
        "+",
        "-",
        "*",
        "/",
        "%",
        "=",
        "==",
        "!=",
        "<",
        ">",
        "<=",
        ">=",
        "&&",
        "||",
        "!",
        "&",
        "|",
        "^",
        "~",
        "<<",
        ">>",
        "++",
        "--",
        "**",
        "??",
        "?.",
        "?:",
        "?[",
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
        "(",
        ")",
        "[",
        "]",
        "{",
        "}",
        ";",
        ",",
        ".",
        ":",
        "::",
      ),

    identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,
  },
});
