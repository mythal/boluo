import * as React from 'react';
import MushroomCloud from '@boluo/icons/legacy/MushroomCloud';
import RotateCw from '@boluo/icons/legacy/RotateCw';
import Button from '../../components/atoms/Button';
import Icon from '../../components/atoms/Icon';
import Text from '../../components/atoms/Text';
import Title from '../../components/atoms/Title';
import { Code } from '../atoms/Code';
import { captureException } from '../../error-reporting';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: unknown;
}

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
        <div className="bg-legacy-modal-mask fixed inset-0 z-[1000] flex items-center justify-center p-[2em]">
          <div className="mx-auto max-w-[30rem]">
            <Title>
              <Icon icon={MushroomCloud} /> 哎哟！
            </Title>
            <Text className="my-1">
              发生未知错误。这通常是网络原因导致页面载入出错。请
              <Button className="legacy-page-error-refresh" size="small" onClick={this.onClick}>
                <Icon icon={RotateCw} />
                刷新
              </Button>
              重试，如果依然错误请联系网站管理员。
            </Text>
            <Text className="my-4">
              详情：<Code>页面遇到了无法恢复的错误</Code>
            </Text>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
export default PageError;
