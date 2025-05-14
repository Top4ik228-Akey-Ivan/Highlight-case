import React, { useState, useMemo, useRef, useEffect } from 'react';
import styles from '../styles/HighlightedTextArea.module.scss';

interface Token {
    text: string;
    type: 'logical-operator' | 'key' | 'value' | 'bracket' | 'whitespace' | 'error' | 'unknown';
}

// Цвета для разных типов токенов
const tokenColors: Record<Token['type'], string> = {
    'unknown': '#00000080',
    'logical-operator': '#9c27b0',
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

    const tokenize = (text: string): Token[] => {
        const regex = /([A-Za-z0-9_]+=)|("(?:\\"|[^"])*"|'[^']*')|(\(|\))|(AND|OR|NOT)|(\s+)/g;
        const tokens: Token[] = [];
        let match: RegExpExecArray | null;
        let lastIndex = 0;
        let expressionType: 'Type1' | 'Type2' | 'Mixed' | null = null;
        let firstType: 'Type1' | 'Type2' | null = null;
        let bracketCount = 0;
        let lastBlockIndex: number | null = null;
        let afterKey = false;

        while ((match = regex.exec(text)) !== null) {
            const tokenText = match[0];
            const startIndex = match.index;

            // Добавляем unknown, если между match-ами есть пропущенный текст
            if (startIndex > lastIndex) {
                const unknownText = text.slice(lastIndex, startIndex);
                tokens.push({ text: unknownText, type: 'unknown' });
            }

            let type: Token['type'] = 'unknown'; // по умолчанию

            if (match[1]) {
                type = 'key';
                if (expressionType === 'Type1') expressionType = 'Mixed';
                else if (expressionType === null) expressionType = 'Type2';
                if (firstType === null) firstType = 'Type2';
                afterKey = true;
            } else if (match[2]) {
                type = 'value';
                if (expressionType === null) {
                    expressionType = 'Type1';
                    if (firstType === null) firstType = 'Type1';
                }
                if (firstType === 'Type2' && !afterKey) type = 'error';
                else if (firstType === 'Type1' && afterKey) type = 'error';
                afterKey = false;
            } else if (match[3]) {
                type = 'bracket';
                bracketCount += tokenText === '(' ? 1 : -1;
                if (bracketCount < 0) type = 'error';
            } else if (match[4]) {
                type = 'logical-operator';
                afterKey = false;
            } else if (match[5]) {
                type = 'whitespace';
                afterKey = false;
            }

            tokens.push({ text: tokenText, type });

            if (type === 'value') {
                if (
                    lastBlockIndex !== null &&
                    !tokens.slice(lastBlockIndex).some(t => t.type === 'logical-operator')
                ) {
                    tokens[lastBlockIndex].type = 'error';
                }
                lastBlockIndex = tokens.length - 1;
            }

            lastIndex = regex.lastIndex;
        }

        // Добавляем оставшийся хвост как unknown
        if (lastIndex < text.length) {
            tokens.push({ text: text.slice(lastIndex), type: 'unknown' });
        }

        if (bracketCount !== 0) {
            tokens.forEach(token => {
                if (token.type === 'bracket') token.type = 'error';
            });
        }

        return tokens;
    };



    const tokens = useMemo(() => tokenize(content), [content]);
    console.log(tokens);

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            return {
                startContainer: range.startContainer,
                startOffset: range.startOffset
            };
        }
        return null;
    };

    const restoreSelection = (saved: { startContainer: Node, startOffset: number } | null) => {
        if (!saved) return;
        const sel = window.getSelection();
        if (sel) {
            const range = document.createRange();
            range.setStart(saved.startContainer, saved.startOffset);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    };


    // Генерация HTML с подсветкой
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

    // Обработчик изменения текста
    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        const selection = saveSelection(); // сохраняем курсор
        const newText = e.currentTarget.textContent || '';
        setContent(newText);

        // Задержка, чтобы DOM обновился
        setTimeout(() => {
            restoreSelection(selection);
        }, 0);
    };


    // Обработчик вставки текста
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    };

    return (
        <div className={styles.container}>
            <div
                ref={highlightRef}
                className={styles.highlight}
                aria-hidden="true"
            />
            <div
                ref={textareaRef}
                className={styles.textarea}
                contentEditable
                onInput={handleInput}
                onPaste={handlePaste}
                spellCheck={false}
                suppressContentEditableWarning
            >
                {content}
            </div>
        </div>
    );
};

export default HighlightedTextarea;