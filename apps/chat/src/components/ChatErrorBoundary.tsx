import { isApiError } from 'api';
import type { ErrorInfo } from 'react';
import React, { Component } from 'react';
import { Oops } from 'ui/Oops';
import type { ChildrenProps, StyleProps } from 'utils';
import { ChatSkeleton } from './ChatSkeleton';

interface Props extends ChildrenProps, StyleProps {
}

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
    if (isApiError(error) && error.code === 'NOT_FOUND') {
      return <ChatSkeleton>Chat Not Found</ChatSkeleton>;
    } else if (error) {
      return <ChatSkeleton>Unexpected Error</ChatSkeleton>;
    } else {
      return <React.Fragment>{this.props.children}</React.Fragment>;
    }
  }
}
