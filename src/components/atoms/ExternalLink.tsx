import * as React from 'react';
import Icon from '../../components/atoms/Icon';
import icon from '../../assets/icons/external-link.svg';

interface Props {
  to: string;
  children: React.ReactNode;
  className?: string;
}

function ExternalLink({ to, children, className }: Props) {
  return (
    <a href={to} rel="noopener noreferrer" className={className} target="_blank">
      {children}
      <Icon sprite={icon} />
    </a>
  );
}

export default ExternalLink;
