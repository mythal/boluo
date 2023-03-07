import { useMe } from 'common';

export const Me = () => {
  const me = useMe();
  if (me === null) {
    return <span>Not logged in</span>;
  } else {
    return <span>{me.user.nickname}</span>;
  }
};
