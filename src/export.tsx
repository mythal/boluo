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
      if (message.whisperTo.length > 0) {
        const nameList = message.whisperTo
          .map((member) => {
            if (message.inGame) {
              return member.characterName || member.nickname;
            } else {
              return member.nickname;
            }
          })
          .join(', ');
        line += ` [对 ${nameList} 悄悄话]`;
      } else {
        line += ` [对主持人悄悄话]`;
      }
      if (message.entities.length === 0) {
        line += ' 内容已隐藏，需要主持人导出';
        text += line + '\n';
        continue;
      }
    }
    line += ' ';
    let colorTag = '';
    if (bbCode) {
      colorTag = `[color=${message.sender.color}]`;
      line += colorTag;
    }
    if (message.isAction) {
      line += `* ${name} `;
    }
    for (const entity of message.entities) {
      switch (entity.type) {
        case 'Code':
          if (bbCode) {
            line += `[tt]${entity.text}[/tt]`;
          } else {
            line += `\`${entity.text}\``;
          }
          break;
        case 'CodeBlock':
          if (bbCode) {
            line += `[/color]\n[code]${entity.text}[/code]\n${colorTag}`;
          } else {
            line += `\n\`\`\`\n${entity.text}\n\`\`\`\n`;
          }
          break;
        case 'Emphasis':
          if (bbCode) {
            line += `[i]${entity.text}[/i]`;
          } else {
            line += `*${entity.text}*`;
          }
          break;
        case 'Link':
          if (bbCode) {
            line += `[url=${entity.href}]${entity.title}[/url]`;
          } else {
            line += `[${entity.title}](${entity.href})`;
          }
          break;
        case 'Strong':
          if (bbCode) {
            line += `[b]${entity.text}[/b]`;
          } else {
            line += `**${entity.text}**`;
          }
          break;
        case 'Text':
          line += entity.text;
          break;
        case 'Expr':
          if (bbCode) {
            line += `[tt]{${entity.exprText}}[/tt]`;
          } else {
            line += `{${entity.exprText}}`;
          }
          break;
        default:
          line += `[不支持 (${entity.text})]`;
          break;
      }
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
