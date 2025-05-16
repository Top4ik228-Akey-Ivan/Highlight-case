import type {
    ExpressionNode,
    LogicalOperator,
    ErrorNode,
} from '../types/types';

// Типы токенов
type TokenType = 'KEY' | 'EQ' | 'VALUE' | 'AND' | 'OR' | 'NOT' | 'LPAREN' | 'RPAREN';

interface Token {
    type: TokenType;
    value: string;
    start: number;
    end: number;
}

// Токенизация строки
function tokenize(input: string): Token[] {
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
    console.log(tokens)
    return tokens;
}

// Главная функция разбора
export function parse(input: string): ExpressionNode {
    let expectedType: 'withKeys' | 'withoutKeys' | null = null;
    const tokens = tokenize(input);
    let pos = 0;

    function peek(): Token | undefined {
        return tokens[pos];
    }

    function consume(): Token | undefined {
        return tokens[pos++];
    }

    function errorNode(params: {
        message: string;
        start: number;
        end: number;
        left?: ExpressionNode;
        right?: ExpressionNode;
        operator?: LogicalOperator;
    }): ErrorNode {
        const { message, start, end, left, right, operator } = params;

        if (operator !== undefined) {
            return {
                type: 'Error',
                message,
                start,
                end,
                left,
                right,
                operator,
            };
        }

        if (operator === undefined && (left || right)) {
            return {
                type: 'Error',
                message,
                start,
                end,
                left,
                right,
            };
        }

        return {
            type: 'Error',
            message,
            start,
            end,
        };
    }


    function parseExpression(): ExpressionNode {
        return parseOr();
    }

    function parseOr(): ExpressionNode {
        let left = parseAnd();

        while (peek()) {
            const nextToken = peek()!;

            if (nextToken.type === 'NOT') {
                const notToken = consume()!;
                const right = parsePrimary();
                return errorNode({
                    message: 'NOT operator cant be after expression or condition',
                    start: notToken.start,
                    end: notToken.end,
                    left: left,
                    right: right,
                    operator: nextToken.type
                });
            }

            if (nextToken.type === 'OR') {
                const operatorToken = consume()!;
                const right = parseAnd();

                if (right.type === 'Error' && right.message === 'Unexpected end of input') {
                    return errorNode({
                        message: 'Expected expression after logical operator',
                        start: operatorToken.start,
                        end: operatorToken.end,
                        left: left,
                        right: right,
                        operator: nextToken.type
                    });
                }

                left = {
                    type: 'LogicalExpression',
                    operator: 'OR',
                    left,
                    right,
                    start: left.start,
                    end: right.end,
                };
            } else if (
                nextToken.type === 'KEY' ||
                nextToken.type === 'VALUE' ||
                nextToken.type === 'LPAREN'
            ) {
                const right = parseAnd();
                return errorNode({
                    message: 'Missing logical operator between expressions',
                    start: left.end,
                    end: nextToken.start,
                    left: left,
                    right: right
                });
            } else {
                break;
            }
        }

        return left;
    }


    function parseAnd(): ExpressionNode {
        let left = parseNot();

        while (peek()) {
            const nextToken = peek()!;

            // Проверка на допустимость позиции NOT
            if (nextToken.type === 'NOT') {
                const notToken = consume()!;
                const right = parsePrimary();
                return errorNode({
                    message: 'NOT operator cant be after expression or condition',
                    start: notToken.start,
                    end: notToken.end,
                    left: left,
                    right: right,
                    operator: nextToken.type
                });
            }

            // Обработка логических операторов
            if (nextToken.type === 'AND') {
                const operatorToken = consume()!;
                const right = parseNot();

                if (right.type === 'Error' && right.message === 'Unexpected end of input') {
                    return errorNode({
                        message: 'Expected expression after logical operator',
                        start: operatorToken.start,
                        end: operatorToken.end,
                        left: left,
                        right: right,
                        operator: nextToken.type
                    });
                }

                left = {
                    type: 'LogicalExpression',
                    operator: operatorToken.value.toUpperCase() as LogicalOperator,
                    left,
                    right,
                    start: left.start,
                    end: right.end,
                };
            } else if (
                nextToken.type === 'KEY' ||
                nextToken.type === 'VALUE' ||
                nextToken.type === 'LPAREN'
            ) {
                const right = parseNot()
                return errorNode({
                    message: 'Missing logical operator between expressions',
                    start: left.end,
                    end: nextToken.start,
                    left: left,
                    right: right
                })
            } else {
                break;
            }
        }
        return left;
    }

    function parseNot(): ExpressionNode {
        if (peek()?.type === 'NOT') {
            const notToken = consume()!;
            const expr = parsePrimary();

            return {
                type: 'NotExpression',
                expression: expr,
                start: notToken.start,
                end: expr.end,
            };
        }
        return parsePrimary();
    }

    function parsePrimary(): ExpressionNode {
        const token = peek();

        if (!token) {
            return errorNode({
                message: 'Unexpected end of input',
                start: input.length,
                end: input.length
            });
        }

        if (token.type === 'LPAREN') {
            const start = consume()!.start;
            const expr = parseExpression();
            if (peek()?.type === 'RPAREN') {
                const end = consume()!.end;
                return {
                    type: 'Group',
                    expression: expr,
                    start,
                    end,
                };
            }
        }

        if (token.type === 'KEY') {
            const key = consume()!;
            if (peek()?.type === 'EQ') {
                consume(); // skip '='
                const valueToken = peek();
                if (valueToken?.type === 'VALUE') {
                    const value = consume()!;

                    if (expectedType === null) expectedType = 'withKeys'
                    if (expectedType !== 'withKeys') {
                        return errorNode({
                            message: 'Cannot mix expressions with and without keys',
                            start: key.start,
                            end: value.end
                        })
                    }

                    return {
                        type: 'Condition',
                        key: key.value,
                        value: value.value,
                        start: key.start,
                        end: value.end,
                    };
                } else {
                    return errorNode({
                        message: 'Expected value after =',
                        start: key.start,
                        end: key.end
                    });
                }
            }
        }

        if (token.type === 'VALUE') {
            const value = consume()!;

            if (expectedType === null) expectedType = 'withoutKeys';
            if (expectedType !== 'withoutKeys') {
                return errorNode({
                    message: 'Cannot mix expressions with and without keys',
                    start: value.start,
                    end: value.end
                })
            }
            return {
                type: 'Condition',
                key: '',
                value: value.value,
                start: value.start,
                end: value.end
            }
        }

        return errorNode({
            message: `Unexpected token: ${token.value}`,
            start: token.start,
            end: token.end
        });
    }

    return parseExpression();
}

