import { type PaneData } from './state/view.types';

const panesParam = (panes: PaneData | PaneData[]) => {
  const list = Array.isArray(panes) ? panes : [panes];
  const panesWithKeys = list.map((pane, index) => ({ ...pane, key: index }));
  return `panes=${encodeURIComponent(JSON.stringify(panesWithKeys))}`;
};

export const paneHref = (panes: PaneData | PaneData[]) => `#${panesParam(panes)}`;

export const paneHrefWithRoute = (route: string, panes: PaneData | PaneData[]) =>
  `#route=${route}&${panesParam(panes)}`;
