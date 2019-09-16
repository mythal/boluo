import React from 'react';
import gql from 'graphql-tag';
import { useQuery } from '@apollo/react-hooks';
import { Message } from '../Message/Message';
import { MessageView } from '../Message/MessageView';

export interface Props {
  id: string;
}

const CHANNEL = gql`
  query getChannel($id: ID!) {
    getChannelById(id: $id) {
      title
      topic
      created
      modified
      messages {
        id
        text
        created
        senderId
        character
        sender {
          id
          username
          nickname
        }
      }
    }
  }
`;

interface Channel {
  title: string;
  topic: string;
  created: Date;
  modified: Date;
  messages: Message[];
}

export const Channel = ({ id }: Props) => {
  const { error, loading, data } = useQuery<{ getChannelById: Channel }>(CHANNEL, { variables: { id } });
  if (error) {
    return <p>Failed to fetch channel.</p>;
  } else if (loading) {
    return <p>Loading...</p>;
  } else if (data === undefined) {
    return <p>Failure: empty data.</p>;
  }
  const channel = data.getChannelById;
  const messages = channel.messages.map(message => (
    <li key={message.id}>
      <MessageView message={message} />
    </li>
  ));
  return (
    <article className="Channel">
      <h1>{channel.title}</h1>
      <ul>{messages}</ul>
    </article>
  );
};
