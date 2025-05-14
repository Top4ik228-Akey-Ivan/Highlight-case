type TokenType =
  | 'logical-operator'
  | 'logical-prefix'
  | 'key'
  | 'value'
  | 'bracket'
  | 'whitespace'
  | 'error'
  | 'unknown';

export interface Token {
  text: string;
  type: TokenType;
}

export type ExpressionType = 'Type1' | 'Type2' | 'Mixed' | null;