'use client';
import { useEffect, useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-java';
import { CodeFile } from '@/lib/types';
export function CodeViewer({ file, line }: { file: CodeFile; line: number | null }) {
  const html = useMemo(() => {
    const language = Prism.languages[file.language];
    const content = file.content || '';
    return language
      ? Prism.highlight(content, language, file.language)
      : (Prism.util.encode(content) as string);
  }, [file]);
  useEffect(() => {
    if (!line) return;
    const target = document.getElementById(`source-line-${line}`);
    const scroll = target?.closest('.code-scroll');
    if (target && scroll) {
      const offset = target.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
      scroll.scrollTo({
        top: scroll.scrollTop + offset - scroll.clientHeight / 2,
        behavior: 'smooth',
      });
    }
  }, [line, file.id]);
  return (
    <div className="code-scroll">
      <pre className="code-lines">
        {html.split('\n').map((text, i) => (
          <div
            key={i}
            id={`source-line-${i + 1}`}
            className={line === i + 1 ? 'highlight-line' : ''}
          >
            <span className="line-number">{i + 1}</span>
            <code dangerouslySetInnerHTML={{ __html: text || ' ' }} />
          </div>
        ))}
      </pre>
    </div>
  );
}
