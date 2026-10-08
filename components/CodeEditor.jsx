"use client";

import dynamic from "next/dynamic";
import { registerLiquid } from "../lib/monacoLiquid";

// Monaco only works in the browser, so it is loaded client-side only.
const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-neutral-500">
      Loading editor...
    </div>
  ),
});

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
    <div
      className="overflow-hidden rounded-lg border border-neutral-200"
      style={{ height }}
    >
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
    </div>
  );
}
