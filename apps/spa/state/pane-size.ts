import { atom } from 'jotai';
import React from 'react';

const sizeLevelAtom = atom<number>(0);

export const SizeLevelContext = React.createContext<typeof sizeLevelAtom>(sizeLevelAtom);
