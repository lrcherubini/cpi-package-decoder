function registerGroovyLanguage() {
  monaco.languages.register({ id: "groovy" });

  monaco.languages.setMonarchTokensProvider("groovy", {
    defaultToken: "identifier",
    tokenPostfix: ".groovy",

    keywords: [
      "as", "assert", "break", "case", "catch", "class", "const",
      "continue", "def", "default", "do", "else", "enum", "extends",
      "false", "finally", "for", "goto", "if", "implements",
      "import", "in", "instanceof", "interface", "new", "null",
      "package", "return", "super", "switch", "this", "throw",
      "throws", "trait", "true", "try", "while",
    ],

    typeKeywords: [
      "boolean", "byte", "char", "double", "float", "int", "long", "short", "void"
    ],

    operators: [
      "=", ">", "<", "!", "~", "?", ":", "==", "<=", ">=", "!=",
      "&&", "||", "++", "--", "+", "-", "*", "/", "&", "|", "^", "%",
      "<<", ">>", ">>>", "+=", "-=", "*=", "/=", "&=", "|=", "^=",
      "%=", "<<=", ">>=", ">>>=",
    ],

    // A linha em falta foi adicionada aqui
    symbols: /[=><!~?:&|+\-*\/\^%]+/,

    // C-style strings
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    tokenizer: {
      root: [
        // identifiers and keywords
        [/[a-zA-Z_$][\w$]*/, {
          cases: {
            "@keywords": "keyword",
            "@typeKeywords": "type",
            "@default": "identifier"
          }
        }],

        // whitespace
        { include: '@whitespace' },

        // delimiters and operators
        [/[{}()\[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [/@symbols/, {
          cases: {
            '@operators': 'operator',
            '@default': ''
          }
        }],

        // numbers
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        [/\d+/, 'number'],

        // delimiter: after number because of .\d floats
        [/[;,.]/, 'delimiter'],

        // strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-teminated string
        [/'([^'\\]|\\.)*$/, 'string.invalid'],  // non-teminated string
        [/"/, 'string', '@string_double'],
        [/'/, 'string', '@string_single'],
      ],

      comment: [
        [/[^\/*]+/, 'comment'],
        [/\/\*/, 'comment', '@push'],    // nested comment
        ["\\*/", 'comment', '@pop'],
        [/[\/*]/, 'comment']
      ],

      string_double: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop']
      ],

      string_single: [
        [/[^\\']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, 'string', '@pop']
      ],

      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],
    },
  });
}