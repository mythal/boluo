import { css } from '@emotion/react';
import * as React from 'react';
import { useState } from 'react';
import D20 from '../../assets/icons/d20.svg';
import rollExample from '../../assets/roll-example.png';
import { fontBold, mY, roundedSm, spacingN, textSm } from '../../styles/atoms';
import { black, blue, textColor } from '../../styles/colors';
import { Code } from '../atoms/Code';
import { HelpText } from '../atoms/HelpText';
import Icon from '../atoms/Icon';
import Text from '../atoms/Text';
import Dialog from '../molecules/Dialog';

interface Props {
  dismiss: () => void;
}

const contentStyle = css`
  width: 30rem;
  min-height: 20rem;
`;

const image = css`
  width: 100%;
  border: ${spacingN(2)} solid ${black};
  ${[roundedSm, mY(2)]};
  display: block;
`;

function Basic() {
  return (
    <div>
      <Text>
        <Code>.r ...1d20...</Code> 或 <Code>...{'{1d20}'}...</Code>
      </Text>

      <Text>
        在消息开头输入 <Code>.r</Code>，才能接各种骰子指令。
      </Text>

      <img css={image} alt="投骰子例子" src={rollExample} />

      <Text>
        也可以不在开头加 <Code>.r</Code> 而是用 <Code>{'{}'}</Code> 或者 <Code>【】</Code>{' '}
        将指令括起来：
      </Text>

      <Text>
        <Code>爆裂魔法！ {'{4d20h2 - 3}'} 【4d20h2 - 3】</Code>
      </Text>
    </div>
  );
}

function Advance() {
  return (
    <div>
      <Text>
        <Code>.r 1d20 = 1d = D20 = d</Code> 可以省略数字，频道可以设置骰子默认的面数。
      </Text>

      <Text>
        按下「
        <Icon icon={D20} /> 插入骰子」按钮将自动插入骰子。频道可以设置默认插入什么指令。
      </Text>

      <Text>
        <Code>.r 取最高三个 4d20h3</Code> 也可以用 k 来代替 h。
      </Text>
      <Text>
        <Code>取最低两个 {'{3d20l2}'}</Code>
      </Text>
      <Text>
        <Code>重复3次1d20+4 {'{3#1d20 + 4}'}</Code>
      </Text>
    </div>
  );
}

function Format() {
  return (
    <div>
      <Text>
        <Code>**粗体内容**</Code> <Code>*斜体内容*</Code> <Code>`代码内容`</Code>
      </Text>
      <Text>
        <Code>[链接文本](链接 URL)</Code> 也可以直接贴链接
      </Text>
      <Text>
        <Code>```块状代码```</Code> 可以用来贴文字地图
      </Text>
    </div>
  );
}

function Coc() {
  return (
    <div>
      <Text>
        <Code>.r coc</Code> 或 <Code>{'{coc}'}</Code>
      </Text>
      <Text>
        <Code>.r 奖励骰：cocb、cocbb</Code>
      </Text>
      <Text>
        <Code>.r 惩罚骰：cocp、cocpp</Code>
      </Text>
      <Text>
        <Code>.r 判断成功等级 coc 42 cocb 42</Code>
      </Text>
    </div>
  );
}

function Fate() {
  return (
    <div>
      <Text>
        <Code>.r fate</Code> 或 <Code>{'{dF}'}</Code>
      </Text>
    </div>
  );
}

function ShadowRun() {
  return (
    <div>
      <Text>
        <Code>.r sr 10</Code> 10 个 D6 无加骰
      </Text>
      <Text>
        <Code>.r srp 10</Code> 10 个 D6 自动加骰
      </Text>
    </div>
  );
}

function Wod() {
  return (
    <div>
      <Text css={fontBold}>nWoD</Text>
      <Text>
        <Code>.r w 12</Code> 12个骰子
      </Text>
      <Text>
        <Code>.r w_8 10</Code> 10个骰子，加骰下限设为8
      </Text>
      <Text css={fontBold}>oWoD</Text>
      <Text>待添加</Text>
    </div>
  );
}

interface SwitchButtonProps {
  page: string;
  self: string;
  children: React.ReactNode;
  setPage: (page: string) => void;
}

const switchButtonContainer = css`
  display: flex;
  justify-content: center;
  filter: drop-shadow(0 0 1px #1d1d1d);
  ${mY(4)};
`;

const switchButton = css`
  min-width: 2rem;
  height: 1.75rem;
  border: none;
  background-color: ${blue['800']};
  color: ${textColor};
  ${textSm};
  &:first-of-type {
    border-radius: 2px 0 0 2px;
  }
  &:last-of-type {
    border-radius: 0 2px 2px 0;
  }

  &:hover {
    background-color: ${blue['700']};
  }

  &[data-active='true'],
  &:active {
    background-color: ${blue['900']};
  }

  &:focus {
    outline: none;
  }
`;

const SwitchButton: React.FC<SwitchButtonProps> = ({ page, self, setPage, children }) => {
  return (
    <button css={switchButton} data-active={page === self} onClick={() => setPage(self)}>
      {children}
    </button>
  );
};

function Help({ dismiss }: Props) {
  const [page, setPage] = useState('basic');
  return (
    <Dialog dismiss={dismiss} confirm={dismiss} confirmText="知道了" title="格式帮助">
      <div css={contentStyle}>
        <HelpText>点击代码即复制，粘贴到输入框看结果。</HelpText>
        <div css={switchButtonContainer}>
          <SwitchButton setPage={setPage} page={page} self="format">
            文本
          </SwitchButton>
          <SwitchButton setPage={setPage} page={page} self="basic">
            基本
          </SwitchButton>
          <SwitchButton setPage={setPage} page={page} self="advance">
            高级
          </SwitchButton>
          <SwitchButton setPage={setPage} page={page} self="coc">
            CoC
          </SwitchButton>
          <SwitchButton setPage={setPage} page={page} self="fate">
            FATE
          </SwitchButton>
          <SwitchButton setPage={setPage} page={page} self="shadowrun">
            Shadowrun
          </SwitchButton>
          <SwitchButton setPage={setPage} page={page} self="wod">
            WoD
          </SwitchButton>
        </div>
        {page === 'format' && <Format />}
        {page === 'basic' && <Basic />}
        {page === 'advance' && <Advance />}
        {page === 'coc' && <Coc />}
        {page === 'fate' && <Fate />}
        {page === 'shadowrun' && <ShadowRun />}
        {page === 'wod' && <Wod />}
      </div>
    </Dialog>
  );
}

export default Help;
