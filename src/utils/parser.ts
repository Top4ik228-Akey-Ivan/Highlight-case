import type {
    ExpressionNode,
    LogicalOperator,
    ErrorNode,
} from '../types/types';

import { tokenize, type Token } from './tokenize';


// Главная функция разбора
export function parse(input: string): ExpressionNode {
    let expectedType: 'withKeys' | 'withoutKeys' | null = null;
    const tokens = tokenize(input);
    let pos = 0;

    // Функция чтобы получить текущий токен
    function peek(): Token | undefined {
        return tokens[pos];
    }

    // Функция чтобы получить текущий токен и после сдвинуть указатель вперед
    function consume(): Token | undefined {
        return tokens[pos++];
    }

    // Функция создания ошибки
    function errorNode(params: {
        message: string;
        start: number;
        end: number;
    }): ErrorNode {
        const { message, start, end } = params;

        return {
            type: 'Error',
            message,
            start,
            end,
        };
    }


    // Функция для парсинга выражения 
    function parseExpression(): ExpressionNode {
        return parseOr();
    }

    // Функция для парсинга логического выражения с OR
    function parseOr(): ExpressionNode {
        let left = parseAnd();

        if (left.type === 'Error') return left;

        while (peek()) {
            const nextToken = peek()!;

            // Обработка логических операторов
            if (nextToken.type === 'OR') {
                const operatorToken = consume()!;
                const right = parseAnd();

                if (right.type === 'Error' && right.message === 'Unexpected end of input') {
                    return errorNode({
                        message: 'Expected expression or condition after OR',
                        start: operatorToken.start,
                        end: operatorToken.end
                    })
                }

                left = {
                    type: 'LogicalExpression',
                    operator: operatorToken.value.toUpperCase() as LogicalOperator,
                    left,
                    right,
                    start: left.start,
                    end: right.end,
                };
            } else if (nextToken.type === 'NOT') {
                const operatorToken = consume()!
                return errorNode({
                    message: 'Not cant be after expression or condition',
                    start: operatorToken.start,
                    end: operatorToken.end
                })
            } else if (
                nextToken.type === 'KEY' ||
                nextToken.type === 'VALUE' ||
                nextToken.type === 'LPAREN'
            ) {
                const curToken = consume()!;
                return errorNode({
                    message: 'Expected logical operator between two expressions or conditions',
                    start: left.end,
                    end: curToken.start,
                })
            } else {
                break;
            }
        }

        return left;
    }

    // Функция для парсинга логического выражения с AND
    function parseAnd(): ExpressionNode {
        let left = parseNot();

        if (left.type === 'Error') return left;

        while (peek()) {
            const nextToken = peek()!;

            // Обработка логических операторов
            if (nextToken.type === 'AND') {
                const operatorToken = consume()!;
                const right = parseNot();

                if (right.type === 'Error' && right.message === 'Unexpected end of input') {
                    return errorNode({
                        message: 'Expected expression or condition after AND',
                        start: operatorToken.start,
                        end: operatorToken.end
                    })
                }

                left = {
                    type: 'LogicalExpression',
                    operator: operatorToken.value.toUpperCase() as LogicalOperator,
                    left,
                    right,
                    start: left.start,
                    end: right.end,
                };
            } else if (nextToken.type === 'NOT') {
                const operatorToken = consume()!
                return errorNode({
                    message: 'Not cant be after expression or condition',
                    start: operatorToken.start,
                    end: operatorToken.end
                })
            } else if (
                nextToken.type === 'KEY' ||
                nextToken.type === 'VALUE' ||
                nextToken.type === 'LPAREN'
            ) {
                const curToken = consume()!;
                return errorNode({
                    message: 'Expected logical operator between two expressions or conditions',
                    start: left.end,
                    end: curToken.start,
                })
            } else {
                break;
            }
        }
        return left;
    }

    // Функция для парсинга выражения с NOT
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
    // Функция для парсинга выражения
    function parsePrimary(): ExpressionNode {
        const token = peek();

        if (!token) {
            return errorNode({
                message: 'Unexpected end of input',
                start: input.length,
                end: input.length
            });
        }

        if (token.type === 'AND' || token.type === 'OR') {
            const curToken = consume()!
            return errorNode({
                message: 'Expected expression or condition before logical opeartor',
                start: curToken.start,
                end: curToken.end
            })
        }

        if (token.type === 'LPAREN') {
            const curToken = consume()!;
            const expr = parseExpression();
            if (peek()?.type === 'RPAREN') {
                const end = consume()!.end;
                return {
                    type: 'Group',
                    expression: expr,
                    start: curToken.start,
                    end,
                };
            }
            return errorNode({
                message: 'Expected closing parenthesis )',
                start: curToken.start,
                end: expr.end
            });
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