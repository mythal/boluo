'use client';

import {
  Component,
  isValidElement,
  type ErrorInfo,
  type ReactElement,
  type ReactNode,
} from 'react';
import { v7 as uuidv7 } from 'uuid';
import { captureException } from '../error';

export interface ErrorBoundaryData {
  componentStack: string;
  error: unknown;
  eventId: string;
  resetError(): void;
}

export type FallbackRender = (data: ErrorBoundaryData) => ReactElement;

interface Props {
  children?: ReactNode;
  fallback?: ReactElement | FallbackRender;
}

interface State {
  componentStack: string;
  error: unknown;
  eventId: string;
}

const initialState: State = {
  componentStack: '',
  error: null,
  eventId: '',
};

export class ErrorBoundary extends Component<Props, State> {
  override state = initialState;

  static getDerivedStateFromError(error: unknown): State {
    return {
      componentStack: '',
      error,
      eventId: uuidv7(),
    };
  }

  override componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    const componentStack = errorInfo.componentStack ?? '';
    this.setState({ componentStack });
    captureException(error, {
      componentStack,
      eventId: this.state.eventId,
    });
  }

  private readonly resetError = () => {
    this.setState(initialState);
  };

  override render(): ReactNode {
    if (!this.state.eventId) {
      return this.props.children;
    }
    if (typeof this.props.fallback === 'function') {
      return this.props.fallback({ ...this.state, resetError: this.resetError });
    }
    return isValidElement(this.props.fallback) ? this.props.fallback : null;
  }
}
