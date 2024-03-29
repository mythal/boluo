import { useMe } from '@boluo/common';

export const Me = () => {
  const me = useMe();
  if (me === null) {
    return <span>Not logged in</span>;
  } else if (me === 'LOADING') {
    return <span>Loading...</span>;
  } else {
    return <span>{me.user.nickname}</span>;
  }
};
