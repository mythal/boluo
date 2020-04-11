import React, { useRef, useState } from 'react';
import PageLoading from './PageLoading';
import '../styles/main.css';
import Icon from './Icon';
import SpinnerIcon from './SpinnerIcon';
import Overlay from './Overlay';
import Tooltip from './Tooltip';
import Menu from './Menu';
import Modal from './Modal';

export const Design = () => {
  const overlayAnchor = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  return (
    <div className="p-2">
      <p className="text-blue-500">
        Hello, world <Icon name="file-upload" />
      </p>
      <div>
        <h2 className="text-lg">载入</h2>
        <p>
          Loading <SpinnerIcon />
        </p>
        <PageLoading />
      </div>
      <div>
        <h2 className="text-lg">按钮</h2>
        <div className="flex justify-around items-end my-1">
          <button className="btn btn-normal">普通</button>
          <button className="btn btn-normal btn-down">按下</button>
          <button className="btn btn-normal" disabled>
            禁用
          </button>
          <button className="btn btn-normal btn-icon">
            <Icon name="file-upload" />
          </button>
          <button className="btn btn-normal">
            <Icon name="compass" /> 指南针
          </button>
          <button className="btn btn-normal btn-icon circles">
            <Icon name="comments" />
          </button>
          <button className="btn btn-normal btn-icon circles">
            <SpinnerIcon />
          </button>
        </div>

        <div className="flex justify-around items-end my-1">
          <button className="btn btn-primary">普通</button>
          <button className="btn btn-primary btn-down">按下</button>
          <button className="btn btn-primary" disabled>
            禁用
          </button>
          <button className="btn btn-primary btn-icon">
            <Icon name="file-upload" />
          </button>
          <button className="btn btn-primary">
            <Icon name="compass" /> 指南针
          </button>
          <button className="btn btn-primary btn-icon circles">
            <Icon name="comments" />
          </button>
          <button className="btn btn-primary btn-icon circles">
            <SpinnerIcon />
          </button>
        </div>
        <div className="flex justify-around items-end my-1">
          <button className="btn btn-danger">普通</button>
          <button className="btn btn-danger btn-down">按下</button>
          <button className="btn btn-danger" disabled>
            禁用
          </button>
          <button className="btn btn-danger btn-icon">
            <Icon name="file-upload" />
          </button>
          <button className="btn btn-danger">
            <Icon name="compass" /> 指南针
          </button>
          <button className="btn btn-danger btn-icon circles">
            <Icon name="comments" />
          </button>
          <button className="btn btn-danger btn-icon circles">
            <SpinnerIcon />
          </button>
        </div>
        <div className="flex justify-around items-end my-1">
          <button className="btn-3d">普通</button>
          <button className="btn-3d btn-3d-down">按下</button>
          <button className="btn-3d" disabled>
            禁用
          </button>
          <button className="btn-3d btn-icon">
            <Icon name="file-upload" />
          </button>
          <button className="btn-3d">
            <Icon name="compass" /> 指南针
          </button>
          <button className="btn-3d btn-icon circles">
            <Icon name="comments" />
          </button>
          <button className="btn-3d btn-icon circles">
            <SpinnerIcon />
          </button>
        </div>
      </div>
      <div>
        <h2 className="text-lg">输入框</h2>
        <div className="py-1">
          <input className="input" type="text" />
        </div>
        <div className="py-1">
          <input className="input input-underline" type="text" />
        </div>
        <div className="py-1">
          <input className="input" type="text" placeholder="占位符…" />
        </div>
        <div className="py-1">
          <input className="input" value="我被禁用了" type="text" disabled />
        </div>
        <div className="py-1">
          <textarea className="input" />
        </div>
      </div>
      <div>
        <h2 className="text-lg">固定元素</h2>
        <div>
          <div ref={overlayAnchor} className="w-64 h-64 m-32 bg-green-300" />
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
        <div className="p-32">
          <Tooltip x={0} y={-1} className=" transform -translate-y-full -translate-x-1/2" message={<p>hello, world</p>}>
            <div className="w-40 h-32 p-2 bg-green-400 border">
              <button className="btn" ref={menuRef} onClick={() => setMenuOpen((isOpen) => !isOpen)}>
                打开菜单 <Icon name="caret-down" />
              </button>
              <Menu open={menuOpen} dismiss={() => setMenuOpen(false)} trigger={menuRef}>
                <li className="menu-item">You can insert any type of content within the dropdown menu.</li>
                <li className="menu-item">菜单项</li>
                <li className="menu-item">菜单项</li>
              </Menu>

              <button className="btn my-2" onClick={() => setModalOpen(true)}>
                Modal
              </button>
            </div>
          </Tooltip>
          <Modal open={modalOpen} dismiss={() => setModalOpen(false)}>
            <div className="p-1 m-4 w-64">
              <h1 className="text-xl mb-2">hello, world</h1>
              <p>
                <label>
                  <input type="checkbox" className="checkbox" /> 你好，世界
                </label>
              </p>
              <p>
                <select className="select" value="b">
                  <option value="a">A</option>
                  <option value="b">B</option>
                </select>
              </p>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
};
