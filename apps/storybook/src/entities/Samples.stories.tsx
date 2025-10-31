import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Entities, ExprEntity } from '@boluo/api';
import { type FC } from 'react';
import { EntityText } from '@boluo/ui/entities/EntityText';
import { EntityStrong } from '@boluo/ui/entities/EntityStrong';
import { EntityEmphasis } from '@boluo/ui/entities/EntityEmphasis';
import { EntityStrongEmphasis } from '@boluo/ui/entities/EntityStrongEmphasis';
import { EntityCode } from '@boluo/ui/entities/EntityCode';
import { EntityExpr } from '@boluo/ui/entities/EntityExpr';
import { EntityUnknown } from '@boluo/ui/entities/EntityUnknown';

type Segment =
  | { type: 'Text'; text: string }
  | { type: 'Strong'; text: string }
  | { type: 'Emphasis'; text: string }
  | { type: 'StrongEmphasis'; text: string }
  | { type: 'Code'; text: string }
  | { type: 'Expr'; text: string; node: ExprEntity['node'] };

const segments: Segment[] = [
  { type: 'Text', text: '「' },
  { type: 'Strong', text: '光之誓约，驱散黑夜！' },
  { type: 'Text', text: '」魔法少女' },
  { type: 'Emphasis', text: '星光' },
  { type: 'Text', text: '举起法杖，在空气中绘出璀璨的魔法阵。\n' },
  { type: 'StrongEmphasis', text: '吸血鬼伯爵莱斯特' },
  { type: 'Text', text: '舔舐着尖牙，低声嘲笑：「' },
  { type: 'Emphasis', text: '鲜血会写下你的结局' },
  { type: 'Text', text: '。」\n星光掷出她的命运骰：' },
  { type: 'Code', text: '/roll 3d6+2' },
  { type: 'Text', text: '，希望光芒能穿透阴影。\n命运回应了她：' },
  {
    type: 'Expr',
    text: '3d6+2',
    node: {
      type: 'Binary',
      op: '+',
      l: {
        type: 'Roll',
        counter: 3,
        face: 6,
        filter: null,
      },
      r: { type: 'Num', value: 2 },
    },
  },
  { type: 'Text', text: ' => ' },
  { type: 'Strong', text: '14' },
  {
    type: 'Text',
    text: '，一束烈光撕碎黑暗，迫使伯爵后退三步。\n但伯爵张开血翼，反击的气息在夜色中蔓延。',
  },
];

const sourceParts: string[] = [];
const entities: Entities = [];
let offset = 0;

for (const segment of segments) {
  const start = offset;
  const len = segment.text.length;
  sourceParts.push(segment.text);

  switch (segment.type) {
    case 'Text':
      entities.push({ type: 'Text', start, len });
      break;
    case 'Strong':
      entities.push({
        type: 'Strong',
        start,
        len,
        child: { type: 'Text', start, len },
      });
      break;
    case 'Emphasis':
      entities.push({
        type: 'Emphasis',
        start,
        len,
        child: { type: 'Text', start, len },
      });
      break;
    case 'StrongEmphasis':
      entities.push({
        type: 'StrongEmphasis',
        start,
        len,
        child: { type: 'Text', start, len },
      });
      break;
    case 'Code':
      entities.push({
        type: 'Code',
        start,
        len,
        child: { type: 'Text', start, len },
      });
      break;
    case 'Expr':
      entities.push({
        type: 'Expr',
        start,
        len,
        node: segment.node,
      });
      break;
    default:
      break;
  }

  offset += len;
}

const source = sourceParts.join('');

interface PreviewProps {
  source: string;
  entities: Entities;
}

const MixedEntitiesPreview: FC<PreviewProps> = ({ source, entities }) => {
  return (
    <span className="block leading-relaxed whitespace-pre-wrap">
      {entities.map((entity, index) => {
        switch (entity.type) {
          case 'Text':
            return <EntityText key={index} source={source} entity={entity} />;
          case 'Strong':
            return <EntityStrong key={index} source={source} entity={entity} />;
          case 'Emphasis':
            return <EntityEmphasis key={index} source={source} entity={entity} />;
          case 'StrongEmphasis':
            return <EntityStrongEmphasis key={index} source={source} entity={entity} />;
          case 'Code':
            return <EntityCode key={index} source={source} entity={entity} />;
          case 'Expr':
            return <EntityExpr key={index} source={source} entity={entity} />;
          default:
            return <EntityUnknown key={index} />;
        }
      })}
    </span>
  );
};

const meta: Meta<typeof MixedEntitiesPreview> = {
  title: 'Entities/Samples',
  component: MixedEntitiesPreview,
  args: {
    source,
    entities,
  },
};

export default meta;

type Story = StoryObj<typeof MixedEntitiesPreview>;

export const BattleScene: Story = {};
