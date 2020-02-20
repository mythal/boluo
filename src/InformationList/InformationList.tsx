import React from 'react';
import { List } from 'immutable';
import { Information } from '../App/states';
import { InformationItem } from './InformationItem';

interface Props {
  informationList: List<Information>;
}

export const InformationList: React.FC<Props> = ({ informationList }) => {
  return (
    <div>
      {informationList.map((info, key) => (
        <InformationItem key={key} information={info} />
      ))}
    </div>
  );
};
