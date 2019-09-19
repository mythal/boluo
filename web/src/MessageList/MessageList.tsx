import React from 'react';
import { useGetMe } from '../user';
import { Message } from '../Message/Message';
import { MessageView } from '../Message/MessageView';
import gql from 'graphql-tag';
import { useMutation } from '@apollo/react-hooks';
import { Id } from '../Channel/Channel';

export interface Props {
  messages: Message[];
}

const DELETE_MESSAGE = gql`
  mutation deleteMessage($id: ID!) {
    deleteMessage(messageId: $id)
  }
`;

export const MessageList = ({ messages }: Props) => {
  const [deleteMessage] = useMutation<boolean, Id>(DELETE_MESSAGE);
  const userState = useGetMe();
  const user = userState.type === 'LOGGED_IN' ? userState.user : undefined;
  const messageList = messages.map(message => {
    const id = message.id;
    const remove = () => deleteMessage({ variables: { id } });
    return <MessageView key={id} message={message} user={user} remove={remove} />;
  });
  return <div className="MessageList">{messageList}</div>;
};
