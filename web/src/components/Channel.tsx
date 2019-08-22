import React, { ChangeEventHandler, FormEventHandler, useRef, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { useMutation, useQuery, useSubscription } from '@apollo/react-hooks';
import { gql } from 'apollo-boost';
import {
  Button,
  Container,
  createStyles,
  FormControlLabel,
  Grid,
  Icon,
  List as ItemList,
  makeStyles,
  Paper,
  Switch,
  TextField,
  Theme,
  Typography,
} from '@material-ui/core';
import { isLoggedIn, useUserState } from '../user';
import { OrderedMap, Set } from 'immutable';
import { CHAR_NAME_KEY } from '../settings';
import { PreviewMessageItem } from './PreviewMessageItem';
import { MessageItem } from './MessageItem';
import { generateId } from '../utils';

interface Match {
  id: string;
}

interface Props extends RouteComponentProps<Match> {}

const CHANNEL = gql`
  query getChannel($id: ID!) {
    getChannelById(id: $id) {
      title
      topic
      created
      modified
      messages {
        id
        content
        created
        userId
        charName
        isOoc
        user {
          nickname
        }
      }
    }
  }
`;

const SUBSCRIBE_MESSAGE_DELETE = gql`
  subscription {
    messageDeleted
  }
`;

const SEND_MESSAGE = gql`
  mutation sendMessage($messageId: ID!, $charName: String!, $channelId: ID!, $messageText: String!, $isOoc: Boolean!) {
    sendMessage(
      type: SAY
      charName: $charName
      channelId: $channelId
      content: $messageText
      id: $messageId
      isOoc: $isOoc
    ) {
      id
    }
  }
`;

const SUBMIT_PREVIEW = gql`
  mutation submitPreview(
    $messageId: ID!
    $charName: String!
    $channelId: ID!
    $messageText: String!
    $startTime: DateTime!
    $justTyping: Boolean!
    $isOoc: Boolean!
  ) {
    updatePreviewMessage(
      type: SAY
      charName: $charName
      channelId: $channelId
      content: $messageText
      id: $messageId
      startTime: $startTime
      justTyping: $justTyping
      isOoc: $isOoc
    )
  }
`;

const SUBSCRIPT_NEW_MESSAGE = gql`
  subscription {
    newMessage {
      id
      content
      created
      channelId
      userId
      isOoc
      charName
      user {
        nickname
      }
    }
  }
`;

const SUBSCRIPT_PREVIEW_MESSAGE = gql`
  subscription {
    messagePreview {
      id
      content
      charName
      channelId
      startTime
      updateTime
      justTyping
      isOoc
    }
  }
`;

export interface PreviewMessage {
  id: string;
  content: string;
  charName: string;
  channelId: string;
  startTime: string;
  updateTime: string;
  justTyping: boolean;
  isOoc: boolean;
}

interface User {
  nickname: string;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  created: Date;
  charName: string;
  user?: User;
  isOoc: boolean;
}

interface Channel {
  title: string;
  topic?: string;
  created: Date;
  modified: Date;
  messages: Message[];
}

interface Data {
  getChannelById?: Channel;
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    paper: {
      padding: theme.spacing(3),
      marginTop: theme.spacing(3),
    },
    rightIcon: {
      marginLeft: theme.spacing(1),
    },
  })
);

interface SendMessageVariables {
  messageId: string;
  messageText: string;
  channelId: string;
  charName: string;
  isOoc: boolean;
}

interface SubmitPreviewVariables extends SendMessageVariables {
  startTime: Date;
  justTyping: boolean;
}

const useDeletedMessageIds = (): Set<string> => {
  const idSet = useRef<Set<string>>(Set());
  const { data } = useSubscription<{ messageDeleted?: string }>(SUBSCRIBE_MESSAGE_DELETE);
  if (!data || !data.messageDeleted) {
    return idSet.current;
  }
  idSet.current = idSet.current.add(data.messageDeleted);
  return idSet.current;
};

const useSubmitPreview = (): ((messageVariables: SendMessageVariables, justTyping: boolean) => void) => {
  const [submitPreview] = useMutation<boolean, SubmitPreviewVariables>(SUBMIT_PREVIEW);
  const prevSubmitId = useRef<string>(generateId());
  const prevSubmitTime = useRef<Date>(new Date());
  const prevSubmitTimeout = useRef<number | undefined>(undefined);
  const SUBMIT_PREVIEW_THRESHOLD = 300;

  return (messageVariables, justTyping) => {
    const isNewMessage = prevSubmitId.current !== messageVariables.messageId;
    if (isNewMessage) {
      prevSubmitId.current = messageVariables.messageId;
      prevSubmitTime.current = new Date();
    }
    window.clearTimeout(prevSubmitTimeout.current);
    const variables: SubmitPreviewVariables = {
      ...messageVariables,
      startTime: prevSubmitTime.current,
      justTyping,
      messageText: justTyping ? '' : messageVariables.messageText,
    };
    prevSubmitTimeout.current = window.setTimeout(() => {
      submitPreview({ variables }).catch(console.error);
    }, SUBMIT_PREVIEW_THRESHOLD);
  };
};

