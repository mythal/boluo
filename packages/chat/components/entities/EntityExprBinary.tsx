import { FC } from 'react';
import { Binary, BinaryResult } from '../../interpreter/entities';
import { EntityExprNode } from './EntityExprNode';

interface Props {
  node: Binary | BinaryResult;
}

export const EntityExprBinary: FC<Props> = ({ node }) => {
  let result = '';
  if ('value' in node) {
    result = `=${node.value}`;
  }
  return (
    <>
      <EntityExprNode node={node.l} />
      {node.op}
      <EntityExprNode node={node.r} />
      {result}
    </>
  );
};
