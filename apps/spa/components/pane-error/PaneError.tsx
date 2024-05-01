import { isApiError } from '@boluo/api';
import type { ErrorInfo } from 'react';
import React, { Component } from 'react';
import type { ChildrenProps, StyleProps } from '@boluo/utils';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { PaneErrorNotFound } from './PaneErrorNotFound';
import { FormattedMessage } from 'react-intl';
import { Failed, FailedUnexpected } from '../common/Failed';

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
        <PaneBox
          header={
            <PaneHeaderBox>
              <FormattedMessage defaultMessage="Oops!" />
            </PaneHeaderBox>
          }
        >
          <div className="h-full">
            <FailedUnexpected error={error} />
          </div>
        </PaneBox>
      );
    } else {
      return <React.Fragment>{this.props.children}</React.Fragment>;
    }
  }
}