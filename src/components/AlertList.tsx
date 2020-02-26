import React from 'react';
import { AlertItem } from './AlertItem';
import { useAlertList } from './App';

export const AlertList: React.FC = () => {
  const alertList = useAlertList();
  const list = alertList.map((alert, key) => <AlertItem key={key} level={alert.level} message={alert.message} />);
  return <div className="fixed top-0">{list}</div>;
};
