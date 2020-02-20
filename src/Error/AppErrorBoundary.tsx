import React from 'react';

interface Props {}

interface State {
  errorMessage: string | null;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { errorMessage: error.message };
  }

  render() {
    if (this.state.errorMessage) {
      return <div>{this.state.errorMessage}</div>;
    }
    return this.props.children;
  }
}
