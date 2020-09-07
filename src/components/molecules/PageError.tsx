import * as React from 'react';
import styled from '@emotion/styled';
import Title from '../../components/atoms/Title';
import Text from '../../components/atoms/Text';
import Button from '../../components/atoms/Button';
import { mask, mX, mY } from '../../styles/atoms';
import Icon from '../../components/atoms/Icon';
import rotateIcon from '../../assets/icons/rotate-cw.svg';
import mushroomCloud from '../../assets/icons/mushroom-cloud.svg';
import { Code } from '../atoms/Code';

interface Props {}

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
    console.error(error);
    return { error };
  }
  onClick() {
    document.location.reload();
  }
  render() {
    if (this.state.error !== undefined) {
      document.title = '菠萝出错啦';
      return (
        <Mask>
          <Container>
            <Title>
              <Icon sprite={mushroomCloud} /> 哎哟！
            </Title>
            <Text css={mY(1)}>
              发生未知错误。这通常是网络原因导致页面载入出错。请
              <Button css={[mX(1)]} data-small onClick={this.onClick}>
                <Icon sprite={rotateIcon} />
                刷新
              </Button>
              重试，如果依然错误请联系网站管理员。
            </Text>
            <Text css={mY(4)}>
              详情：<Code>{String(this.state.error)}</Code>
            </Text>
          </Container>
        </Mask>
      );
    }
    return this.props.children;
  }
}
export default PageError;
