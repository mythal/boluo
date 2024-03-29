import { isApiError } from '@boluo/api';
import type { ErrorInfo } from 'react';
import React, { Component } from 'react';
import { Oops } from '@boluo/ui/Oops';
import type { ChildrenProps, StyleProps } from '@boluo/utils';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { PaneErrorNotFound } from './PaneErrorNotFound';

interface Props extends ChildrenProps, StyleProps {}

interface State {
  error: unknown;
}

export class PaneError extends Component<Props, State> {
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
    const { error } = this.state;
    if (isApiError(error) && error.code === 'NOT_FOUND') {
      return <PaneErrorNotFound error={error} />;
    } else if (error) {
      return (
        <PaneBox header={<PaneHeaderBox>Oops</PaneHeaderBox>}>
          <div className="h-full">
            <Oops error={this.state.error} type="block" />
          </div>
        </PaneBox>
      );
    } else {
      return <React.Fragment>{this.props.children}</React.Fragment>;
    }
  }
}
