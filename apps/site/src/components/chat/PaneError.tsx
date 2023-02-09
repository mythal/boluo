import type { ErrorInfo } from 'react';
import React, { Component } from 'react';
import { Oops } from 'ui';
import type { ChildrenProps, StyleProps } from '../../helper/props';
import { PaneBox } from './PaneBox';

interface Props extends ChildrenProps, StyleProps {
}

interface State {
  error: unknown;
}

export class PaneError extends Component<Props, State> {
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
      return (
        <PaneBox>
          <Oops error={this.state.error} type="block" />
        </PaneBox>
      );
    } else {
      return <React.Fragment>{this.props.children}</React.Fragment>;
    }
  }
}
