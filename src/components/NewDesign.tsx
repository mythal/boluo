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
          <button className="btn-sized btn-normal">普通</button>
          <button className="btn-sized btn-normal">
            <Icon name="compass" /> 图标
          </button>
          <button className="btn-sized btn-normal">
            <Icon name="chalkboard" /> 图标
          </button>
          <button className="btn-auto btn-normal">
            <Icon name="chalkboard" />
          </button>
          <button className="btn-sized btn-primary">主要</button>
          <button className="btn-sized btn-danger">危险</button>
          <button className="btn-sized btn-normal" disabled>
            禁用
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewDesign;
