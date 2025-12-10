import type Prando from 'prando';
import {
  type Entity,
  type Channel,
  type ChannelMemberWithUser,
  type Export,
  type Message,
} from '@boluo/api';
import { type ExportEntity, evaluate, makeRng, nodeToText } from '@boluo/interpreter';
import { computeColors, parseGameColor } from '@boluo/color';
import { getMediaUrl } from '../../media';
import { type IntlShape } from 'react-intl';
import { get } from '@boluo/api-browser';
import { fileNameDateTimeFormat, generateDetailDate } from '../../date';
import { splitByLine } from '@boluo/utils/string';

const DEFAULT_COLOR = '#000';

export interface ExportOptions {
  format: 'txt' | 'csv' | 'json' | 'bbcode';
  range: '30d' | '7d' | '1d' | 'all';
  includeOutGame: boolean;
  includeArchived: boolean;
  simple: boolean;
  splitByLineBreak: boolean;
}

export interface ExportResult {
  filename: string;
  blob: Blob;
}

export interface ExportContext {
  intl: IntlShape;
  options: ExportOptions;
}

export interface ExportMember {
  userId: string;
  nickname: string;
  characterName: string;
  isMaster: boolean;
  color: string;
}

export const makeDefaultMember = (intl: IntlShape): ExportMember => ({
  userId: '00000000-0000-0000-0000-000000000000',
  nickname: `[${intl.formatMessage({ defaultMessage: 'Left Member' })}]`,
  characterName: `[${intl.formatMessage({ defaultMessage: 'Anonymous' })}]`,
  isMaster: false,
  color: '#333333',
});

export interface ExportMessage {
  id: string;
  sender: ExportMember;
  name: string;
  mediaUrl: string | null;
  inGame: boolean;
  isAction: boolean;
  isMaster: boolean;
  folded: boolean;
  created: string;
  modified: string;
  text: string;
  entities: ExportEntity[];
  whisperTo: null | ExportMember[];
}

export const formatDateString = (dateString: string): string => {
  const date = new Date(dateString);
  return generateDetailDate(date);
};

const entityToExportEntity =
  (intl: IntlShape, rng: Prando, text: string) =>
  (entity: Entity): ExportEntity => {
    if (entity.type === 'Expr') {
      const { type, start, len } = entity;
      const node = evaluate(entity.node, rng);
      return {
        type,
        start,
        len,
        node,
        exprText: nodeToText(intl, node),
        text: text.substring(start, start + len).trimEnd(),
      };
    } else if (entity.type === 'Link') {
      const { start, len } = entity.child;
      return {
        type: 'Link',
        text: text.substring(start, start + len),
        href:
          typeof entity.href === 'string'
            ? entity.href
            : text.substr(entity.href.start, entity.href.len),
        start: entity.start,
        len: entity.len,
      };
    } else if (
      entity.type === 'Emphasis' ||
      entity.type === 'Strong' ||
      entity.type === 'Code' ||
      entity.type === 'CodeBlock' ||
      entity.type === 'StrongEmphasis'
    ) {
      return {
        ...entity,
        text: text.substring(entity.child.start, entity.child.start + entity.child.len),
      };
    } else {
      return { ...entity, text: text.substring(entity.start, entity.start + entity.len) };
    }
  };

export const exportMessage = (
  intl: IntlShape,
  publicMediaUrl: string,
  members: ChannelMemberWithUser[],
) => {
  const memberMap: Record<string, ExportMember | undefined> = {};
  for (const member of members) {
    const userId = member.user.id;
    const { isMaster, characterName } = member.member;
    memberMap[userId] = {
      userId,
      nickname: member.user.nickname,
      characterName,
      isMaster,
      color: computeColors(member.user.id, parseGameColor(member.user.defaultColor))['light'],
    };
  }
  return (message: Message): ExportMessage => {
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

    let exportEntities: ExportEntity[] = [];
    if (rng) {
      const entityMapper = entityToExportEntity(intl, rng, text);
      exportEntities = entities.map(entityMapper);
    }
    let whisperTo: ExportMessage['whisperTo'] = null;
    if (message.whisperToUsers) {
      whisperTo = message.whisperToUsers
        .map((id) => memberMap[id])
        .filter((member) => member !== undefined) as ExportMessage['whisperTo'];
    }
    const sender = memberMap[senderId] || makeDefaultMember(intl);
    let media: string | null = null;
    if (mediaId) {
      media = getMediaUrl(publicMediaUrl, mediaId);
    }
    return {
      id,
      sender,
      name,
      mediaUrl: media,
      inGame: inGame ?? false,
      isAction: isAction ?? false,
      isMaster: isMaster ?? false,
      folded: folded ?? false,
      created,
      modified,
      text,
      entities: exportEntities,
      whisperTo,
    };
  };
};

