import { ReactNode } from 'react';
import { Id } from '@/utils/id';

export type InformationLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface Information {
  id: Id;
  level: InformationLevel;
  content: ReactNode;
}
