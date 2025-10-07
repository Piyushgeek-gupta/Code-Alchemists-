import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string | undefined) => void;
}

export const CodeEditor = ({ language, value, onChange }: CodeEditorProps) => {
  const languageMap: Record<string, string> = {
    C: "c",
    Python: "python",
    Java: "java",
  };

  return (
    <div className="h-full rounded-lg overflow-hidden border border-border">
      <Editor
        height="100%"
        language={languageMap[language] || "python"}
        value={value}
        onChange={onChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          wordWrap: "on",
          padding: { top: 16, bottom: 16 },
        }}
      />
    </div>
  );
};
