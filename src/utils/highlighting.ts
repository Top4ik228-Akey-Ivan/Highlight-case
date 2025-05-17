import type { ExpressionNode, HighlightSpan } from '../types/types';

export function getHighlightSpansFromAST(node: ExpressionNode): HighlightSpan[] {
  const spans: HighlightSpan[] = [];

  const visit = (n: ExpressionNode) => {
    switch (n.type) {
      case 'Condition': {
        const keyLength = n.key.length;
        const valueLength = n.value.length;

        spans.push({
          start: n.start,
          end: n.start + keyLength,
          className: 'key',
        });

        spans.push({
          start: n.end - valueLength,
          end: n.end,
          className: 'value',
        });
        break;
      }

      case 'LogicalExpression': {
        visit(n.left);
        visit(n.right);

        spans.push({
          start: n.left.end,
          end: n.right.start,
          className: 'operator',
        });
        break;
      }

      case 'NotExpression': {
        spans.push({
          start: n.start,
          end: n.expression.start,
          className: 'operator',
        });
        visit(n.expression);
        break;
      }

      case 'Group': {
        visit(n.expression);
        break;
      }

      case 'Error': {
        spans.push({
          start: n.start,
          end: n.end,
          className: 'error',
        });

        if ('left' in n && n.left) {
          visit(n.left);
        }

        if ('right' in n && n.right) {
          visit(n.right);
        }
        if ('expression' in n && n.expression) {
          visit(n.expression);
        }
        break;
      }
      default:
        break;
    }
  };

  visit(node);
  return spans.sort((a, b) => a.start - b.start);
}
