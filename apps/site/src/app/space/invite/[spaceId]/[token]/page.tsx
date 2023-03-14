import { Button } from 'ui/Button';
import { get } from '../../../../../api/server';
import { AcceptButton } from './AcceptButton';

interface Params {
  spaceId: string;
  token: string;
}

interface Props {
  params: Params;
}

export default async function Page({ params: { spaceId, token } }: Props) {
  const spaceResult = await get('/spaces/query', { id: spaceId });
  const space = spaceResult.unwrap();
  return (
    <div className="p-4">
      <div className="text-xl">
        You have been invited to <span className="font-bold">{space.name}</span>
      </div>
      <div className="mt-4 space-x-2">
        <AcceptButton spaceId={spaceId} token={token} />
      </div>
    </div>
  );
}
