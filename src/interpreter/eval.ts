import Prando from 'prando';
import { EvaluatedExprNode, ExprNode } from './entities';

export const TOO_MUCH_LAYER = 'TOO_MUCH_LAYER';

export const evaluate = (node: ExprNode, rng: Prando, layer = 0): EvaluatedExprNode => {
  if (layer > 64) {
    throw TOO_MUCH_LAYER;
  }
  if (node.type === 'Num') {
    return node;
  } else if (node.type === 'Roll') {
    if (node.counter > 64 || node.face > 121072) {
      return { ...node, value: 0, values: [] };
    }
    const values: number[] = [];
    if (node.face === 1) {
      values.push(node.counter);
    } else {
      for (let i = 0; i < node.counter; i++) {
        const x = rng.nextInt(1, node.face);
        values.push(x);
      }
    }
    const value = values.reduce((a, b) => a + b, 0);
    return { ...node, values, value };
  } else if (node.type === 'Binary') {
    const l = evaluate(node.l, rng, layer + 1);
    const r = evaluate(node.r, rng, layer + 1);
    let value;
    switch (node.op) {
      case '+':
        value = l.value + r.value;
        break;
      case '-':
        value = l.value - r.value;
        break;
      case '×':
        value = l.value * r.value;
        break;
      case '÷':
        value = Math.floor(l.value / r.value);
        break;
    }

    return { ...node, l, r, value };
  } else if (node.type === 'Max') {
    const inner = evaluate(node.node, rng, layer + 1);
    if (inner.type !== 'Roll') {
      return inner;
    }
    return { type: 'Max', node: inner, value: Math.max(...inner.values) };
  } else if (node.type === 'Min') {
    const inner = evaluate(node.node, rng, layer + 1);
    if (inner.type !== 'Roll') {
      return inner;
    }
    return { type: 'Min', node: inner, value: Math.min(...inner.values) };
  } else if (node.type === 'SubExpr') {
    const inner = evaluate(node.node, rng, layer + 1);
    return { ...node, node: inner, value: inner.value };
  }
  throw Error('unexpected');
};