export function jsonBlob(messages: ExportMessage[]): Blob {
  return new Blob([JSON.stringify(messages)], { type: 'text/json' });
}

function whisperToText(intl: IntlShape, whisperTo: ExportMember[], inGame: boolean): string {
  if (whisperTo.length > 0) {
    const nameList = whisperTo
      .map((member) => {
        if (inGame) {
          return member.characterName || member.nickname;
        } else {
          return member.nickname;
        }
      })
      .join(', ');
    return `${nameList}`;
  } else {
    return intl.formatMessage({ defaultMessage: 'Master' });
  }
}

function entityBbCode(entity: ExportEntity, color: string): string {
  switch (entity.type) {
    case 'Code':
      return `[tt]${entity.text}[/tt]`;
    case 'CodeBlock':
      return `[/color]\n[code]${entity.text}[/code]\n[color=${color}]`;
    case 'Emphasis':
      return `[i]${entity.text}[/i]`;
    case 'Link':
      return `[url=${entity.href}]${entity.text}[/url]`;
    case 'Strong':
      return `[b]${entity.text}[/b]`;
    case 'Text':
      return entity.text;
    case 'Expr':
      return `[tt]{${entity.exprText}}[/tt]`;
    default:
      return `[???]`;
  }
}
function entityMarkdown(entity: ExportEntity): string {
  switch (entity.type) {
    case 'Code':
      return `\`${entity.text}\``;
    case 'CodeBlock':
      return `\n\`\`\`\n${entity.text}\n\`\`\`\n`;
    case 'Emphasis':
      return `*${entity.text}*`;
    case 'Link':
      return `[${entity.text}](${entity.href})`;
    case 'Strong':
      return `**${entity.text}**`;
    case 'Text':
      return entity.text;
    case 'Expr':
      return `{${entity.exprText}}`;
    default:
      return `[???]`;
  }
}

function booleanToText(intl: IntlShape, value: boolean): string {
  return value
    ? intl.formatMessage({ defaultMessage: 'Yes' })
    : intl.formatMessage({ defaultMessage: 'No' });
}

