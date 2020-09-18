import * as React from 'react';
import Dialog from '../molecules/Dialog';
import Text from '../atoms/Text';
import { link } from '../../styles/atoms';
import { Code } from '../atoms/Code';
import { css } from '@emotion/core';
import ExternalLink from '../atoms/ExternalLink';

interface Props {
  dismiss: () => void;
}

const dialogStyle = css`
  width: 30rem;
`;

function Help({ dismiss }: Props) {
  return (
    <Dialog dismiss={dismiss} confirm={dismiss} confirmText="知道了" title="格式帮助">
      <div css={dialogStyle}>
        <Text>
          这里是骰子格式的速查，均可复制到输入框尝试。
          <ExternalLink css={link} to="https://forum.boluo.chat/d/3">
            查阅详细说明请点击此处
          </ExternalLink>
          。
        </Text>
        <Text>
          <Code>.r 挥起长剑招呼过去命中 1d20 + 4</Code>
        </Text>
        <Text>
          <Code>爆裂魔法！ {'{4d20h2 - 3}'} =【4d20h2 - 3】</Code> 无前置 <Code>.r</Code>
        </Text>
        <Text>
          <Code>.r d = 1d20 = 1d = d20 默认面数可设置</Code> <Code>.rd</Code>
        </Text>
        <Text>
          <Code>.r 取最高三个 4d20h3 = 4d20k3</Code>
        </Text>
        <Text>
          <Code>取最低两个 {'{3d20l2}'}</Code>
        </Text>
        <Text>
          <Code>.r 普通：coc 奖励骰：cocb、cocbb 惩罚骰：cocp、cocpp</Code>
        </Text>
        <Text>
          <Code>.r 计算成功等级 coc 42 ← 技能值 cocb (43 - 1) ← 可运算</Code>
        </Text>
        <Text>
          <Code>.r fate FATE规则骰子，{'{dF}'} 也可以</Code>
        </Text>
        <Text>
          <Code>.r WoD 骰池：w 12 w 20 成功下限设为6：w_6 10</Code>
        </Text>
        <Text>
          <Code>.r sr 10 srp 10 shadowrun 骰池</Code>
        </Text>
      </div>
    </Dialog>
  );
}

export default Help;
