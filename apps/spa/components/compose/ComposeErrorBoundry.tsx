import React, { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useAtomValue } from 'jotai';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: unknown;
}

export class ComposeErrorBoundry extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: unknown) {
    return { error: error };
  }
  override render() {
    if (this.state.error != null) {
      return <ShowError />;
    }
    return this.props.children;
  }
}

export const ShowError: FC = () => {
  const { composeAtom } = useChannelAtoms();
  const { source } = useAtomValue(composeAtom);
  return (
    <div className="px-4 py-2">
      <span>
        <FormattedMessage defaultMessage="The input box crashed." />
      </span>
      {source && (
        <div>
          <span> </span>
          <FormattedMessage defaultMessage="Your last input was:" />
          <pre className="py-2">{source}</pre>
        </div>
      )}
    </div>
  );
};
