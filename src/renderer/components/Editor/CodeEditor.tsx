import React, { useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useAppStore } from '../../store/appStore';

const CodeEditor: React.FC = () => {
  const { openFiles, activeFile, updateFileContent, settings } = useAppStore();

  const currentFile = openFiles.find((f) => f.path === activeFile);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined && activeFile) {
        updateFileContent(activeFile, value);
      }
    },
    [activeFile, updateFileContent]
  );

  if (!currentFile) return null;

  return (
    <Editor
      height="100%"
      language={currentFile.language}
      value={currentFile.content}
      onChange={handleEditorChange}
      theme="vs-dark"
      options={{
        fontSize: settings.fontSize,
        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        fontLigatures: true,
        minimap: { enabled: true, scale: 1 },
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
        },
        padding: { top: 12, bottom: 12 },
        lineNumbers: 'on',
        renderLineHighlight: 'all',
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        bracketPairColorization: { enabled: true },
        autoIndent: 'advanced',
        formatOnPaste: true,
        formatOnType: true,
        wordWrap: 'on',
        tabSize: 2,
        insertSpaces: true,
        automaticLayout: true,
        suggest: {
          showKeywords: true,
          showSnippets: true,
        },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: true,
        },
      }}
    />
  );
};

export default CodeEditor;
