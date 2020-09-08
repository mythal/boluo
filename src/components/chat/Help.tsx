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
        <Text>
          <Code>挥起长剑招呼过去 /1d100 + (1d20 - 1d6)/ 劈砍伤害</Code>
        </Text>
        <Text>
          用两个斜杠（<Code>/.../</Code>）将你的指令括起来，可以数学运算、嵌套以及加括号。
        </Text>
        <Text>
          简单的投骰子可以像这样简写：<Code>/1d20</Code>。
        </Text>
        <Text>
          简写的 <Code>/1d20</Code> 中的「1」和「20」也可以省略，用 <Code>/d</Code>{' '}
          就可以了。管理员可以在频道设置中修改默认的骰子面数。
        </Text>

        <Text css={[helpTitle]}>最大/最小值</Text>
        <Text>
          投掷多个骰子的时候，可以用 max 或 min 指令来获取这些骰子的最大/最小值：<Code>/max 4d20/</Code>
          。也可以和别的指令组合在一起：<Code>…/max(4d20) + 1d4 * 2/…</Code>。
        </Text>
      </div>
    </Dialog>
  );
}

export default Help;
