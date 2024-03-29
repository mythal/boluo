import type { ErrorInfo } from 'react';
import React, { Component } from 'react';
import type { ChildrenProps, StyleProps } from '@boluo/utils';
import type { OopsType } from './Oops';
import { Oops } from './Oops';

interface Props extends ChildrenProps, StyleProps {
  type?: OopsType;
}

interface State {
  error: unknown;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: undefined };
  }
  override componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error(errorInfo);
  }

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  override render() {
    if (this.state.error) {
      return <Oops error={this.state.error} type={this.props.type} />;
    } else {
      return <React.Fragment>{this.props.children}</React.Fragment>;
    }
  }
}
