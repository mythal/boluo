import React, { useRef, useState } from 'react';
import Icon from '../atoms/Icon';
import 'sanitize.css';
import 'sanitize.css/typography.css';
import ChevronDown from '@boluo/icons/legacy/ChevronDown';
import Fan from '@boluo/icons/legacy/Fan';
import X from '@boluo/icons/legacy/X';
import Button from '../atoms/Button';
import Input from '../atoms/Input';
import Menu from '../atoms/Menu';
import { MenuItem, MenuItemDisabled } from '../atoms/MenuItem';
import Overlay from '../atoms/Overlay';
import Dialog from '../molecules/Dialog';
import UiMessage from '../molecules/InformationBar';
import Panel from '../molecules/Panel';

const buttonListClassName = 'my-2 flex gap-2';

function Design() {
  const overlayAnchor = useRef<HTMLDivElement | null>(null);
  const menuAnchor = useRef<HTMLButtonElement | null>(null);
  const showMessage = useState(true);
  const [showMenu, setShowMenu] = useState(true);
  const [showModel, setShowModel] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  return (
    <div className="p-4">
      <h1>组件设计页面</h1>
      <div className="size-[10em]">{/*<Loading />*/}</div>
      <div>
        <h2 className="title">按钮</h2>

        <div className={buttonListClassName}>
          <Button>普通</Button>
          <Button>
            <Icon icon={Fan} />
            图标
          </Button>
          <Button variant="dark">
            <Icon icon={Fan} />
            图标
          </Button>
          <Button variant="primary">Primary</Button>
          <Button variant="danger">危险</Button>
          <Button disabled>禁用</Button>
        </div>

        <div className={buttonListClassName}>
          <Button size="small">普通</Button>
          <Button size="small">
            <Icon icon={Fan} />
            图标
          </Button>
          <Button size="small" iconOnly>
            <Icon icon={X} />
          </Button>
          <Button size="small" variant="primary">
            主要
          </Button>
          <Button size="small" variant="danger">
            危险
          </Button>
          <Button size="small" disabled>
            禁用
          </Button>
        </div>
      </div>
      <div>
        <h2>输入框</h2>
        <div className="flex flex-col gap-2">
          <Input placeholder="hello, world" />
          <Input placeholder="hello, world" disabled />
          <Input placeholder="错误的内容" data-variant="error" />
        </div>
      </div>
      <section>
        <h2>警告/信息</h2>
        <div className="flex flex-col gap-2">
          <UiMessage variant="INFO">信息</UiMessage>
          <UiMessage variant="INFO">
            氣交節滿歷一區即。企所相發媽何河重軍聲的統不。無主利設念明電取發自化人上送得業工好上表管多賣，此明光，的突圖亮張會意行基飯在，有性那管形能深老魚自文、紀放仍現只而大個調轉質美委或下放，不也酒實節班、等層體識時於種出營。十許治失家關但我，用明先提經在；朋他山當兒關府兩無、全連家存，地高他關頭。城足學升源微者！下基保素公、寫手學所在是的而
            說同美常我分起之精，開滿使足獨還營世許小爸他境重亞認大市指。曾特不：大的燈放！不上當作去，談自慢力已雖很，母區歡愛言興事起寶第、轉府心身基更化主於費該、全住原……國發費先家在夫集發，預合只食亮她去上希會過視沒界到人獎，水運背。美不素關爸展童專通老或中來車！
          </UiMessage>
          {showMessage[0] && (
            <UiMessage variant="INFO" dismiss={() => showMessage[1](false)}>
              可以关掉的信息
            </UiMessage>
          )}
          <UiMessage variant="WARNING">警告信息</UiMessage>
          <UiMessage variant="ERROR">错误信息</UiMessage>
          <UiMessage variant="SUCCESS">成功信息</UiMessage>
        </div>
      </section>

      <section>
        <div>
          <div className="ml-[20em] size-[10em] bg-[tomato]" ref={overlayAnchor} />
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

      <section className="flex gap-2">
        <Button onClick={() => setShowModel(true)}>打开对话框</Button>
        {showModel && (
          <Dialog
            mask
            dismiss={() => setShowModel(false)}
            confirm={() => setShowModel(false)}
            title="Hello, world"
          >
            hello, world
          </Dialog>
        )}
        {showPanel && (
          <Panel mask dismiss={() => setShowPanel(false)}>
            Hello, world.
          </Panel>
        )}

        <Button
          ref={menuAnchor}
          className="w-32 justify-between"
          onClick={() => setShowMenu((value) => !value)}
        >
          菜单
          <Icon icon={ChevronDown} />
        </Button>

        {showMenu && (
          <Overlay
            x={1}
            y={1}
            selfY={-1}
            selfX={1}
            anchor={menuAnchor}
            onOuter={() => setShowMenu(false)}
          >
            <Menu dismiss={() => setShowMenu(false)}>
              <MenuItem onClick={() => alert('hello')}>Hello</MenuItem>
              <MenuItem onClick={() => alert('hello')}>World</MenuItem>
              <MenuItemDisabled icon={Fan}>Disabled</MenuItemDisabled>
              <MenuItem icon={Fan}>Fan</MenuItem>
            </Menu>
          </Overlay>
        )}
      </section>
    </div>
  );
}

export default Design;
