import { type Space } from '@boluo/api';
import React from 'react';

/** The current space. */
export const SpaceContext = React.createContext<Space | undefined>(undefined);

export const useSpace = () => React.useContext(SpaceContext);
