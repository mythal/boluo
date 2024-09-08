import { type ReactNode, type FC } from 'react';

interface Props {
  description: ReactNode;
  source?: string | undefined | null;
}

export const ComposeFallbackBox: FC<Props> = ({ description, source }) => {
  const descriptionOnly = !source;
  return (
    <div className="bg-compose-outer-bg border-t p-2 text-sm">
      {descriptionOnly ? null : <div className="text-text-light pb-1">{description}</div>}
      <div className="bg-compose-bg border-compose-border w-full rounded-sm border">
        {descriptionOnly ? (
          <div className="p-2 text-center">{description}</div>
        ) : (
          <input className="h-full w-full whitespace-pre p-2 font-mono" readOnly value={source} />
        )}
      </div>
    </div>
  );
};
