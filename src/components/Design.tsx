import React, { useRef, useState } from 'react';
import 'modern-normalize/modern-normalize.css';
import Icon from './atoms/Icon';
import { css, Global } from '@emotion/core';
import { bgColor, fontBase, spacingN, textColor } from '../styles/theme';
import styled from '@emotion/styled';
import Button from './atoms/Button';
import fan from '../assets/icons/fan.svg';
import close from '../assets/icons/x-circle.svg';
import chevronDown from '../assets/icons/chevron-down.svg';
import Input from './atoms/Input';
import UiMessage from './molecules/UiMessage';
import Overlay from './atoms/Overlay';
import Menu from './atoms/Menu';
import Dialog from './molecules/Dialog';
import PageLoading from './molecules/PageLoading';

const baseStyle = css`
  html {
    font-size: 14px;
    font-family: ${fontBase};
    background-color: ${bgColor};
    color: ${textColor};
  }
`;

function BaseStyle() {
  return <Global styles={baseStyle} />;
}

const ButtonList = styled.div`
  & > * {
    margin: ${spacingN(1)};
  }
`;

const View = styled.div`
  padding: ${spacingN(4)};
`;

function Design() {
  const overlayAnchor = useRef<HTMLDivElement | null>(null);
  const menuAnchor = useRef<HTMLButtonElement | null>(null);
  const showMessage = useState(true);
  const [showMenu, setShowMenu] = useState(true);
  const [showModel, setShowModel] = useState(false);
  return (
    <View>
      <BaseStyle />
      <h1>组件设计页面</h1>
      <div
        css={css`
          width: 10em;
          height: 10em;
        `}
      >
        <PageLoading />
      </div>
      <div>
        <h2 className="title">按钮</h2>
        <div>
          <ButtonList>
            <Button>普通</Button>
            <Button>
              <Icon sprite={fan} />
              图标
            </Button>
            <Button>
              <Icon sprite={fan} />
              图标
            </Button>
            <Button data-variant="primary">Primary</Button>
            <Button data-variant="danger">危险</Button>
            <Button disabled>禁用</Button>
          </ButtonList>
        </div>
        <div>
          <ButtonList>
            <Button data-small>普通</Button>
            <Button data-small>
              <Icon sprite={fan} />
              图标
            </Button>
            <Button data-small data-icon>
              <Icon sprite={close} spin />
            </Button>
            <Button data-small data-variant="primary">
              主要
            </Button>
            <Button data-small data-variant="danger">
              危险
            </Button>
            <Button data-small disabled>
              禁用
            </Button>
          </ButtonList>
        </div>
      </div>
      <div>
        <h2>输入框</h2>
        <div>
          <Input placeholder="hello, world" />
          <Input placeholder="hello, world" disabled />
          <Input placeholder="错误的内容" data-variant="error" />
        </div>
      </div>
      <section>
        <h2>警告/信息</h2>
        <UiMessage variant="info">信息</UiMessage>
        <UiMessage variant="info">
          氣交節滿歷一區即。企所相發媽何河重軍聲的統不。無主利設念明電取發自化人上送得業工好上表管多賣，此明光，的突圖亮張會意行基飯在，有性那管形能深老魚自文、紀放仍現只而大個調轉質美委或下放，不也酒實節班、等層體識時於種出營。十許治失家關但我，用明先提經在；朋他山當兒關府兩無、全連家存，地高他關頭。城足學升源微者！下基保素公、寫手學所在是的而
          說同美常我分起之精，開滿使足獨還營世許小爸他境重亞認大市指。曾特不：大的燈放！不上當作去，談自慢力已雖很，母區歡愛言興事起寶第、轉府心身基更化主於費該、全住原……國發費先家在夫集發，預合只食亮她去上希會過視沒界到人獎，水運背。美不素關爸展童專通老或中來車！
        </UiMessage>
        {showMessage[0] && (
          <UiMessage variant="info" dismiss={() => showMessage[1](false)}>
            可以关掉的信息
          </UiMessage>
        )}
        <UiMessage variant="warning">警告信息</UiMessage>
        <UiMessage variant="error">错误信息</UiMessage>
      </section>

      <section>
        <h2>固定元素</h2>
        <div>
          <div
            css={css`
              width: 10em;
              height: 10em;
              background-color: tomato;
              margin-left: 20em;
            `}
            ref={overlayAnchor}
          />
          <Overlay anchor={overlayAnchor} x={-1} y={-1}>
            LT
          </Overlay>
          <Overlay anchor={overlayAnchor} x={-1} y={0}>
            Left
          </Overlay>
          <Overlay anchor={overlayAnchor} x={-1} y={1}>
            LB
          </Overlay>
          <Overlay anchor={overlayAnchor} x={0} y={-1}>
            Top
          </Overlay>
          <Overlay anchor={overlayAnchor} x={0} y={0}>
            Center
          </Overlay>
          <Overlay anchor={overlayAnchor} x={0} y={1}>
            Bottom
          </Overlay>
          <Overlay anchor={overlayAnchor} x={1} y={-1}>
            RT
          </Overlay>
          <Overlay anchor={overlayAnchor} x={1} y={0}>
            Right
          </Overlay>
          <Overlay anchor={overlayAnchor} x={1} y={1}>
            RB
          </Overlay>
        </div>
      </section>

      <section>
        <h2>菜单</h2>
        <div>
          <Button
            ref={menuAnchor}
            css={css`
              width: ${spacingN(32)};
              justify-content: space-between;
            `}
            onClick={() => setShowMenu((value) => !value)}
          >
            菜单
            <Icon sprite={chevronDown} />
          </Button>
          {showMenu && (
            <Overlay x={1} y={1} selfY={-1} selfX={1} anchor={menuAnchor} onOuter={() => setShowMenu(false)}>
              <Menu
                dismiss={() => setShowMenu(false)}
                items={[
                  { text: 'hello', callback: () => alert('hello'), disabled: true },
                  { text: 'hello', callback: () => alert('hello'), disabled: false },
                  { text: 'world', icon: fan },
                ]}
              />
            </Overlay>
          )}
        </div>
      </section>
      <section>
        <Button onClick={() => setShowModel(true)}>打开对话框</Button>
        {showModel && (
          <Dialog mask dismiss={() => setShowModel(false)} confirm={() => setShowModel(false)} title="Hello, world">
            hello, world
          </Dialog>
        )}
      </section>
    </View>
  );
}

export default Design;
