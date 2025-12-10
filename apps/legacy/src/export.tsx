import Prando from 'prando';
import { type ChannelMemberWithUser } from './api/channels';
import { type Message } from './api/messages';
import { mediaUrl } from './api/request';
import { type ExportEntity, fromLegacyEntity } from './interpreter/entities';
import { evaluate, makeRng, nodeToText } from './interpreter/eval';
import { genColor } from './utils/game';
import { parseDateString } from './utils/helper';
import { type Id } from './utils/id';
import { dateTimeFormat } from './utils/time';

export interface ExportMember {
  userId: Id;
  nickname: string;
  characterName: string;
  isMaster: boolean;
  color: string;
}

export const defaultMember: ExportMember = {
  userId: '',
  nickname: '未知用户',
  characterName: '无名氏',
  isMaster: false,
  color: '#CCCCCC',
};

export interface ExportMessage {
  id: Id;
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

export const exportMessage = (members: ChannelMemberWithUser[]) => {
  const memberMap: Record<Id, ExportMember | undefined> = {};
  for (const member of members) {
    const userId = member.user.id;
    const { isMaster, characterName } = member.member;
    memberMap[userId] = {
      userId,
      nickname: member.user.nickname,
      characterName,
      isMaster,
      color: genColor(new Prando(userId), -0.3),
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
    const exportEntities: ExportEntity[] = !rng
      ? []
      : entities.map((item): ExportEntity => {
          const entity = item;
          if (entity.type === 'Expr') {
            const { type, start, len } = entity;
            const node = evaluate(entity.node, rng);
            return {
              type,
              start,
              len,
              node,
              exprText: nodeToText(node),
              text: text.substr(start, len).trimRight(),
            };
          } else if (entity.type === 'Link') {
            return {
              type: 'ExportLink',
              text: text.substr(entity.child.start, entity.child.len),
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
            entity.type === 'CodeBlock'
          ) {
            return {
              ...entity,
              text: text.substring(entity.child.start, entity.child.start + entity.child.len),
            };
          } else {
            return { ...entity, text: text.substr(entity.start, entity.len) };
          }
        });
    let whisperTo: ExportMessage['whisperTo'] = null;
    if (message.whisperToUsers) {
      whisperTo = message.whisperToUsers
        .map((id) => memberMap[id])
        .filter((member) => member !== undefined) as ExportMessage['whisperTo'];
    }
    const sender = memberMap[senderId] || defaultMember;
    let media: string | null = null;
    if (mediaId) {
      media = `${location.origin}${mediaUrl(mediaId, false, false)}`;
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

function whisperToText(whisperTo: ExportMember[], inGame: boolean): string {
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
    return `主持人`;
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
    case 'StrongEmphasis':
      return `[b][i]${entity.text}[/i][/b]`;
    case 'ExportLink':
      return `[url=${entity.href}]${entity.text}[/url]`;
    case 'Strong':
      return `[b]${entity.text}[/b]`;
    case 'Text':
      return entity.text;
    case 'Expr':
      return `[tt]{${entity.exprText}}[/tt]`;
    default:
      return `[不支持]`;
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
    case 'StrongEmphasis':
      return `***${entity.text}***`;
    case 'ExportLink':
      return `[${entity.text}](${entity.href})`;
    case 'Strong':
      return `**${entity.text}**`;
    case 'Text':
      return entity.text;
    case 'Expr':
      return `{${entity.exprText}}`;
    default:
      return `[不支持]`;
  }
}

function booleanToText(value: boolean): string {
  return value ? '是' : '否';
}

export function csvBlob(messages: ExportMessage[]): Blob {
  let csv = '时间, 名字, 昵称, 主持人?, 动作?, 游戏内?, 内容, 悄悄话, 附件, 折叠?\n';
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
      dateTimeFormat(parseDateString(created)),
      name,
      sender.nickname,
      booleanToText(isMaster),
      booleanToText(isAction),
      booleanToText(inGame),
      entities.map(entityMarkdown).join(''),
      whisperTo == null ? '否' : whisperToText(whisperTo, inGame),
      mediaUrl || '',
      booleanToText(folded),
    ].map((cell) => {
      return '"' + cell.replace(/"/g, '""') + '"';
    });
    csv += row.join(',') + '\n';
  }

  // https://stackoverflow.com/a/18925211/1137004
  return new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
}

function messageName(message: ExportMessage, simple: boolean): string {
  if (message.inGame) {
    if (simple) {
      return message.name;
    }
    return `${message.name}|${message.sender.nickname}`;
  } else {
    if (simple) {
      return message.sender.nickname;
    }
    return `${message.sender.nickname}|游戏外`;
  }
}

function messageMetaDataText(message: ExportMessage): string {
  let span = '';
  if (message.folded) {
    span += '[已折叠]';
  }
  if (message.whisperTo) {
    span += `[对 ${whisperToText(message.whisperTo, message.inGame)} 悄悄话]`;
    if (message.entities.length === 0) {
      span += ' 内容已隐藏，需要主持人导出';
    }
  }
  return span;
}

export function bbCodeTextBlob(
  messages: ExportMessage[],
  simple: boolean,
  headerAfterWrap: boolean,
): Blob {
  let text = '';
  for (const message of messages) {
    const name = messageName(message, simple);
    const { isAction } = message;
    let header = '';
    if (!simple || !isAction) {
      header = '[color=silver]';
      if (!simple) {
        header += dateTimeFormat(parseDateString(message.created)) + ' ';
      }
      if (!isAction) {
        header += `<${name}>`;
      }
      header += '[/color] ';
      if (!simple) {
        header += ' ' + messageMetaDataText(message);
      }
    }
    const lines: string[] = [];
    let currentLine = '';
    for (const entity of message.entities) {
      const fragment = entityBbCode(entity, message.sender.color);
      if (!headerAfterWrap) {
        currentLine += fragment;
      } else if (entity.type === 'Text') {
        const fragments = fragment.split(/\r?\n/);
        if (fragments.length === 0) {
          continue;
        } else if (fragments.length === 1) {
          currentLine += fragment;
        } else if (fragments.length === 2) {
          lines.push(currentLine + fragments[0]);
          currentLine = fragments[1];
        } else if (fragments.length > 2) {
          lines.push(currentLine + fragments[0]);
          for (let i = 1; i < fragments.length - 1; i++) {
            lines.push(fragments[i]);
          }
          currentLine = fragments[fragments.length - 1];
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
          return `${header}[color=${message.sender.color}]${actionHead}${line}[/color]`;
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
  messages: ExportMessage[],
  simple: boolean,
  headerAfterWrap: boolean,
): Blob {
  let text = '';
  for (const message of messages) {
    const name = messageName(message, simple);
    const { isAction } = message;
    let line = '';
    if (!simple || !isAction) {
      if (!simple) {
        const dateTime = dateTimeFormat(parseDateString(message.created));
        line += `[${dateTime}] `;
      }
      if (!isAction) {
        line += `<${name}>`;
      }
      if (!simple) {
        line += ' ' + messageMetaDataText(message);
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
      line += ` $ [附件](${message.mediaUrl})`;
    }
    text += line;
    text += '\n';
  }
  return new Blob([text], { type: 'text/plain;charset=utf-8;' });
}
