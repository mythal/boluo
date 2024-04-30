import { isApiError } from '@boluo/api';
import { useErrorExplain } from '@boluo/common';
import type { ErrorInfo, FC } from 'react';
import React, { Component } from 'react';
import type { ChildrenProps, StyleProps } from '@boluo/utils';
import { ChatSkeleton } from './ChatSkeleton';

const Explain: FC<{ error: unknown }> = ({ error }) => {
  const explain = useErrorExplain();
  return <>{explain(error)}</>;
};

interface Props extends ChildrenProps, StyleProps {}

interface State {
  error: unknown;
}

export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: undefined };
  }
  override componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    if (error instanceof Error) {
      console.error(error);
    }
    console.debug(errorInfo);
  }

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  override render() {
    const error = this.state.error;
    if (error) {
      return <ChatSkeleton placeholder={<Explain error={error} />} />;
    } else {
      return <React.Fragment>{this.props.children}</React.Fragment>;
    }
  }
}
