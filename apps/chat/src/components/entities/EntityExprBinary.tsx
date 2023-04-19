import { FC } from 'react';
import { Binary, BinaryResult } from '../../interpreter/entities';
import { EntityExprNode } from './EntityExprNode';

interface Props {
  node: Binary | BinaryResult;
}

export const EntityExprBinary: FC<Props> = (props) => {
  return (
    <>
      <EntityExprNode node={props.node.l} />
      {props.node.op}
      <EntityExprNode node={props.node.r} />
    </>
  );
};
