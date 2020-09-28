import * as React from 'react';
import { useRef, useState } from 'react';
import Dialog from '../molecules/Dialog';
import { mT, selectTheme, uiShadow, widthFull } from '../../styles/atoms';
import { Label } from '../atoms/Label';
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';
import exportIcon from '../../assets/icons/file-export.svg';
import { dateTimeFormat } from '../../utils/time';
import { Channel } from '../../api/channels';
import { useDispatch } from '../../store';
import { get, mediaUrl } from '../../api/request';
import { throwErr } from '../../utils/errors';
import { Id } from '../../utils/id';
import { ExportEntity } from '../../interpreter/entities';
import { Message } from '../../api/messages';
import { evaluate, makeRng, nodeToText } from '../../interpreter/eval';

const Select = React.lazy(() => import('react-select'));

interface ExportMessage {
  id: Id;
  senderId: Id;
  name: string;
  mediaId: Id | null;
  inGame: boolean;
  isAction: boolean;
  isMaster: boolean;
  folded: boolean;
  created: number;
  modified: number;
  text: string;
  entities: ExportEntity[];
}

function exportMessage(message: Message): ExportMessage {
  const {
    id,
    senderId,
    name,
    mediaId,
    inGame,
    isAction,
    isMaster,
    folded,
    created,
    modified,
    text,
    entities,
    seed,
  } = message;
  const rng = makeRng(seed);
  const exportEntities: ExportEntity[] = !rng
    ? []
    : entities.map((entity) => {
        if (entity.type === 'Expr') {
          const { type, start, offset } = entity;
          const node = evaluate(entity.node, rng);
          return {
            type,
            start,
            offset,
            node,
            exprText: nodeToText(node),
            text: text.substr(start, offset).trimRight(),
          };
        } else {
          return { ...entity, text: text.substr(entity.start, entity.offset) };
        }
      });
  return {
    id,
    senderId,
    name,
    mediaId,
    inGame,
    isAction,
    isMaster,
    folded,
    created,
    modified,
    text,
    entities: exportEntities,
  };
}

interface Props {
  dismiss: () => void;
  channel: Channel;
}

const options = [
  { value: 'TXT', label: '文本 (txt)' },
  { value: 'JSON', label: 'JSON' },
];

type Option = { value: string; label: string };

function jsonBlob(messages: ExportMessage[]): Blob {
  return new Blob([JSON.stringify(messages)], { type: 'text/json' });
}

function txtBlob(messages: ExportMessage[]): Blob {
  let text = '';
  for (const message of messages) {
    text += `[${dateTimeFormat(new Date(message.created))}]`;
    if (message.folded) {
      text += '[已折叠]';
    }
    if (!message.inGame) {
      text += '[游戏外]';
    } else if (message.isMaster) {
      text += '[主持]';
    }
    text += `[${message.name}]`;
    if (message.isAction) {
      text += '[动作]';
    }
    for (const entity of message.entities) {
      switch (entity.type) {
        case 'Code':
          text += `\`${entity.text}\``;
          break;
        case 'CodeBlock':
          text += `\n\`\`\`\n${entity.text}\n\`\`\`\n`;
          break;
        case 'Emphasis':
          text += `*${entity.text}*`;
          break;
        case 'Link':
          text += `[${entity.title}](${entity.href})`;
          break;
        case 'Strong':
          text += `**${entity.text}**`;
          break;
        case 'Text':
          text += entity.text;
          break;
        case 'Expr':
          text += `{${entity.exprText}}`;
          break;
        default:
          text += `[不支持 (${entity.text})]`;
          break;
      }
    }
    if (message.mediaId) {
      text += ` $ [附件](${location.origin}${mediaUrl(message.mediaId, true)})`;
    }
    text += '\n';
  }
  return new Blob([text], { type: 'text/plain' });
}

function ExportDialog({ dismiss, channel }: Props) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<Option>(options[0]);
  const dispatch = useDispatch();
  const now = new Date();
  let filename = `${dateTimeFormat(now)}-${channel.name}`;
  if (format.value === 'JSON') {
    filename += '.json';
  } else if (format.value === 'TXT') {
    filename += '.txt';
  }

  const exportData = async () => {
    setLoading(true);
    const result = await get('/channels/export', { id: channel.id });
    if (!result.isOk) {
      throwErr(dispatch)(result.value);
      return;
    }
    const messages = result.value.map(exportMessage);
    let blob: Blob | null = null;
    if (format.value === 'JSON') {
      blob = jsonBlob(messages);
    } else if (format.value === 'TXT') {
      blob = txtBlob(messages);
    }
    if (blob === null) {
      return;
    }
    const href = URL.createObjectURL(blob);
    linkRef.current!.href = href;
    linkRef.current!.click();
    URL.revokeObjectURL(href);
    setLoading(false);
  };
  return (
    <Dialog title="导出频道数据" dismiss={dismiss} noOverflow mask>
      <Label>导出格式</Label>
      <Select
        value={format}
        onChange={setFormat}
        css={[uiShadow]}
        options={options}
        theme={selectTheme}
        placeholder="选择导出格式…"
      />

      <a hidden href="#" ref={linkRef} download={filename} />
      <Button css={[widthFull, mT(4)]} data-variant="primary" onClick={exportData} disabled={loading}>
        <span>
          <Icon loading={loading} sprite={exportIcon} /> 导出
        </span>
      </Button>
    </Dialog>
  );
}

export default ExportDialog;
