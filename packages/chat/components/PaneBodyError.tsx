import type { ErrorInfo } from 'react';
import React, { Component } from 'react';
import type { ChildrenProps, StyleProps } from '@boluo/utils';
import { Failed, FailedUnexpected } from './common/Failed';
import { FormattedMessage } from 'react-intl';

interface Props extends ChildrenProps, StyleProps {}

interface State {
  error: unknown;
}

export class PaneBodyError extends Component<Props, State> {
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
    if (this.state.error) {
      return (
        <div className="h-full">
          <FailedUnexpected error={this.state.error} />
        </div>
      );
    } else {
      return <React.Fragment>{this.props.children}</React.Fragment>;
    }
  }
}
