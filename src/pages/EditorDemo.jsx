
import CodeWorkbench from "@/components/CodeWorkbench";

export default function EditorDemoPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-4 text-2xl font-bold text-neutral-900">Code editor</h1>
      <CodeWorkbench height="680px" />
    </main>
  );
}
