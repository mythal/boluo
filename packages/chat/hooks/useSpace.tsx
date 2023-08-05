import { Space } from 'api';
import React from 'react';

/** The current space. */
export const SpaceContext = React.createContext<Space | null>(null);

export const useSpace = () => React.useContext(SpaceContext);
