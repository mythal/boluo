import styled from '@emotion/styled';
import * as React from 'react';
import MushroomCloud from '@boluo/icons/legacy/MushroomCloud';
import RotateCw from '@boluo/icons/legacy/RotateCw';
import Button from '../../components/atoms/Button';
import Icon from '../../components/atoms/Icon';
import Text from '../../components/atoms/Text';
import Title from '../../components/atoms/Title';
import { mask, mX, mY } from '../../styles/atoms';
import { Code } from '../atoms/Code';
import { captureException } from '../../error-reporting';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: unknown;
}

const Mask = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  padding: 2em;
  ${mask};
  z-index: 1000;
`;

const Container = styled.div`
  max-width: 30rem;
  margin: 0 auto;
`;

class PageError extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: undefined };
  }
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    captureException(error, {
      source: 'react-error-boundary',
      componentStack: info.componentStack ?? undefined,
    });
  }
  onClick = () => {
    document.location.reload();
  };
  render() {
    if (this.state.error !== undefined) {
      document.title = '菠萝出错啦';
      return (
        <Mask>
          <Container>
            <Title>
              <Icon icon={MushroomCloud} /> 哎哟！
            </Title>
            <Text css={mY(1)}>
              发生未知错误。这通常是网络原因导致页面载入出错。请
              <Button css={[mX(1)]} data-small onClick={this.onClick}>
                <Icon icon={RotateCw} />
                刷新
              </Button>
              重试，如果依然错误请联系网站管理员。
            </Text>
            <Text css={mY(4)}>
              详情：<Code>页面遇到了无法恢复的错误</Code>
            </Text>
          </Container>
        </Mask>
      );
    }
    return this.props.children;
  }
}
export default PageError;
