import React, { useRef, useState } from 'react';
import '../styles/HighlightedTextarea.scss';
import { parse } from '../utils/parser';
import { getHighlightSpansFromAST } from '../utils/highlighting';
import type { HighlightSpan } from '../types/types';

export const HighlightedTextarea: React.FC = () => {
  const [content, setContent] = useState('');
  const highlightRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const renderHighlighted = (input: string, spans: HighlightSpan[]) => {
    if (!spans.length) return escapeHtml(input);

    let result = '';
    let lastIndex = 0;

    spans.forEach((span) => {
      result += escapeHtml(input.slice(lastIndex, span.start));
      result += `<span class="${span.className}">${escapeHtml(input.slice(span.start, span.end))}</span>`;
      lastIndex = span.end;
    });

    result += escapeHtml(input.slice(lastIndex));
    return result;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const ast = parse(value);
    console.log(ast);
    const spans = getHighlightSpansFromAST(ast);
    const html = renderHighlighted(value, spans);

    if (highlightRef.current) {
      highlightRef.current.innerHTML = html;
    }

    setContent(value);
  };

  return (
    <div className="container">
      <div className="highlight" ref={highlightRef} aria-hidden="true" />
      <textarea
        ref={textareaRef}
        className="textarea"
        value={content}
        onChange={handleChange}
        spellCheck={false}
      />
    </div>
  );
};
