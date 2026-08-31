import * as React from 'react';
import { useState } from 'react';
import D20 from '@boluo/icons/legacy/D20';
import rollExample from '../../assets/roll-example.png';
import { Code } from '../atoms/Code';
import { HelpText } from '../atoms/HelpText';
import Icon from '../atoms/Icon';
import Text from '../atoms/Text';
import Dialog from '../molecules/Dialog';

interface Props {
  dismiss: () => void;
}

function Basic() {
  return (
    <div>
      <Text>
        <Code>.r ...1d20...</Code> 或 <Code>...{'{1d20}'}...</Code>
      </Text>

      <Text>
        在消息开头输入 <Code>.r</Code>，才能接各种骰子指令。
      </Text>

      <img
        className="border-legacy-black my-2 block w-full rounded-[3px] border-[0.5rem] border-solid"
        alt="投骰子例子"
        src={rollExample}
      />

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
      <Text className="font-bold">nWoD</Text>
      <Text>
        <Code>.r w 12</Code> 12个骰子
      </Text>
      <Text>
        <Code>.r w_8 10</Code> 10个骰子，加骰下限设为8
      </Text>
      <Text className="font-bold">oWoD</Text>
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

const SwitchButton: React.FC<SwitchButtonProps> = ({ page, self, setPage, children }) => {
  return (
    <button
      className="bg-legacy-blue-800 text-legacy-text hover:bg-legacy-blue-700 active:bg-legacy-blue-900 data-[active=true]:bg-legacy-blue-900 h-7 min-w-8 border-0 text-[0.875rem] first:rounded-l-[2px] last:rounded-r-[2px] focus:outline-none"
      data-active={page === self}
      onClick={() => setPage(self)}
      type="button"
    >
      {children}
    </button>
  );
};

function Help({ dismiss }: Props) {
  const [page, setPage] = useState('basic');
  return (
    <Dialog dismiss={dismiss} confirm={dismiss} confirmText="知道了" title="格式帮助">
      <div className="min-h-80 w-[30rem]">
        <HelpText>点击代码即复制，粘贴到输入框看结果。</HelpText>
        <div className="my-4 flex justify-center drop-shadow-[0_0_1px_#1d1d1d]">
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
