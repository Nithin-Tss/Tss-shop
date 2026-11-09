import { lazy, Suspense } from "react";
import { registerLiquid } from "@/lib/monacoLiquid";

// The local Monaco bundle must be configured before the editor component first renders
// Started as soon as this module loads (not when the editor first renders), so the
// large Monaco bundle downloads in parallel with the theme files fetch.
const monacoReady = () => import("@/lib/monacoSetup").then(() => import("@monaco-editor/react"));
let monacoPromise = null;
export function preloadMonaco() {
  monacoPromise ??= monacoReady();
  return monacoPromise;
}
const Monaco = lazy(preloadMonaco);
preloadMonaco();

const EditorLoading = () => (
  <div className="flex h-full items-center justify-center text-sm text-neutral-500">
    Loading editor...
  </div>
);

function defineThemes(monaco) {
  monaco.editor.defineTheme("monokai", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "F8F8F2" },
      { token: "comment", foreground: "75715E" },
      { token: "string", foreground: "E6DB74" },
      { token: "string.value.json", foreground: "E6DB74" },
      { token: "number", foreground: "AE81FF" },
      { token: "constant", foreground: "AE81FF" },
      { token: "keyword", foreground: "F92672" },
      { token: "keyword.liquid", foreground: "F92672" },
      { token: "operator", foreground: "F92672" },
      { token: "delimiter", foreground: "F8F8F2" },
      { token: "delimiter.liquid", foreground: "F92672" },
      { token: "tag", foreground: "F92672" },
      { token: "attribute.name", foreground: "A6E22E" },
      { token: "attribute.value", foreground: "E6DB74" },
      { token: "string.key.json", foreground: "A6E22E" },
      { token: "type", foreground: "66D9EF" },
      { token: "variable", foreground: "F8F8F2" },
      { token: "predefined", foreground: "66D9EF" },
    ],
    colors: {
      "editor.background": "#272822",
      "editor.foreground": "#F8F8F2",
      "editorLineNumber.foreground": "#90908A",
      "editorLineNumber.activeForeground": "#F8F8F2",
      "editor.lineHighlightBackground": "#3E3D32",
      "editor.selectionBackground": "#49483E",
      "editorCursor.foreground": "#F8F8F0",
      "editorWhitespace.foreground": "#464741",
      "editorIndentGuide.background1": "#464741",
      "editorIndentGuide.activeBackground1": "#767771",
    },
  });
}

function defineMaterialTheme(monaco) {
  monaco.editor.defineTheme("material", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "EEFFFF" },
      { token: "comment", foreground: "546E7A", fontStyle: "italic" },
      { token: "string", foreground: "C3E88D" },
      { token: "string.value.json", foreground: "C3E88D" },
      { token: "attribute.value", foreground: "C3E88D" },
      { token: "number", foreground: "F78C6C" },
      { token: "constant", foreground: "F78C6C" },
      { token: "keyword", foreground: "C792EA" },
      { token: "keyword.liquid", foreground: "C792EA" },
      { token: "operator", foreground: "89DDFF" },
      { token: "delimiter", foreground: "89DDFF" },
      { token: "delimiter.liquid", foreground: "89DDFF" },
      { token: "tag", foreground: "F07178" },
      { token: "attribute.name", foreground: "FFCB6B" },
      { token: "string.key.json", foreground: "F07178" },
      { token: "type", foreground: "FFCB6B" },
      { token: "variable", foreground: "EEFFFF" },
      { token: "predefined", foreground: "82AAFF" },
    ],
    colors: {
      "editor.background": "#263238",
      "editor.foreground": "#EEFFFF",
      "editorLineNumber.foreground": "#37474F",
      "editorLineNumber.activeForeground": "#B0BEC5",
      "editor.lineHighlightBackground": "#2C3B41",
      "editor.selectionBackground": "#80CBC420",
      "editorCursor.foreground": "#FFCC00",
      "editorWhitespace.foreground": "#37474F",
      "editorIndentGuide.background1": "#37474F",
      "editorIndentGuide.activeBackground1": "#546E7A",
    },
  });
}

export default function CodeEditor({
  value,
  onChange,
  language = "css",
  height = "400px",
  theme = "vs-dark",
  readOnly = false,
  jsonSchema,
  path,
}) {
  function handleMount(editor, monaco) {
    if (language === "json" && jsonSchema) {
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        schemas: [
          {
            uri: "inmemory://schema.json",
            fileMatch: ["*"],
            schema: jsonSchema,
          },
        ],
      });
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200" style={{ height }}>
      <Suspense fallback={<EditorLoading />}>
        <Monaco
          height="100%"
          path={path}
          language={language}
          value={value}
          theme={theme}
          onChange={(next) => onChange?.(next ?? "")}
          beforeMount={(monaco) => {
            registerLiquid(monaco);
            defineThemes(monaco);
            defineMaterialTheme(monaco);
          }}
          onMount={handleMount}
          options={{
            readOnly,
            minimap: { enabled: false },
            // VS Code defaults (macOS)
            fontFamily: "Menlo, Monaco, 'Courier New', monospace",
            fontSize: 14,
            lineHeight: 0, // auto, same as VS Code (~19px at 14px)
            fontWeight: "normal",
            fontLigatures: false,
            letterSpacing: 0,
            lineNumbers: "on",
            renderLineHighlight: "line",
            cursorBlinking: "blink",
            smoothScrolling: false,
            bracketPairColorization: { enabled: true },
            guides: { indentation: true, bracketPairs: false },
            renderWhitespace: "selection",
            folding: true,
            matchBrackets: "always",
            padding: { top: 0, bottom: 0 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </Suspense>
    </div>
  );
}
