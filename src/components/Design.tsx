import React from 'react';
import 'normalize-css/normalize.css';
import Icon from './TextIcon';
import { css, Global } from '@emotion/core';
import { bgColor, spacingN, textColor } from '../styles/theme';
import { spin } from '../styles/atoms';
import styled from '@emotion/styled';
import Button from './atoms/Button';
import SpinnerIcon from './atoms/SpinnerIcon';
import fan from '../assets/icons/fan.svg';
import close from '../assets/icons/x-circle.svg';

const baseStyle = css`
  html {
    font-size: 14px;
    background-color: ${bgColor};
    color: ${textColor};
    box-sizing: border-box;
  }

  *,
  *::before,
  *::after {
    box-sizing: inherit;
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
  return (
    <View>
      <BaseStyle />
      <h1>组件设计页面</h1>
      <div className="buttons">
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
            <Button iconOnly>
              <SpinnerIcon />
            </Button>
            <Button type="primary">主要</Button>
            <Button data-btn="danger">危险</Button>
            <Button disabled>禁用</Button>
          </ButtonList>
        </div>
        <div>
          <ButtonList>
            <Button small>普通</Button>
            <Button small>
              <Icon sprite={fan} />
              图标
            </Button>
            <Button small>
              <Icon sprite={close} />
              图标
            </Button>
            <Button small iconOnly>
              <Icon sprite={fan} css={spin} />
            </Button>
            <Button small data-btn="primary">
              主要
            </Button>
            <Button small data-btn="danger">
              危险
            </Button>
            <Button small disabled>
              禁用
            </Button>
          </ButtonList>
        </div>
      </div>
    </View>
  );
}

export default Design;
