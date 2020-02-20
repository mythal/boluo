import React from 'react';
import { Information } from '../App/states';

interface Props {
  information: Information;
}

export const InformationItem: React.FC<Props> = ({ information }) => {
  return <div>{information.message}</div>;
};
