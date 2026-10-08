// Registers a "liquid" language (highlighting, brackets, completions) with Monaco.
// Monaco has no built-in Liquid mode, so this is a small Monarch grammar:
// HTML + {% tags %} + {{ outputs }}, with embedded CSS/JS in <style>/<script>.

const TAGS = [
  "if", "elsif", "else", "endif", "unless", "endunless", "case", "when", "endcase",
  "for", "endfor", "break", "continue", "cycle", "assign", "capture", "endcapture",
  "comment", "endcomment", "raw", "endraw", "render", "include", "increment",
  "decrement", "liquid", "echo", "tablerow", "endtablerow",
];

const FILTERS = [
  "abs", "append", "at_least", "at_most", "capitalize", "ceil", "compact", "concat",
  "date", "default", "divided_by", "downcase", "escape", "escape_once", "first",
  "floor", "join", "last", "lstrip", "map", "minus", "modulo", "newline_to_br",
  "plus", "prepend", "remove", "remove_first", "replace", "replace_first", "reverse",
  "round", "rstrip", "size", "slice", "sort", "sort_natural", "split", "strip",
  "strip_html", "strip_newlines", "sum", "times", "truncate", "truncatewords",
  "uniq", "upcase", "url_decode", "url_encode", "where",
];

const SNIPPETS = {
  if: "{% if ${1:condition} %}\n\t$0\n{% endif %}",
  unless: "{% unless ${1:condition} %}\n\t$0\n{% endunless %}",
  for: "{% for ${1:item} in ${2:collection} %}\n\t$0\n{% endfor %}",
  case: "{% case ${1:variable} %}\n\t{% when ${2:value} %}\n\t\t$0\n{% endcase %}",
  assign: "{% assign ${1:name} = ${2:value} %}",
  capture: "{% capture ${1:name} %}\n\t$0\n{% endcapture %}",
  comment: "{% comment %}\n\t$0\n{% endcomment %}",
  render: "{% render '${1:snippet}' %}",
  include: "{% include '${1:snippet}' %}",
};

let registered = false;

