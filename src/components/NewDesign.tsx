import React from 'react';
import '../styles/style.sass';
import Icon from './Icon';

function NewDesign() {
  return (
    <div className="NewDesign">
      <h1>组件设计页面</h1>
      <div className="buttons">
        <h2 className="title">按钮</h2>
        <div>
          <button className="btn-large btn-normal">普通</button>
          <button className="btn-large btn-normal">
            <Icon name="compass" />
            图标
          </button>
          <button className="btn-large btn-normal">
            <Icon name="chalkboard" className="spin" />
            图标
          </button>
          <button className="btn-large btn-icon-only btn-normal">
            <Icon name="chalkboard" />
          </button>
          <button className="btn-large btn-primary">主要</button>
          <button className="btn-large btn-danger min-w-auto">危险</button>
          <button className="btn-large btn-normal" disabled>
            禁用
          </button>
        </div>
        <div>
          <button className="btn-small btn-normal">普通</button>
          <button className="btn-small btn-normal">
            <Icon name="compass" />
            图标
          </button>
          <button className="btn-small btn-normal">
            <Icon name="chalkboard" />
            图标
          </button>
          <button className="btn-small btn-icon-only btn-normal">
            <Icon name="chalkboard" />
          </button>
          <button className="btn-small btn-primary">主要</button>
          <button className="btn-small btn-danger">危险</button>
          <button className="btn-small btn-normal" disabled>
            禁用
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewDesign;
