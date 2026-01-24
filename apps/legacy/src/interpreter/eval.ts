import Prando from 'prando';
import { compare, compareRev } from '../utils/helper';
import { type CocRoll, type EvaluatedExprNode, type ExprNode, type FateResult } from './entities';

export const TOO_MUCH_LAYER = 'TOO_MUCH_LAYER';
export const MAX_DICE_COUNTER = 64;

export const d6ToFateDice = (d6: number): number => {
  if (d6 >= 5) {
    return 1;
  } else if (d6 >= 3) {
    return 0;
  } else {
    return -1;
  }
};

export const fateDice = (rng: Prando): number => {
  return d6ToFateDice(rng.nextInt(1, 6));
};

export const evaluate = (node: ExprNode, rng: Prando, layer = 0): EvaluatedExprNode => {
  if (layer > 64) {
    throw TOO_MUCH_LAYER;
  }
  if (node.type === 'Num') {
    return node;
  } else if (node.type === 'Roll') {
    if (node.counter > MAX_DICE_COUNTER || node.face > 121072) {
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
    if (node.filter) {
      const [type, counter] = node.filter;
      let filtered: number[];
      if (type === 'HIGH') {
        filtered = values.sort(compare).slice(0, counter);
      } else {
        filtered = values.sort(compareRev).slice(0, counter);
      }
      const value = filtered.reduce((a, b) => a + b, 0);
      return { ...node, values, value, filtered };
    }
    const value = values.reduce((a, b) => a + b, 0);
    return { ...node, values, value };
  } else if (node.type === 'FateRoll') {
    const values: FateResult['values'] = [
      fateDice(rng),
      fateDice(rng),
      fateDice(rng),
      fateDice(rng),
    ];
    const value = values.reduce((a: number, b: number) => a + b, 0);
    return { type: 'FateRoll', value, values };
  } else if (node.type === 'DicePool') {
    const values: number[] = [];
    let value = 0;
    if (node.face <= 1) {
      value = node.face * node.counter;
      const values = new Array(node.counter).fill(node.face);
      return { ...node, value, values };
    }
    const doAdditionRoll = node.addition > node.face >> 1;
    for (let i = 0; i < node.counter && value < 1024; i++) {
      const x = rng.nextInt(1, node.face);
      values.push(x);
      if (doAdditionRoll && x >= node.addition) {
        i--;
      }
      if (x >= node.min) {
        value++;
      }
    }
    return { ...node, value, values };
  } else if (node.type === 'CocRoll') {
    const ones = rng.nextInt(0, 9);
    const tens = rng.nextInt(0, 9) * 10;
    let rolled = tens + ones;
    if (rolled === 0) {
      rolled = 100;
    }
    let value = rolled;
    let modifier: number = rng.nextInt(0, 9) * 10;
    const modifiers: number[] = [modifier];
    switch (node.subType) {
      case 'NORMAL':
        modifiers.pop();
        break;
      case 'BONUS_2':
        if (modifier + ones !== 0 && modifier + ones < value) {
          value = modifier + ones;
        }
        modifier = rng.nextInt(0, 9) * 10;
        modifiers.push(modifier);
        if (modifier > modifiers[0]) {
          break;
        }
      // eslint-disable-next-line no-fallthrough
      case 'BONUS':
        if (modifier + ones !== 0 && modifier + ones < value) {
          value = modifier + ones;
        }
        break;
      case 'PENALTY_2':
        if (modifier > tens || (modifier === 0 && ones === 0)) {
          value = modifier + ones;
          if (value === 0) {
            value = 100;
          }
        }
        modifier = rng.nextInt(0, 9) * 10;
        modifiers.push(modifier);
        if (modifier < modifiers[0]) {
          break;
        }
      // eslint-disable-next-line no-fallthrough
      case 'PENALTY':
        if (modifier > tens || (modifier === 0 && ones === 0)) {
          value = modifier + ones;
          if (value === 0) {
            value = 100;
          }
        }
        break;
    }
    let targetValue: number | undefined = undefined;
    if (node.target) {
      const inner = evaluate(node.target, rng, layer + 1);
      targetValue = inner.value;
    }

    return { ...node, rolled, modifiers, value, targetValue };
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
    return { ...node, evaluatedNode: inner, value: inner.value };
  } else if (node.type === 'Repeat') {
    const evaluated = [];
    let value = 0;
    for (let i = 0; i < node.count; i++) {
      const result = evaluate(node.node, rng, layer + 1);
      value += result.value;
      evaluated.push(result);
    }
    return { ...node, evaluated, value };
  } else {
    return { type: 'Unknown', value: 0 };
  }
};

export const makeRng = (seed?: number[]): Prando | undefined => {
  if (seed === undefined || seed.length !== 4) {
    return undefined;
  }
  let a = 0;
  for (const i of seed) {
    a = a * 256 + i;
  }
  return new Prando(a);
};

export const cocRollSubTypeDisplay = (subType: CocRoll['subType']): string | null => {
  let modifierName: string | null = null;
  if (subType === 'BONUS') {
    modifierName = '奖';
  } else if (subType === 'BONUS_2') {
    modifierName = '奖²';
  } else if (subType === 'PENALTY') {
    modifierName = '罚';
  } else if (subType === 'PENALTY_2') {
    modifierName = '罚²';
  }
  return modifierName;
};

export const cocSuccessLevelDisplay = (value: number, targetValue: number): string => {
  let successName: string;
  if (value === 100 || (targetValue < 50 && value > 95)) {
    successName = '大失败';
  } else if (value === 1) {
    successName = '大成功';
  } else if (value > targetValue) {
    successName = '失败';
  } else if (value <= Math.floor(targetValue / 5)) {
    successName = '⅕极难成功';
  } else if (value <= targetValue >> 1) {
    successName = '½困难成功';
  } else {
    successName = '常规成功';
  }
  return successName;
};

const fateDiceToText = (dice: number): string => {
  if (dice > 0) {
    return '+';
  } else if (dice < 0) {
    return '-';
  } else {
    return '▢';
  }
};

export const nodeToText = (node: EvaluatedExprNode): string => {
  if (node.type === 'Roll') {
    const values = node.values.length > 1 ? `=[${node.values.join(', ')}]` : '';
    const filtered =
      node.filter && node.filtered && node.filtered.length !== node.values.length
        ? `| ${node.filter[0]} ${node.filter[1]}=[${node.filtered.join(', ')}]`
        : '';
    return `${node.counter}d${node.face}${values}${filtered}=${node.value}`;
  } else if (node.type === 'Binary') {
    return `${nodeToText(node.l)}${node.op}${nodeToText(node.r)}=${node.value}`;
  } else if (node.type === 'Num') {
    return String(node.value);
  } else if (node.type === 'SubExpr') {
    return `(${nodeToText(node.evaluatedNode)})=${node.value}`;
  } else if (node.type === 'FateRoll') {
    return `${node.values.map(fateDiceToText).join('')}=${node.value}`;
  } else if (node.type === 'DicePool') {
    return `${node.counter}d${node.face} [${node.values.join(', ')}] ≥ ${node.min} ⇒ ${node.value}`;
  } else if (node.type === 'CocRoll') {
    const { subType } = node;
    const typeDisplay = cocRollSubTypeDisplay(subType) || '';
    const modifier =
      node.subType === 'NORMAL'
        ? ''
        : `=${node.rolled}${typeDisplay}[${node.modifiers.join(', ')}]`;
    const successLevel =
      node.targetValue == null
        ? ''
        : `: (基准${node.targetValue})${cocSuccessLevelDisplay(node.value, node.targetValue)}`;
    return `${node.value}${modifier}${successLevel}`;
  } else if (node.type === 'Repeat') {
    const textList: string[] = node.evaluated.map(nodeToText);
    return textList.join(', ');
  }
  return '[未知]';
};
