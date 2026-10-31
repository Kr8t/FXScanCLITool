import { useState } from 'react';
import { pythonFiles } from '../data/pythonFiles';

function CodeBlock({ code, language }: { code: string; language: string }) {
  const lines = code.split('\n');
  
  return (
    <div className="overflow-auto max-h-[600px]">
      <table className="w-full text-sm font-mono">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="hover:bg-gray-800/30">
              <td className="px-3 py-0 text-right text-gray-600 select-none w-10 border-r border-gray-800">
                {i + 1}
              </td>
              <td className="px-4 py-0 whitespace-pre text-gray-300">
                {highlightLine(line, language)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function highlightLine(line: string, language: string): JSX.Element {
  if (language === 'yaml' || language === 'toml' || language === 'batch') {
    // Simple highlighting for non-Python files
    if (line.trim().startsWith('#') || line.trim().startsWith('REM') || line.trim().startsWith('@')) {
      return <span className="text-gray-500">{line}</span>;
    }
    if (line.includes(':') && !line.startsWith(' ') && language !== 'batch') {
      const [key, ...rest] = line.split(':');
      return (
        <>
          <span className="text-purple-400">{key}</span>
          <span className="text-gray-400">:</span>
          <span className="text-green-300">{rest.join(':')}</span>
        </>
      );
    }
    return <span>{line}</span>;
  }

  // Python syntax highlighting (simplified)
  if (line.trim().startsWith('#') || line.trim().startsWith('"""') || line.trim().startsWith("'''")) {
    return <span className="text-gray-500 italic">{line}</span>;
  }
  
  // Keywords
  const keywords = /\b(from|import|class|def|return|if|else|elif|for|while|try|except|finally|with|as|in|not|and|or|is|None|True|False|raise|pass|break|continue|yield|lambda|assert|global|nonlocal)\b/g;
  const types = /\b(str|int|float|bool|list|dict|tuple|set|Optional|Literal|Any)\b/g;
  const decorators = /^(@\w+)/g;
  const strings = /(["'])(?:(?!\1).)*\1/g;
  
  let result = line;
  const parts: { text: string; className: string }[] = [];
  
  // Simple approach: just color the whole line based on patterns
  if (decorators.test(line)) {
    return <span className="text-yellow-400">{line}</span>;
  }
  
  if (line.includes('def ') || line.includes('class ')) {
    const match = line.match(/(def|class)\s+(\w+)/);
    if (match) {
      const idx = line.indexOf(match[0]);
      return (
        <>
          <span>{line.slice(0, idx)}</span>
          <span className="text-blue-400">{match[1]}</span>
          <span className="text-gray-400"> </span>
          <span className="text-yellow-300">{match[2]}</span>
          <span>{line.slice(idx + match[0].length)}</span>
        </>
      );
    }
  }

  // Basic keyword highlighting
  const highlighted = line.replace(keywords, '§KW§$&§/KW§');
  if (highlighted.includes('§KW§')) {
    const segments = highlighted.split(/(§KW§.*?§\/KW§)/g);
    return (
      <>
        {segments.map((seg, i) => {
          if (seg.startsWith('§KW§')) {
            const word = seg.replace(/§\/?KW§/g, '');
            if (['None', 'True', 'False'].includes(word)) {
              return <span key={i} className="text-orange-400">{word}</span>;
            }
            return <span key={i} className="text-purple-400">{word}</span>;
          }
          return <span key={i}>{seg}</span>;
        })}
      </>
    );
  }
  
  return <span>{line}</span>;
}

export default function CodeBrowser() {
  const [selectedFile, setSelectedFile] = useState(0);
  const file = pythonFiles[selectedFile];

  return (
    <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-800">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="text-sm text-gray-400 font-mono">fx_scan/</span>
      </div>

      <div className="flex">
        {/* File Sidebar */}
        <div className="w-64 border-r border-gray-800 bg-gray-950/50 overflow-y-auto max-h-[700px]">
          {pythonFiles.map((f, i) => (
            <button
              key={f.path}
              onClick={() => setSelectedFile(i)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-l-2 ${
                i === selectedFile
                  ? 'bg-gray-800/50 border-cyan-400 text-cyan-300'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
              }`}
            >
              <div className="font-mono text-xs">{f.path}</div>
              <div className="text-xs text-gray-600 mt-0.5 truncate">{f.description}</div>
            </button>
          ))}
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-hidden">
          <div className="px-4 py-2 bg-gray-900/50 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-mono text-gray-300">{file.name}</span>
            <span className="text-xs text-gray-600">
              {file.content.split('\n').length} lines
            </span>
          </div>
          <CodeBlock code={file.content} language={file.language} />
        </div>
      </div>
    </div>
  );
}