export function csvBlob(intl: IntlShape, messages: ExportMessage[]): Blob {
  const headerRow = [
    intl.formatMessage({ defaultMessage: 'Time' }),
    intl.formatMessage({ defaultMessage: 'Name' }),
    intl.formatMessage({ defaultMessage: 'Nickname' }),
    intl.formatMessage({ defaultMessage: 'Is Master' }) + '?',
    intl.formatMessage({ defaultMessage: 'In Game' }) + '?',
    intl.formatMessage({ defaultMessage: 'Content' }),
    intl.formatMessage({ defaultMessage: 'Whisper' }),
    intl.formatMessage({ defaultMessage: 'Attachment' }),
    intl.formatMessage({ defaultMessage: 'Archived' }) + '?',
  ].join(', ');
  let csv = headerRow + '\n';
  for (const message of messages) {
    const {
      created,
      name,
      sender,
      isMaster,
      isAction,
      inGame,
      entities,
      whisperTo,
      mediaUrl,
      folded,
    } = message;
    const row: string[] = [
      formatDateString(created),
      name,
      sender.nickname,
      booleanToText(intl, isMaster),
      booleanToText(intl, isAction),
      booleanToText(intl, inGame),
      entities.map(entityMarkdown).join(''),
      whisperTo == null ? 'N/A' : whisperToText(intl, whisperTo, inGame),
      mediaUrl || '',
      booleanToText(intl, folded),
    ].map((cell) => {
      return '"' + cell.replace(/"/g, '""') + '"';
    });
    csv += row.join(',') + '\n';
  }

  // https://stackoverflow.com/a/18925211/1137004
  return new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
}

function messageName(intl: IntlShape, message: ExportMessage, simple: boolean): string {
  if (message.inGame) {
    if (simple) {
      return message.name;
    }
    return `${message.name}|${message.sender.nickname}`;
  } else {
    if (simple) {
      return message.sender.nickname;
    }
    return message.sender.nickname + '|' + intl.formatMessage({ defaultMessage: 'OOC' });
  }
}

function messageMetaDataText(intl: IntlShape, message: ExportMessage): string {
  let span = '';
  if (message.folded) {
    span += '[' + intl.formatMessage({ defaultMessage: 'Archived' }) + ']';
  }
  if (message.whisperTo) {
    span +=
      '[' +
      intl.formatMessage(
        { defaultMessage: 'Whisper to {targets}' },
        { targets: whisperToText(intl, message.whisperTo, message.inGame) },
      ) +
      ']';
    if (message.entities.length === 0) {
      span += ' [' + intl.formatMessage({ defaultMessage: 'Whisper' }) + ']';
    }
  }
  return span;
}

export function bbCodeTextBlob(context: ExportContext, messages: ExportMessage[]): Blob {
  const {
    intl,
    options: { simple, splitByLineBreak },
  } = context;
  let text = '';
  for (const message of messages) {
    const name = messageName(intl, message, simple);
    const { isAction } = message;
    let header = '';
    if (!simple || !isAction) {
      header = '[color=silver]';
      if (!simple) {
        header += formatDateString(message.created) + ' ';
      }
      if (!isAction) {
        header += `<${name}>`;
      }
      header += '[/color] ';
      if (!simple) {
        header += ' ' + messageMetaDataText(intl, message);
      }
    }
    const lines: string[] = [];
    const contentColor = message.inGame ? message.sender.color : DEFAULT_COLOR;
    let currentLine: string = '';
    for (const entity of message.entities) {
      const fragment = entityBbCode(entity, contentColor);
      if (!splitByLineBreak) {
        currentLine += fragment;
      } else if (entity.type === 'Text') {
        const fragments = splitByLine(fragment);
        if (fragments.length === 0) {
          continue;
        } else if (fragments.length === 1) {
          currentLine += fragment;
        } else if (fragments.length === 2) {
          lines.push(currentLine + fragments[0]);
          currentLine = fragments[1]!;
        } else if (fragments.length > 2) {
          lines.push(currentLine + fragments[0]);
          for (let i = 1; i < fragments.length - 1; i++) {
            lines.push(fragments[i]!);
          }
          currentLine = fragments[fragments.length - 1]!;
        }
      } else {
        currentLine += fragment;
      }
    }
    lines.push(currentLine);
    let entry =
      lines
        .map((line) => {
          const actionHead = message.isAction ? `* ${name} ` : '';
          return `${header}[color=${contentColor}]${actionHead}${line}[/color]`;
        })
        .join('\n') + '\n';

    if (message.mediaUrl && !simple) {
      entry += `[img]${message.mediaUrl}[/img]\n`;
    }
    text += entry;
  }
  return new Blob([text], { type: 'text/plain;charset=utf-8;' });
}

export function txtBlob(
  { intl, options: { simple } }: ExportContext,
  messages: ExportMessage[],
): Blob {
  let text = '';
  for (const message of messages) {
    const name = messageName(intl, message, simple);
    const { isAction } = message;
    let line = '';
    if (!simple || !isAction) {
      if (!simple) {
        const dateTime = formatDateString(message.created);
        line += `[${dateTime}] `;
      }
      if (!isAction) {
        line += `<${name}>`;
      }
      if (!simple) {
        line += ' ' + messageMetaDataText(intl, message);
      }
      line += ' ';
    }
    if (message.isAction) {
      line += `* ${name} `;
    }
    for (const entity of message.entities) {
      line += entityMarkdown(entity);
    }
    if (message.mediaUrl && !simple) {
      line += ` $ [📎](${message.mediaUrl})`;
    }
    text += line;
    text += '\n';
  }
  return new Blob([text], { type: 'text/plain;charset=utf-8;' });
}

export const exportChannel = async (
  intl: IntlShape,
  publicMediaUrl: string,
  channel: Channel,
  options: ExportOptions,
): Promise<ExportResult> => {
  const { includeArchived, includeOutGame } = options;
  const membersResult = await get('/channels/all_members', { id: channel.id });
  const members = membersResult.unwrap();
  const exportQuery: Export = { channelId: channel.id, after: null };
  const now = new Date();
  if (options.range !== 'all') {
    const after = new Date();
    after.setHours(0, 0, 0, 0);
    const days = { '30d': 30, '7d': 7, '1d': 1 }[options.range];
    after.setDate(after.getDate() - days);
    exportQuery.after = after.toISOString();
  }
  const exportResult = await get('/channels/export', exportQuery);
  const messages = exportResult
    .unwrap()
    .map(exportMessage(intl, publicMediaUrl, members))
    .filter((message) => {
      if (!includeArchived && message.folded) {
        return false;
      } else if (!includeOutGame && !message.inGame) {
        return false;
      }
      return true;
    });
  const context: ExportContext = { intl, options };
  let blob: Blob;
  let ext: string;
  switch (options.format) {
    case 'csv':
      blob = csvBlob(intl, messages);
      ext = 'csv';
      break;
    case 'json':
      blob = jsonBlob(messages);
      ext = 'json';
      break;
    case 'bbcode':
      blob = bbCodeTextBlob(context, messages);
      ext = 'txt';
      break;
    case 'txt':
    default:
      blob = txtBlob(context, messages);
      ext = 'txt';
  }
  return {
    filename: `[${fileNameDateTimeFormat(now)}]${channel.name}.${ext}`,
    blob,
  };
};
