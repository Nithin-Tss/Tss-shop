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
          beforeMount={registerLiquid}
          onMount={handleMount}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </Suspense>
    </div>
  );
}
