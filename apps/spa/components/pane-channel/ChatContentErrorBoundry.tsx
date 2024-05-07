import React, { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Failed } from '../common/Failed';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: unknown;
}

export class ChatContentErrorBoundry extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: unknown) {
    return { error: error };
  }
  override render() {
    if (this.state.error != null) {
      return <ShowError error={this.state.error} />;
    }
    return this.props.children;
  }
}

export const ShowError: FC<{ error: unknown }> = ({ error }) => {
  return (
    <div>
      <Failed
        title={<FormattedMessage defaultMessage="Oops" />}
        error={error}
        message={<FormattedMessage defaultMessage="Unexpected error when displaying chat content" />}
      />
    </div>
  );
};
