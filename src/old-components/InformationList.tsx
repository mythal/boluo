import React from 'react';
import { InformationItem } from './InformationItem';
import { useInformationSet } from './Provider';

export const InformationList: React.FC = () => {
  const informationSet = useInformationSet();
  const list = informationSet
    .valueSeq()
    .map((information) => (
      <InformationItem key={information.id} level={information.level} content={information.content} />
    ));
  return <div className="fixed top-0 z-50">{list}</div>;
};
