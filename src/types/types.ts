export type LogicalOperator = 'AND' | 'OR' | 'NOT';

export interface ASTNode {
    type: string;
    start: number;
    end: number;
}

export interface ConditionNode extends ASTNode {
    type: 'Condition';
    key: string;
    value: string;
}

export interface LogicalExpressionNode extends ASTNode {
    type: 'LogicalExpression';
    operator: LogicalOperator;
    left: ExpressionNode;
    right: ExpressionNode;
}

export interface NotExpressionNode extends ASTNode {
    type: 'NotExpression';
    expression: ExpressionNode;
}

export interface GroupNode extends ASTNode {
    type: 'Group';
    expression: ExpressionNode;
}

export interface ErrorNode extends ASTNode {
    type: 'Error';
    message: string;
    left?: ExpressionNode;
    right?: ExpressionNode;
    operator?: LogicalOperator;
    expression?: ExpressionNode;
}

export type ExpressionNode =
    | ConditionNode
    | LogicalExpressionNode
    | NotExpressionNode
    | GroupNode
    | ErrorNode


export interface HighlightSpan {
    start: number;
    end: number;
    className: 'key' | 'value' | 'operator' | 'error';
}