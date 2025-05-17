import React, { useState, useMemo, useRef, useEffect } from 'react';
import styles from '../styles/HighlightedTextArea.module.scss';

import { Input } from 'antd';
import type { ExpressionType, Token } from '../types/types';
const { TextArea } = Input;

const tokenColors: Record<Token['type'], string> = {
    'unknown': '#00000080',
    'logical-operator': '#9c27b0',
    'logical-prefix': '#9c27b0',
    'key': '#2196f3',
    'value': '#4caf50',
    'bracket': 'transparent',
    'whitespace': 'inherit',
    'error': 'inherit'
};

const HighlightedTextarea: React.FC = () => {
    const [content, setContent] = useState<string>('');
    const textareaRef = useRef<HTMLDivElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);

    // Разбить строку на токены
    const tokenize = (text: string): Token[] => {
        const regex = /([A-Za-z0-9_]+=)|("(?:\\"|[^"])*"|'(?:\\'|[^'])*')|(AND|OR|NOT|and|or|not)|([A-Za-z0-9_]+)|(\(|\))|(\s+)/g;
        const tokens: Token[] = [];
        let match: RegExpExecArray | null;
        let lastIndex = 0;
        let expressionType: ExpressionType = null;
        let firstType: 'Type1' | 'Type2' | null = null;
        let bracketCount = 0;
        let lastBlockIndex: number | null = null;
        let afterKey = false;

        while ((match = regex.exec(text)) !== null) {
            const tokenText = match[0];
            const startIndex = match.index;

            if (startIndex > lastIndex) {
                const unknownText = text.slice(lastIndex, startIndex);
                tokens.push({ text: unknownText, type: 'unknown' });
            }

            let type: Token['type'] = 'unknown';

            if (match[1]) {
                type = 'key';
                if (expressionType === 'Type1') expressionType = 'Mixed';
                else if (expressionType === null) expressionType = 'Type2';
                if (firstType === null) firstType = 'Type2';
                afterKey = true;
            } else if (match[2]) {
                const quoteType = tokenText[0];
                const content = tokenText.slice(1, -1);
                const isValid = (() => {
                    if (tokenText[tokenText.length - 1] !== quoteType) return false;
                    const re = new RegExp(`(?<!\\\\)${quoteType}`, 'g');
                    return !re.test(content);
                })();

                type = isValid ? 'value' : 'error';

                if (expressionType === null) {
                    expressionType = 'Type1';
                    if (firstType === null) firstType = 'Type1';
                }
                if (firstType === 'Type2' && !afterKey) type = 'error';
                else if (firstType === 'Type1' && afterKey) type = 'error';

                afterKey = false;
            } else if (match[3]) {
                // AND / OR / NOT
                if (match[3].toUpperCase() === 'NOT') {
                    type = 'logical-prefix';
                } else {
                    type = 'logical-operator';
                }
                afterKey = false;
            } else if (match[4]) {
                type = 'value';

                if (expressionType === null) {
                    expressionType = 'Type1';
                    if (firstType === null) firstType = 'Type1';
                }

                if (firstType === 'Type2' && !afterKey) type = 'error';
                else if (firstType === 'Type1' && afterKey) type = 'error';

                afterKey = false;
            } else if (match[5]) {
                type = 'bracket';
                bracketCount += tokenText === '(' ? 1 : -1;
                if (bracketCount < 0) type = 'error';
            } else if (match[6]) {
                type = 'whitespace';
                afterKey = false;
            }

            tokens.push({ text: tokenText, type });

            // Проверка логических операторов
            if (type === 'logical-operator') {
                let j = tokens.length - 2;
                while (j >= 0 && tokens[j].type === 'whitespace') j--;

                const prevToken = tokens[j];
                if (!prevToken || !['value', 'bracket'].includes(prevToken.type)) {
                    tokens[tokens.length - 1].type = 'error';
                }

                const remainingText = text.slice(regex.lastIndex);
                const lookaheadMatch = /\S/.exec(remainingText);
                if (!lookaheadMatch) {
                    tokens[tokens.length - 1].type = 'error';
                }
            }

            // Проверка логических префиксов (NOT)
            if (type === 'logical-prefix') {
                let j = tokens.length - 2;
                while (j >= 0 && tokens[j].type === 'whitespace') j--;

                const prevToken = tokens[j];
                if (prevToken && ['value', 'key', 'bracket'].includes(prevToken.type)) {
                    tokens[tokens.length - 1].type = 'error';
                }
            }

            // Проверка значения после ключа
            if (type === 'value') {
                if (
                    lastBlockIndex !== null &&
                    !tokens.slice(lastBlockIndex)
                    .some(t => ['logical-operator', 'logical-prefix', 'error'].includes(t.type))
                ) {
                    tokens[lastBlockIndex].type = 'error';
                }
                lastBlockIndex = tokens.length - 1;
            }

            lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
            tokens.push({ text: text.slice(lastIndex), type: 'unknown' });
        }

        // Проверка сбалансированности скобок
        if (bracketCount !== 0) {
            tokens.forEach(token => {
                if (token.type === 'bracket') token.type = 'error';
            });
        }

        return tokens;
    };

    const tokens = useMemo(() => tokenize(content), [content]);

    // Генерация HTML подсветки
    const highlightedHTML = useMemo(() => {
        return tokens.map(token => {
            const style = token.type === 'error'
                ? 'text-decoration: underline wavy red;'
                : `color: ${tokenColors[token.type]};`;
            return `<span style="${style}">${token.text}</span>`;
        }).join('');
    }, [tokens]);

    // Обновление подсвеченного слоя
    useEffect(() => {
        if (highlightRef.current) {
            highlightRef.current.innerHTML = highlightedHTML;
        }
    }, [highlightedHTML]);

    return (
        <div className={styles.container}>
            <div
                ref={highlightRef}
                className={styles.highlight}
                aria-hidden="true"
            />
            <TextArea
                ref={textareaRef}
                className={styles.textarea}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
                autoSize={{ minRows: 5 }}
            />
        </div>
    );
};
export default HighlightedTextarea;