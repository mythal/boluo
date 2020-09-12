import * as React from 'react';
import Dialog from '../molecules/Dialog';
import Text from '../atoms/Text';
import { fontBold, mY, textLg, textXs } from '../../styles/atoms';
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
    <Dialog dismiss={dismiss} confirm={dismiss} confirmText="知道了" title="格式帮助">
      <div css={dialogStyle}>
        <Text css={[helpTitle]}>投骰子</Text>
        <Text>
          <Code>.r 挥起长剑招呼过去 1d100 + (1d20 - 1d6) 劈砍伤害</Code>
        </Text>
        <Text>
          在消息的开头加上<Code>.r</Code>，就会自动识别消息中的骰子指令了，可以数学运算、嵌套以及加括号。
        </Text>
        <Text>
          也可以选择不用 <Code>.r</Code> 命令，而是在普通的消息中嵌入指令，在花括号或者方括号中写下骰子指令就可以了：
          <Code>{'{4d20h2 - 3}'} 或者 【4d20h2 - 3】</Code>。
        </Text>
        <Text>
          <Code>1d20</Code> 这样的骰子中的「1」和「20」可以省略，用一个字母 <Code>d</Code>{' '}
          就可以表示了。管理员可以在频道设置中修改默认的骰子面数。
        </Text>

        <Text css={[helpTitle]}>过滤最大最小的骰子</Text>
        <Text>
          <Code>我有一个优势 {'{2d20h1}'}</Code> 像这样用跟在骰子后面的 <Code>h[N]</Code> 来取最大的 N 个骰子。（
          <Code>h</Code> 也可以用 <Code>k</Code> 表示）
        </Text>
        <Text>
          最小也差不多，在骰子后面加 <Code>l[N]</Code> 就可以得到最小的 N 个骰子了：
          <Code>这次我是劣势了 {'2d20l1'}</Code>。
        </Text>
        <Text css={[textXs]}>
          其中 <Code>h</Code> 代表 highest；<Code>k</Code>代表 keep；<Code>l</Code> 代表 lowest。
        </Text>
      </div>
    </Dialog>
  );
}

export default Help;
