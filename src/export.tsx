import { ChannelMemberWithUser } from './api/channels';
import { Id } from './utils/id';
import { genColor } from './utils/game';
import Prando from 'prando';
import { Message } from './api/messages';
import { evaluate, makeRng, nodeToText } from './interpreter/eval';
import { ExportEntity } from './interpreter/entities';
import { mediaUrl } from './api/request';
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
  created: number;
  modified: number;
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
    let whisperTo: ExportMessage['whisperTo'] = null;
    if (message.whisperToUsers) {
      whisperTo = message.whisperToUsers
        .map((id) => memberMap[id])
        .filter((member) => member !== undefined) as ExportMessage['whisperTo'];
    }
    const sender = memberMap[senderId] || defaultMember;
    let media: string | null = null;
    if (mediaId) {
      media = `${location.origin}${mediaUrl(mediaId, false)}`;
    }
    return {
      id,
      sender,
      name,
      mediaUrl: media,
      inGame,
      isAction,
      isMaster,
      folded,
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
    case 'Link':
      return `[url=${entity.href}]${entity.title}[/url]`;
    case 'Strong':
      return `[b]${entity.text}[/b]`;
    case 'Text':
      return entity.text;
    case 'Expr':
      return `[tt]{${entity.exprText}}[/tt]`;
    default:
      return `[不支持 (${entity.text})]`;
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
      return `[${entity.title}](${entity.href})`;
    case 'Strong':
      return `**${entity.text}**`;
    case 'Text':
      return entity.text;
    case 'Expr':
      return `{${entity.exprText}}`;
    default:
      return `[不支持 (${entity.text})]`;
  }
}

function booleanToText(value: boolean): string {
  return value ? '是' : '否';
}

export function csvBlob(messages: ExportMessage[]): Blob {
  let csv = '时间, 名字, 昵称, 主持人?, 动作?, 游戏内?, 内容, 悄悄话, 附件, 折叠?\n';
  for (const message of messages) {
    const { created, name, sender, isMaster, isAction, inGame, entities, whisperTo, mediaUrl, folded } = message;
    const row: string[] = [
      dateTimeFormat(new Date(created)),
      name,
      sender.nickname,
      booleanToText(isMaster),
      booleanToText(isAction),
      booleanToText(inGame),
      entities.map(entityMarkdown).join(''),
      whisperTo === null ? '否' : whisperToText(whisperTo, inGame),
      mediaUrl || '',
      booleanToText(folded),
    ].map((cell) => {
      return '"' + cell.replace(/"/g, '""') + '"';
    });
    csv += row.join(',') + '\n';
  }

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

export function bbCodeTextBlob(messages: ExportMessage[], simple: boolean): Blob {
  let text = '';
  for (const message of messages) {
    const name = messageName(message, simple);
    const { isAction } = message;
    let line = '';
    if (!simple || !isAction) {
      line = '[color=silver]';
      if (!simple) {
        line += dateTimeFormat(new Date(message.created)) + ' ';
      }
      if (!isAction) {
        line += `<${name}>`;
      }
      line += '[/color] ';
      if (!simple) {
        line += ' ' + messageMetaDataText(message);
      }
    }
    line += `[color=${message.sender.color}]`;
    if (message.isAction) {
      line += `* ${name} `;
    }
    for (const entity of message.entities) {
      line += entityBbCode(entity, message.sender.color);
    }
    text += line + '[/color]\n';
    if (message.mediaUrl && !simple) {
      text += `[img]${message.mediaUrl}[/img]\n`;
    }
  }
  return new Blob([text], { type: 'text/plain;charset=utf-8;' });
}

export function txtBlob(messages: ExportMessage[], simple: boolean): Blob {
  let text = '';
  for (const message of messages) {
    const name = messageName(message, simple);
    const { isAction } = message;
    let line = '';
    if (!simple || !isAction) {
      if (!simple) {
        const dateTime = dateTimeFormat(new Date(message.created));
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
