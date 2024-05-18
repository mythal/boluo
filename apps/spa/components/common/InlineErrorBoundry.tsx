import React from 'react';

interface Props {
  className?: string;
  message?: React.ReactNode;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class InlineErrorBoundry extends React.Component<Props, State> {
  override state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return <span className={this.props.className}>{this.props.message || 'Something went wrong'}</span>;
    }

    return this.props.children;
  }
}
