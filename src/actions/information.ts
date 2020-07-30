import React from 'react';
import { Id, newId } from '@/utils/id';

export type InformationLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface Information {
  type: 'INFORMATION';
  id: Id;
  level: InformationLevel;
  content: React.ReactChild;
}

export const showInformation = (content: React.ReactChild, level: InformationLevel): Information => {
  return { type: 'INFORMATION', level, id: newId(), content };
};

export const showInfo = (content: React.ReactChild): Information => {
  return showInformation(content, 'INFO');
};

export const showSuccess = (content: React.ReactChild): Information => {
  return showInformation(content, 'SUCCESS');
};

export const showError = (content: React.ReactChild): Information => {
  return showInformation(content, 'ERROR');
};

export interface DismissInformation {
  type: 'DISMISS_INFORMATION';
  id: Id;
}

export const dismissInformation = (id: Id): DismissInformation => ({ type: 'DISMISS_INFORMATION', id });
