import React from 'react';
import { Channel } from '../Channel/Channel';
import { useDispatch } from '../App/App';
import { ActionType, ClosePane } from '../App/actions';
import { Pane } from './Pane';

export interface Props {
  pane: Pane;
}

export const PaneView = ({ pane }: Props) => {
  const dispatch = useDispatch<ClosePane>();
  const id = pane.id;
  let content = null;
  if (pane.type === 'channel') {
    content = <Channel id={id} />;
  }
  const close: React.MouseEventHandler = e => {
    e.preventDefault();
    dispatch({ type: ActionType.ClosePane, id });
  };
  return (
    <section className="pane">
      <a href="#" onClick={close}>
        Close
      </a>
      {content}
    </section>
  );
};
