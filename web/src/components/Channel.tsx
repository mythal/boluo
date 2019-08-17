import React, { ChangeEventHandler, FormEventHandler, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { useMutation, useQuery, useSubscription } from '@apollo/react-hooks';
import { gql } from 'apollo-boost';
import {
  Button,
  Container,
  createStyles,
  Grid,
  Icon,
  List,
  ListItem,
  makeStyles,
  Paper,
  TextField,
  Theme,
  Typography,
} from '@material-ui/core';
import { isLoggedIn, useUserState } from '../user';

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

const SUBSCRIPT_NEW_MESSAGE = gql`
  subscription {
    newMessage {
      id
      content
      created
      charName
      user {
        nickname
      }
    }
  }
`;

interface User {
  nickname: string;
}

interface Message {
  id: string;
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
  })
);

const newMessages: Message[] = [];

export const Channel = ({ match }: Props) => {
  const { id } = match.params;
  const { error, loading, data } = useQuery<Data>(CHANNEL, { variables: { id } });
  const classes = useStyles();
  const [messageId, setMessageId] = useState(generateId());
  const [messageText, setMessageText] = useState('');
  const [charName, setCharName] = useState('');
  const [sendMessage, sendResult] = useMutation(SEND_MESSAGE, {
    variables: {
      messageId,
      messageText,
      channelId: id,
      charName,
    },
  });
  const subscriptionResult = useSubscription<{ newMessage?: Message }>(SUBSCRIPT_NEW_MESSAGE);
  const userState = useUserState();
  if (error || loading || !data || !data.getChannelById) {
    return null;
  }
  const channel = data.getChannelById;

  if (!subscriptionResult.loading && subscriptionResult.data && subscriptionResult.data.newMessage) {
    const newMessage = subscriptionResult.data.newMessage;
    const peekMessage: Message | undefined = newMessages.pop();
    if (peekMessage) {
      newMessages.push(peekMessage);
    }
    if (!peekMessage || peekMessage.id !== newMessage.id) {
      newMessages.push(newMessage);
      setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 100);
    }
  }

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

  const handleMessageText: ChangeEventHandler<HTMLTextAreaElement> = e => {
    setMessageText(e.currentTarget.value);
  };

  const handleCharName: ChangeEventHandler<HTMLInputElement> = e => {
    setCharName(e.currentTarget.value);
  };

  const handleSubmit: FormEventHandler = async e => {
    e.preventDefault();

    setMessageId(generateId());
    await sendMessage();
    setMessageText('');
  };

  const canSend = isLoggedIn(userState) && !sendResult.loading;

  return (
    <Container maxWidth="md">
      <Paper className={classes.paper}>
        <Typography component="h1" variant="h5">
          {channel.title}
        </Typography>
        <List>{channel.messages.concat(newMessages).map(messageMapper)}</List>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid container item md={12} sm={12} xs={12}>
              <Grid item md={4} sm={5} xs={6}>
                <TextField required label="Character Name" onChange={handleCharName} />
              </Grid>
            </Grid>
            <Grid item md={10} sm={9} xs={8}>
              <TextField
                fullWidth
                multiline
                required
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
