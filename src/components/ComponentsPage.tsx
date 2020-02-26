import React, { useRef, useState } from 'react';
import { upload } from '../api/media';
import { CaretDownIcon, SendIcon, UploadIcon } from './icons';
import '../styles/main.css';
import { Loading } from './Loading';
import { Tooltip } from './Tooltip';
import { Input } from './Input';
import { AlertItem } from './AlertItem';
import { Dialog } from './Dialog';
import { ColorPicker } from './ColorPicker';
import { useOutside } from '../hooks';
import { cls } from '../classname';

interface Props {}

export const ComponentsPage: React.FC<Props> = () => {
  const uploadFieldRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLSpanElement | null>(null);
  const menu2Ref = useRef<HTMLUListElement | null>(null);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [menu2, setMenu2] = useState(false);
  const [text, setText] = useState('');
  const [color, setColor] = useState('#000000');
  const [callout, setCallout] = useState(false);
  useOutside(menuRef, () => setMenu(false));
  useOutside(menu2Ref, () => setMenu2(false));
  const handleUpload: React.FormEventHandler = e => {
    e.preventDefault();
    if (uploadFieldRef.current) {
      const { files } = uploadFieldRef.current;
      if (files && files.length > 0) {
        const file = files[0];
        console.log(file);
        upload(file, file.name, file.type).then(console.log);
      }
    }
  };

  const handleMenu: React.MouseEventHandler = e => {
    setMenu(!menu);
  };
  const handleMenu2: React.MouseEventHandler = e => {
    setMenu2(!menu2);
  };
  return (
    <div>
      <form onSubmit={handleUpload}>
        <p>
          <input type="file" className="btn m-1" hidden ref={uploadFieldRef} />
        </p>
        <p>
          <button type="submit" className="btn m-1" onClick={() => uploadFieldRef.current?.click()}>
            <UploadIcon />
          </button>
        </p>
      </form>
      <p>
        <input className="input m-1" type="text" />
      </p>
      <p>
        <button className="btn m-1" type="button">
          按钮
        </button>
        <button className="btn btn-primary m-1" type="button">
          Primary
        </button>
        <Tooltip className="inline-block w-32" message={<span>一些帮助信息，我很长我很长</span>}>
          <button className="btn m-1" type="button">
            Tooltip
          </button>
        </Tooltip>
        <button className="btn m-1 rounded" type="button">
          我有点圆
        </button>
      </p>
      <p>
        <Tooltip className="inline-block w-16" message={<span>一些帮助信息</span>}>
          <button className="btn m-1" type="button">
            Tooltip
          </button>
        </Tooltip>
      </p>
      <div className="m-1">
        <label>
          <input className="checkbox mr-1" type="checkbox" />
          点击我
        </label>
      </div>
      <div className="m-1">
        <label>
          <input
            className="checkbox mr-1"
            type="checkbox"
            checked={open}
            onChange={e => setOpen(e.currentTarget?.checked)}
          />
          点我打开对话框
        </label>
        {open ? (
          <Dialog dismiss={() => setOpen(false)}>
            <div className="m-2">
              <p className="my-2">我是对话框</p>
              <button className="btn text-sm mr-1" onClick={() => setOpen(false)}>
                取消
              </button>
              <button className="btn btn-primary text-sm" onClick={() => setOpen(false)}>
                确定
              </button>
            </div>
          </Dialog>
        ) : null}
      </div>
      <div className="m-1">
        <label>
          <input className="checkbox mr-1" type="checkbox" />
          也点点我
        </label>
      </div>
      <p>
        <button className="btn m-1" disabled type="button">
          不可用按钮
        </button>
        <button className="btn m-1 rounded-full btn-primary">
          <SendIcon />
        </button>
        <button className={cls('btn', 'btn-down')}>按下状态的按钮</button>
      </p>
      <p>
        <Loading />
      </p>
      <div className="m-1">
        <Input value={text} onChange={setText} disabled placeholder="禁用了" />
      </div>
      <div className="m-1">
        <Input value={text} onChange={setText} placeholder="写点什么吧" error="错误信息是我" />
      </div>
      <div className="m-1">
        <Input value={text} onChange={setText} placeholder="写点什么吧" label="我是标签" />
      </div>
      <div className="m-1">
        <Input value={text} onChange={setText} placeholder="写点什么吧" />
        <button className="btn my-1 btn-primary border-l-0 rounded-r">
          <SendIcon />
        </button>
      </div>
      <div className="m-1">
        <ColorPicker value={color} onChange={setColor} />
        <div style={{ color }}>hello, world</div>
      </div>
      <div className="m-1">
        <span className="inline-block relative" ref={menuRef}>
          <button className={cls('btn', { 'btn-down': menu })} onClick={handleMenu}>
            菜单
            <CaretDownIcon className="ml-1" />
          </button>

          <ul className="menu absolute z-10" hidden={!menu}>
            <li className="menu-item text-sm">菜单项 1</li>
            <li className="menu-item text-sm">不甘寂寞的菜单项</li>
            <li className="menu-item text-sm">Watashimo +1</li>
          </ul>
        </span>
      </div>
      <div className="m-1">
        <span className="inline-block relative">
          <button className={cls('btn', { 'btn-down': menu2 })} onClick={handleMenu2}>
            菜单 2
            <CaretDownIcon className="ml-1" />
          </button>

          <ul className="menu absolute z-10" ref={menu2Ref} hidden={!menu2}>
            <li className="menu-item text-sm">菜单项 1</li>
            <li className="menu-item text-sm">不甘寂寞的菜单项</li>
            <li className="menu-item text-sm">Watashimo +1</li>
          </ul>
        </span>
      </div>
      <div className="m-1">
        <div className="inline-block relative">
          <div className="callout w-48" hidden={!callout}>
            我是一些奇怪的信息
          </div>
        </div>
      </div>

      <AlertItem level="INFO" message="这是一条普普通通的通知消息" />
      <AlertItem level="ERROR" message="这是一条有点异常的错误消息" />
      <AlertItem level="SUCCESS" message="这是一条激动人心的成功消息" />
    </div>
  );
};
