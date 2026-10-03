"use client";

import { useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditorNS } from "monaco-editor";

const PAPER_THEME = "wii-lua-paper";

type Props = {
  value: string;
  onChange: (next: string) => void;
  highlightLine: number | null;
  onRun: () => void;
};

export default function LuaEditor({ value, onChange, highlightLine, onRun }: Props) {
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const decoRef = useRef<string[]>([]);
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.defineTheme(PAPER_THEME, {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "8a7a5c", fontStyle: "italic" },
        { token: "keyword", foreground: "2a4a8a", fontStyle: "bold" },
        { token: "string", foreground: "3d7a5a" },
        { token: "number", foreground: "8b4a1e" },
        { token: "identifier", foreground: "1c1914" },
      ],
      colors: {
        "editor.background": "#f3ead8",
        "editor.foreground": "#1c1914",
        "editor.lineHighlightBackground": "#e8dcc0",
        "editorLineNumber.foreground": "#9a8b6c",
        "editorLineNumber.activeForeground": "#2a4a8a",
        "editorCursor.foreground": "#2a4a8a",
        "editor.selectionBackground": "#c9d4ea",
        "editorIndentGuide.background": "#e0d2b4",
        "editorGutter.background": "#efe4cc",
      },
    });
    monaco.editor.setTheme(PAPER_THEME);

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunRef.current();
    });
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    if (highlightLine == null) {
      decoRef.current = editor.deltaDecorations(decoRef.current, []);
      return;
    }

    decoRef.current = editor.deltaDecorations(decoRef.current, [
      {
        range: {
          startLineNumber: highlightLine,
          startColumn: 1,
          endLineNumber: highlightLine,
          endColumn: model.getLineMaxColumn(highlightLine),
        },
        options: {
          isWholeLine: true,
          className: "lua-error-line",
          linesDecorationsClassName: "lua-error-gutter",
        },
      },
    ]);
    editor.revealLineInCenter(highlightLine);
  }, [highlightLine, value]);

  return (
    <div className="h-full min-h-0 [&_.lua-error-line]:bg-[#f3d2cc] [&_.lua-error-gutter]:border-l-2 [&_.lua-error-gutter]:border-[#b54a3c]">
      <Editor
        height="100%"
        defaultLanguage="lua"
        language="lua"
        theme={PAPER_THEME}
        value={value}
        onChange={(next) => onChange(next ?? "")}
        onMount={handleMount}
        options={{
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          fontSize: 14,
          lineHeight: 22,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          tabSize: 2,
          renderLineHighlight: "line",
          padding: { top: 16, bottom: 16 },
          glyphMargin: false,
          folding: false,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          guides: { indentation: true },
        }}
        path="atelier.lua"
      />
    </div>
  );
}
