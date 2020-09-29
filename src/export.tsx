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
      color: genColor(new Prando(userId)),
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

function entityText(entity: ExportEntity, bbCode = false, color = '#000000'): string {
  switch (entity.type) {
    case 'Code':
      if (bbCode) {
        return `[tt]${entity.text}[/tt]`;
      } else {
        return `\`${entity.text}\``;
      }
    case 'CodeBlock':
      if (bbCode) {
        return `[/color]\n[code]${entity.text}[/code]\n[color=${color}]`;
      } else {
        return `\n\`\`\`\n${entity.text}\n\`\`\`\n`;
      }
    case 'Emphasis':
      if (bbCode) {
        return `[i]${entity.text}[/i]`;
      } else {
        return `*${entity.text}*`;
      }
    case 'Link':
      if (bbCode) {
        return `[url=${entity.href}]${entity.title}[/url]`;
      } else {
        return `[${entity.title}](${entity.href})`;
      }
    case 'Strong':
      if (bbCode) {
        return `[b]${entity.text}[/b]`;
      } else {
        return `**${entity.text}**`;
      }
    case 'Text':
      return entity.text;
    case 'Expr':
      if (bbCode) {
        return `[tt]{${entity.exprText}}[/tt]`;
      } else {
        return `{${entity.exprText}}`;
      }
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
      entities.map((entity) => entityText(entity)).join(''),
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

export function txtBlob(messages: ExportMessage[], bbCode: boolean, simple: boolean): Blob {
  let text = '';
  for (const message of messages) {
    let line = '';
    if (bbCode) {
      line += '[color=silver]';
    }
    if (!simple) {
      const dateTime = dateTimeFormat(new Date(message.created));
      if (bbCode) {
        line += dateTime;
      } else {
        line += `[${dateTime}]`;
      }
    }
    let name: string;
    if (message.inGame) {
      name = `${message.name}|${message.sender.nickname}`;
    } else {
      name = `${message.sender.nickname}|游戏外`;
    }
    if (!message.isAction) {
      line += ` <${name}>`;
    }
    if (bbCode) {
      line += '[/color]';
    }

    if (message.folded && !simple) {
      line += ' [已折叠]';
    }
    if (message.whisperTo && !simple) {
      line += ` [对 ${whisperToText(message.whisperTo, message.inGame)} 悄悄话`;
      if (message.entities.length === 0) {
        line += ' 内容已隐藏，需要主持人导出';
        text += line + '\n';
        continue;
      }
    }
    line += ' ';
    if (bbCode) {
      line += `[color=${message.sender.color}]`;
    }
    if (message.isAction) {
      line += `* ${name} `;
    }
    for (const entity of message.entities) {
      line += entityText(entity, bbCode, message.sender.color);
    }
    if (message.mediaUrl && !bbCode && !simple) {
      line += ` $ [附件](${message.mediaUrl})`;
    }
    text += line;
    if (bbCode) {
      text += '[/color]';
    }
    text += '\n';
    if (message.mediaUrl && bbCode && !simple) {
      text += `[img]${message.mediaUrl}[/img]\n`;
    }
  }
  return new Blob([text], { type: 'text/plain;charset=utf-8;' });
}
