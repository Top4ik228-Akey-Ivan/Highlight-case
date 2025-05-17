// Типы токенов
type TokenType = 'KEY' | 'EQ' | 'VALUE' | 'AND' | 'OR' | 'NOT' | 'LPAREN' | 'RPAREN';

export interface Token {
    type: TokenType;
    value: string;
    start: number;
    end: number;
}

// Токенизация строки
export function tokenize(input: string): Token[] {
    const regex = /\s+|\b(?:AND|OR|NOT)\b|[()=]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\w+/g;
    const tokens: Token[] = [];

    let match;
    while ((match = regex.exec(input)) !== null) {
        const value = match[0];
        const start = match.index;
        const end = start + value.length;

        if (/^\s+$/.test(value)) continue;

        let type: TokenType;

        if (value === '(') type = 'LPAREN';
        else if (value === ')') type = 'RPAREN';
        else if (value === '=') type = 'EQ';
        else if (/\bAND\b/i.test(value)) type = 'AND';
        else if (/\bOR\b/i.test(value)) type = 'OR';
        else if (/\bNOT\b/i.test(value)) type = 'NOT';
        else if (/^["'].*["']$/.test(value)) type = 'VALUE';
        else type = 'KEY';

        tokens.push({ type, value, start, end });
    }
    return tokens;
}