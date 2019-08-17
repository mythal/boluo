import React, { ChangeEventHandler, FormEventHandler, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { useMutation, useQuery } from '@apollo/react-hooks';
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
  mutation sendMessage($messageId: ID!, $channelId: ID!, $messageText: String!) {
    sendMessage(type: SAY, charName: "神明大人", channelId: $channelId, content: $messageText, id: $messageId) {
      id
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

export const Channel = ({ match }: Props) => {
  const { id } = match.params;
  const { error, loading, data } = useQuery<Data>(CHANNEL, { variables: { id } });
  const classes = useStyles();
  const [messageId, setMessageId] = useState(generateId());
  const [messageText, setMessageText] = useState('');
  const [sendMessage, sendResult] = useMutation(SEND_MESSAGE, {
    variables: {
      messageId,
      messageText,
      channelId: id,
    },
  });
  const userState = useUserState();
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

  const handleMessageText: ChangeEventHandler<HTMLTextAreaElement> = e => {
    setMessageText(e.currentTarget.value);
  };

  const handleSubmit: FormEventHandler = async e => {
    e.preventDefault();

    setMessageId(generateId());
    await sendMessage();
  };

  const canSend = isLoggedIn(userState) && !sendResult.loading;

  return (
    <Container maxWidth="md">
      <Paper className={classes.paper}>
        <Typography component="h1" variant="h5">
          {channel.title}
        </Typography>
        <List>{channel.messages.map(messageMapper)}</List>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item md={10} sm={9} xs={8}>
              <TextField
                fullWidth
                multiline
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
