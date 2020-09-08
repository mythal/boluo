import * as React from 'react';
import Dialog from '../molecules/Dialog';
import Text from '../atoms/Text';
import { fontBold, mY, textLg } from '../../styles/atoms';
import { Code } from '../atoms/Code';
import { css } from '@emotion/core';

interface Props {
  dismiss: () => void;
}

const dialogStyle = css`
  width: 30rem;
`;

const helpTitle = css`
  ${[textLg, fontBold, mY(2)]};
`;

function Help({ dismiss }: Props) {
  return (
    <Dialog dismiss={dismiss} confirm={dismiss} confirmText="知道了" title="帮助">
      <div css={dialogStyle}>
        <Text css={[helpTitle]}>投骰子</Text>
        <Text>用两个斜杠号将你的指令括起来。比如说：</Text>
        <Text>
          <Code>挥起长剑招呼过去 /1d100 + (1d20 - 1d6)/ 劈砍伤害</Code>
        </Text>
        <Text>
          仅仅是单独丢个骰子，不需要复杂表达式的话，像这样简写：<Code>/1d20</Code>。
        </Text>
        <Text>
          另外<Code>/1d20</Code>中的「1」和「20」也可以省略，单独用个<Code>/d</Code>
          。频道所设置的默认面数将作为骰子面数。
        </Text>

        <Text css={[helpTitle]}>最大/最小值</Text>
        <Text>
          如果投掷多个骰子，可以用 max 或 min 指令来获取这些骰子的最大/最小值：<Code>/max 4d20/</Code>
          。也可以和别的指令组合在一起：<Code>…/max(4d20) + 1d4 * 2/…</Code>。
        </Text>
      </div>
    </Dialog>
  );
}

export default Help;
