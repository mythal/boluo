import * as React from 'react';
import ExternalLinkIcon from '@boluo/icons/legacy/ExternalLink';
import Icon from '../../components/atoms/Icon';
import { p } from '../../styles/atoms';

interface Props {
  to: string;
  children: React.ReactNode;
  className?: string;
}

function ExternalLink({ to, children, className }: Props) {
  return (
    <a href={to} rel="noopener noreferrer" className={className} target="_blank">
      {children}
      <Icon css={p(0.5)} icon={ExternalLinkIcon} />
    </a>
  );
}

export default ExternalLink;