export function registerLiquid(monaco) {
  if (registered || monaco.languages.getLanguages().some((l) => l.id === "liquid")) {
    registered = true;
    return;
  }
  registered = true;

  monaco.languages.register({ id: "liquid", extensions: [".liquid"], aliases: ["Liquid"] });

  monaco.languages.setLanguageConfiguration("liquid", {
    comments: { blockComment: ["{% comment %}", "{% endcomment %}"] },
    brackets: [
      ["<!--", "-->"],
      ["<", ">"],
      ["(", ")"],
      ["[", "]"],
    ],
    autoClosingPairs: [
      { open: "{%", close: " %}" },
      { open: "{{", close: " }}" },
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: '"', close: '"', notIn: ["string"] },
      { open: "'", close: "'", notIn: ["string"] },
    ],
    surroundingPairs: [
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: "<", close: ">" },
    ],
  });

  const liquidStart = [
    [/\{%-?\s*comment\s*-?%\}/, { token: "comment", next: "@liquidComment" }],
    [/\{%-?\s*raw\s*-?%\}/, { token: "comment", next: "@liquidRaw" }],
    [/\{%-?/, { token: "delimiter.liquid", next: "@liquidTag" }],
    [/\{\{-?/, { token: "delimiter.liquid", next: "@liquidOutput" }],
  ];

  monaco.languages.setMonarchTokensProvider("liquid", {
    defaultToken: "",
    tokenPostfix: ".liquid",
    tagKeywords: TAGS,
    constants: ["true", "false", "nil", "null", "blank", "empty", "forloop"],

    tokenizer: {
      root: [
        ...liquidStart,
        [/<!--/, { token: "comment", next: "@htmlComment" }],
        [/<style\b/, { token: "tag", next: "@styleOpen" }],
        [/<script\b/, { token: "tag", next: "@scriptOpen" }],
        [/<\/?[a-zA-Z][\w:-]*/, { token: "tag", next: "@htmlTag" }],
        [/[^<{]+/, ""],
        [/[<{]/, ""],
      ],

      htmlComment: [
        [/-->/, { token: "comment", next: "@pop" }],
        [/[^-]+/, "comment"],
        [/-/, "comment"],
      ],

      htmlTag: [
        [/\/?>/, { token: "tag", next: "@pop" }],
        ...liquidStart,
        [/[\w:-]+/, "attribute.name"],
        [/=/, "delimiter"],
        [/"/, { token: "attribute.value", next: "@dqString" }],
        [/'/, { token: "attribute.value", next: "@sqString" }],
        [/\s+/, ""],
      ],

      dqString: [
        ...liquidStart,
        [/[^"{]+/, "attribute.value"],
        [/\{/, "attribute.value"],
        [/"/, { token: "attribute.value", next: "@pop" }],
      ],

      sqString: [
        ...liquidStart,
        [/[^'{]+/, "attribute.value"],
        [/\{/, "attribute.value"],
        [/'/, { token: "attribute.value", next: "@pop" }],
      ],

      // <style ...> and <script ...>: switch to the CSS / JavaScript tokenizer for the body
      styleOpen: [
        { include: "@embeddedAttrs" },
        [/>/, { token: "tag", switchTo: "@styleBody", nextEmbedded: "text/css" }],
      ],

      scriptOpen: [
        { include: "@embeddedAttrs" },
        [/>/, { token: "tag", switchTo: "@scriptBody", nextEmbedded: "text/javascript" }],
      ],

      embeddedAttrs: [
        [/[\w:-]+/, "attribute.name"],
        [/=/, "delimiter"],
        [/"[^"]*"/, "attribute.value"],
        [/'[^']*'/, "attribute.value"],
        [/\s+/, ""],
      ],

      styleBody: [
        [/<\/style\s*>/, { token: "@rematch", next: "@pop", nextEmbedded: "@pop" }],
        [/[^<]+/, ""],
        [/</, ""],
      ],

      scriptBody: [
        [/<\/script\s*>/, { token: "@rematch", next: "@pop", nextEmbedded: "@pop" }],
        [/[^<]+/, ""],
        [/</, ""],
      ],

      liquidComment: [
        [/\{%-?\s*endcomment\s*-?%\}/, { token: "comment", next: "@pop" }],
        [/[^{]+/, "comment"],
        [/\{/, "comment"],
      ],

      liquidRaw: [
        [/\{%-?\s*endraw\s*-?%\}/, { token: "comment", next: "@pop" }],
        [/[^{]+/, "string"],
        [/\{/, "string"],
      ],

      liquidTag: [
        [/-?%\}/, { token: "delimiter.liquid", next: "@pop" }],
        { include: "@liquidExpr" },
      ],

      liquidOutput: [
        [/-?\}\}/, { token: "delimiter.liquid", next: "@pop" }],
        { include: "@liquidExpr" },
      ],

      liquidExpr: [
        [/"[^"]*"/, "string"],
        [/'[^']*'/, "string"],
        [/\d+(\.\d+)?/, "number"],
        [/(\|)(\s*)([a-zA-Z_]\w*)/, ["operator", "", "predefined"]],
        [
          /[a-zA-Z_][\w-]*/,
          { cases: { "@tagKeywords": "keyword", "@constants": "constant", "@default": "variable" } },
        ],
        [/==|!=|<>|<=|>=|<|>|=|\.\.|[:,.()[\]]/, "delimiter"],
        [/\s+/, ""],
      ],
    },
  });

  monaco.languages.registerCompletionItemProvider("liquid", {
    triggerCharacters: ["|", " ", "{", "%"],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      const K = monaco.languages.CompletionItemKind;
      const R = monaco.languages.CompletionItemInsertTextRule;

      const snippets = Object.entries(SNIPPETS).map(([label, insertText]) => ({
        label,
        kind: K.Snippet,
        detail: "Liquid tag",
        insertText,
        insertTextRules: R.InsertAsSnippet,
        range,
      }));
      const tags = TAGS.filter((t) => !(t in SNIPPETS)).map((label) => ({
        label,
        kind: K.Keyword,
        insertText: label,
        range,
      }));
      const filters = FILTERS.map((label) => ({
        label,
        kind: K.Function,
        detail: "Liquid filter",
        insertText: label,
        range,
      }));

      return { suggestions: [...snippets, ...tags, ...filters] };
    },
  });
}
