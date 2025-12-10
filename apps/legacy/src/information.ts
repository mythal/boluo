import { type ReactNode } from 'react';
import { type Id } from './utils/id';

export type InformationLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface Information {
  id: Id;
  level: InformationLevel;
  content: ReactNode;
}