const useSubscribePreview = (
  channelId: string,
  newMessages: OrderedMap<string, Message>
): OrderedMap<string, PreviewMessage> => {
  const { loading, data, error } = useSubscription<{ messagePreview?: PreviewMessage }>(SUBSCRIPT_PREVIEW_MESSAGE);
  const previewList = useRef<OrderedMap<string, PreviewMessage>>(OrderedMap());

  if (loading || error || !data || !data.messagePreview) {
    return previewList.current;
  }
  const newPreview: PreviewMessage = data.messagePreview;
  if (newPreview.channelId !== channelId) {
    return previewList.current;
  }

  const oldPreview = previewList.current.get(newPreview.id, null);
  if (!oldPreview || oldPreview.updateTime !== newPreview.updateTime) {
    previewList.current = previewList.current.set(newPreview.id, newPreview);
  }
  previewList.current = previewList.current.filter(preview => {
    if (newMessages.has(preview.id)) {
      return false;
    }
    return preview.content.trim().length !== 0 || preview.justTyping;
  });

  return previewList.current;
};

const useNewMessage = (channelId: string): OrderedMap<string, Message> => {
  const { loading, data, error } = useSubscription<{ newMessage?: Message }>(SUBSCRIPT_NEW_MESSAGE);
  const messages = useRef<OrderedMap<string, Message>>(OrderedMap());
  if (loading || error || !data) {
    return messages.current;
  }
  const { newMessage } = data;
  if (!newMessage || newMessage.channelId !== channelId) {
    return messages.current;
  }
  const inMap: boolean = messages.current.has(newMessage.id);
  messages.current = messages.current.set(newMessage.id, newMessage);
  if (!inMap) {
    window.setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 1);
  }
  return messages.current;
};

export const Channel = ({ match }: Props) => {
  const { id } = match.params;
  const { error, loading, data } = useQuery<Data>(CHANNEL, { variables: { id } });
  const classes = useStyles();
  const [messageId, setMessageId] = useState(generateId());
  const [messageText, setMessageText] = useState('');
  const [charName, setCharName] = useState(localStorage.getItem(CHAR_NAME_KEY) || '');
  const [isSendPreview, setIsSendPreview] = useState(true);
  const [isOoc, setIsOoc] = useState(false);
  const deletedIds = useDeletedMessageIds();

  const messageVariables: SendMessageVariables = {
    messageId,
    messageText,
    channelId: id,
    charName,
    isOoc,
  };
  const [sendMessage, sendResult] = useMutation(SEND_MESSAGE, { variables: messageVariables });
  const newMessages = useNewMessage(id);
  const userState = useUserState();
  const submitPreview = useSubmitPreview();
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const previewMessages = useSubscribePreview(id, newMessages);

  if (error || loading || !data || !data.getChannelById) {
    return null;
  }
  const channel = data.getChannelById;

  const messageMapper = (message: Message) => {
    if (deletedIds.contains(message.id)) {
      return null;
    }
    return <MessageItem key={message.id} message={message} />;
  };

  const previewMessageMapper = (preview: PreviewMessage) => <PreviewMessageItem key={preview.id} preview={preview} />;

  const handleMessageText: ChangeEventHandler<HTMLTextAreaElement> = e => {
    const content = e.currentTarget.value;
    setMessageText(content);
    submitPreview({ ...messageVariables, messageText: content }, !isSendPreview);
  };

  const handleCharName: ChangeEventHandler<HTMLInputElement> = e => {
    const newCharName = e.currentTarget.value;
    setCharName(newCharName);
    localStorage.setItem(CHAR_NAME_KEY, newCharName);
  };

  const handleSubmit: FormEventHandler = async e => {
    e.preventDefault();

    setMessageId(generateId());
    await sendMessage();
    setMessageText('');
    setIsOoc(false);
    const input = messageInputRef.current;
    if (input !== null) {
      input.focus();
    }
  };

  const handleTogglePreview = () => setIsSendPreview(!isSendPreview);
  const handleToggleOoc = () => setIsOoc(!isOoc);

  const togglePreviewSwitch = (
    <Switch checked={isSendPreview} onChange={handleTogglePreview} value="isSendPreview" color="primary" />
  );
  const toggleOocSwitch = <Switch checked={isOoc} onChange={handleToggleOoc} value="isOoc" color="primary" />;

  const canSend = isLoggedIn(userState) && !sendResult.loading && charName.trim() !== '';
  return (
    <Container>
      <Paper className={classes.paper}>
        <Typography component="h1" variant="h5">
          {channel.title}
        </Typography>
        <ItemList>
          {channel.messages.map(messageMapper)}
          {newMessages.toList().map(messageMapper)}
          {previewMessages.toList().map(previewMessageMapper)}
        </ItemList>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid container item md={12} sm={12} xs={12}>
              <Grid item md={3} sm={4} xs={4}>
                <TextField
                  required
                  label="Character Name"
                  value={charName}
                  onChange={handleCharName}
                  disabled={!isLoggedIn(userState)}
                />
              </Grid>
              <Grid item md={7} sm={6} xs={6}>
                <FormControlLabel control={togglePreviewSwitch} label="Realtime Preview" />
                <FormControlLabel control={toggleOocSwitch} label="OOC" />
              </Grid>
              <Grid item md={2} sm={2} xs={2}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  type="submit"
                  href=""
                  disabled={!canSend || messageText.trim().length === 0}
                >
                  Send
                  <Icon className={classes.rightIcon}>send</Icon>
                </Button>
              </Grid>
            </Grid>
            <Grid item md={12} sm={12} xs={12}>
              <TextField
                fullWidth
                multiline
                autoFocus
                required
                inputRef={messageInputRef}
                onChange={handleMessageText}
                value={messageText}
                error={!!error}
                disabled={!canSend}
              />
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};
