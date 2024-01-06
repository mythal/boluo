import type { ErrorInfo } from 'react';
import React, { Component } from 'react';
import { Oops } from 'ui/Oops';
import type { ChildrenProps, StyleProps } from 'utils';

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
          <Oops error={this.state.error} type="block" />
        </div>
      );
    } else {
      return <React.Fragment>{this.props.children}</React.Fragment>;
    }
  }
}
