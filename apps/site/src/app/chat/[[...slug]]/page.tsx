import { isUuid } from '../../../helper/id';
import type { ChatRoute } from './ChatPage';
import { ChatPage } from './ChatPage';
import '../../../chat.css';

interface Params {
  slug: string[];
}

interface Props {
  params: Params;
}

export default function Page({ params: { slug } }: Props) {
  let route: ChatRoute = { type: 'NOT_FOUND' };
  if (slug.length === 0) {
    route = { type: 'ROOT' };
  } else if (slug[0] === 'space') {
    const spaceId = slug[1];
    if (isUuid(spaceId)) {
      route = { type: 'SPACE', spaceId };
    }
  }
  return <ChatPage route={route} />;
}
