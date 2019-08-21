import React, { ChangeEventHandler, FormEventHandler, useRef, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { useMutation, useQuery, useSubscription } from '@apollo/react-hooks';
import { gql } from 'apollo-boost';
import {
  Button,
  Container,
  createStyles,
  Grid,
  Icon,
  List as ItemList,
  ListItem,
  makeStyles,
  Paper,
  TextField,
  Theme,
  Typography,
} from '@material-ui/core';
import { isLoggedIn, useUserState } from '../user';
import { List } from 'immutable';
import { CHAR_NAME_KEY } from '../settings';

const generateId = require('uuid/v1');

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
        charName
        user {
          nickname
        }
      }
    }
  }
`;

const SEND_MESSAGE = gql`
  mutation sendMessage($messageId: ID!, $charName: String!, $channelId: ID!, $messageText: String!) {
    sendMessage(type: SAY, charName: $charName, channelId: $channelId, content: $messageText, id: $messageId) {
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
  ) {
    updatePreviewMessage(
      type: SAY
      charName: $charName
      channelId: $channelId
      content: $messageText
      id: $messageId
      startTime: $startTime
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
    }
  }
`;

interface PreviewMessage {
  id: string;
  content: string;
  charName: string;
  channelId: string;
  startTime: string;
  updateTime: string;
}

interface User {
  nickname: string;
}

interface Message {
  id: string;
  channelId: string;
  content: string;
  created: Date;
  charName: string;
  user?: User;
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
    preview: {
      backgroundColor: '#bdd8ff',
    },
  })
);

interface SendMessageVariables {
  messageId: string;
  messageText: string;
  channelId: string;
  charName: string;
}

interface SubmitPreviewVariables extends SendMessageVariables {
  startTime: Date;
}

const useSubmitPreview = (): ((messageVariables: SendMessageVariables) => void) => {
  const [submitPreview] = useMutation<boolean, SubmitPreviewVariables>(SUBMIT_PREVIEW);
  const prevSubmitId = useRef<string>(generateId());
  const prevSubmitTime = useRef<Date>(new Date());
  const prevSubmitTimeout = useRef<number | undefined>(undefined);
  const SUBMIT_PREVIEW_THRESHOLD = 300;

  return messageVariables => {
    const isNewMessage = prevSubmitId.current !== messageVariables.messageId;
    if (isNewMessage) {
      prevSubmitId.current = messageVariables.messageId;
      prevSubmitTime.current = new Date();
    }
    window.clearTimeout(prevSubmitTimeout.current);
    const variables: SubmitPreviewVariables = { ...messageVariables, startTime: prevSubmitTime.current };
    prevSubmitTimeout.current = window.setTimeout(() => {
      submitPreview({ variables }).catch(console.error);
    }, SUBMIT_PREVIEW_THRESHOLD);
  };
};

const useSubscribePreview = (channelId: string, newMessages: Message[]): List<PreviewMessage> => {
  const { loading, data, error } = useSubscription<{ messagePreview?: PreviewMessage }>(SUBSCRIPT_PREVIEW_MESSAGE);
  const [previewList, setPreviewList] = useState<List<PreviewMessage>>(List());

  if (loading || error || !data || !data.messagePreview) {
    return previewList;
  }
  const newPreview: PreviewMessage = data.messagePreview;
  if (newPreview.channelId !== channelId) {
    return previewList;
  }
  let nextList = previewList;
  let isUpdate = false;
  for (let i = 0; i < previewList.size; i++) {
    const preview = previewList.get(i);
    if (preview && preview.id === newPreview.id) {
      nextList = nextList.set(i, newPreview);
      isUpdate = true;
    }
  }
  if (!isUpdate) {
    nextList = nextList.push(newPreview).sortBy(x => x.startTime);
  }
  nextList = nextList.filter(preview => {
    for (const newMessage of newMessages) {
      if (newMessage.id === preview.id) {
        return false;
      }
    }
    return preview.content.trim().length !== 0;
  });

  if (!nextList.equals(previewList)) {
    setPreviewList(nextList);
  }

  return previewList;
};

const useNewMessage = (channelId: string): Message[] => {
  const { loading, data, error } = useSubscription<{ newMessage?: Message }>(SUBSCRIPT_NEW_MESSAGE);
  const messagesRef = useRef<Message[]>([]);
  const messages = messagesRef.current;
  if (loading || error || !data) {
    return messages;
  }
  const { newMessage } = data;
  if (!newMessage || newMessage.channelId !== channelId) {
    return messages;
  }
  const len = messages.length;
  if (len === 0 || messages[len - 1].id !== newMessage.id) {
    messages.push(newMessage);
    window.setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 1);
  }
  return messages;
};

export const Channel = ({ match }: Props) => {
  const { id } = match.params;
  const { error, loading, data } = useQuery<Data>(CHANNEL, { variables: { id } });
  const classes = useStyles();
  const [messageId, setMessageId] = useState(generateId());
  const [messageText, setMessageText] = useState('');
  const [charName, setCharName] = useState(localStorage.getItem(CHAR_NAME_KEY) || '');

  const messageVariables: SendMessageVariables = {
    messageId,
    messageText,
    channelId: id,
    charName,
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
    let name = 'Anonymous';
    if (message.user) {
      name = message.charName;
    }
    return (
      <ListItem key={message.id}>
        <Typography>
          <strong>{name}: </strong>
          {message.content}
        </Typography>
      </ListItem>
    );
  };

  const now = new Date().getTime();
  const previewMessageMapper = (preview: PreviewMessage) => {
    if (new Date(preview.updateTime).getTime() < now - 5000) {
      return null;
    }
    return (
      <ListItem key={preview.id} className={classes.preview}>
        <Typography>
          <strong>{preview.charName}: </strong>
          {preview.content}
        </Typography>
      </ListItem>
    );
  };

  const handleMessageText: ChangeEventHandler<HTMLTextAreaElement> = e => {
    const content = e.currentTarget.value;
    setMessageText(content);
    submitPreview({ ...messageVariables, messageText: content });
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
    const input = messageInputRef.current;
    if (input !== null) {
      input.focus();
    }
  };

  const canSend = isLoggedIn(userState) && !sendResult.loading && charName.trim() !== '';
  return (
    <Container>
      <Paper className={classes.paper}>
        <Typography component="h1" variant="h5">
          {channel.title}
        </Typography>
        <ItemList>
          {channel.messages.concat(newMessages).map(messageMapper)}
          {previewMessages.map(previewMessageMapper)}
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
            </Grid>
            <Grid item md={10} sm={9} xs={8}>
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
            <Grid item md={2} sm={3} xs={4}>
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
        </form>
      </Paper>
    </Container>
  );
};
