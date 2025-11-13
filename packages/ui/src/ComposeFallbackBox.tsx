import { type ReactNode, type FC } from 'react';

interface Props {
  description: ReactNode;
  source?: string | undefined | null;
}

export const ComposeFallbackBox: FC<Props> = ({ description, source }) => {
  const descriptionOnly = !source;
  return (
    <div className="ComposeFallbackBox bg-surface-default border-border-subtle border-t p-2 text-sm">
      {descriptionOnly ? null : <div className="text-text-secondary pb-1">{description}</div>}
      <div className="bg-surface-raised border-border-default w-full rounded-sm border">
        {descriptionOnly ? (
          <div className="p-2 text-center">{description}</div>
        ) : (
          <input className="h-full w-full p-2 font-mono whitespace-pre" readOnly value={source} />
        )}
      </div>
    </div>
  );
};
