import { AVATAR_SYMBOLS, GeneratedAvatar, SymbolAvatar } from '@boluo/avatar';
import { Button } from '@boluo/ui/Button';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';

interface AvatarGalleryProps {
  count: number;
  size: number;
  symbolsOnly: boolean;
}

function createBatchSeed(): string {
  return crypto.randomUUID().slice(0, 8);
}

function getCodePointLabel(symbol: string): string {
  const codePoint = symbol.codePointAt(0);
  return codePoint == null
    ? 'Unknown'
    : `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
}

function AvatarGallery({ count, size, symbolsOnly }: AvatarGalleryProps) {
  const [batchSeed, setBatchSeed] = useState(createBatchSeed);
  const entries = useMemo(
    () =>
      symbolsOnly
        ? AVATAR_SYMBOLS.slice(0, count).map((symbol, index) => ({
            seed: `${batchSeed}-${index + 1}`,
            symbol,
          }))
        : Array.from({ length: count }, (_, index) => ({
            seed: `${batchSeed}-${index + 1}`,
            symbol: undefined,
          })),
    [batchSeed, count, symbolsOnly],
  );

  return (
    <main className="bg-bg text-text min-h-screen p-6">
      <header className="border-border bg-bg sticky top-0 z-10 mb-6 flex flex-wrap items-center gap-3 border-b py-4">
        <div className="mr-auto">
          <h1 className="text-xl font-semibold">
            {symbolsOnly ? 'Generated symbols' : 'Generated avatars'}
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            {entries.length} deterministic avatars from batch seed{' '}
            <code className="font-mono">{batchSeed}</code>
          </p>
        </div>
        <Button variant="primary" onClick={() => setBatchSeed(createBatchSeed())}>
          Roll seeds
        </Button>
      </header>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(size, 80)}px, 1fr))` }}
      >
        {entries.map(({ seed, symbol }) => (
          <figure className="min-w-0" key={seed}>
            <div
              aria-label={`Avatar generated from ${seed}`}
              className="border-border bg-bg-secondary aspect-square w-full border"
              role="img"
            >
              {symbol ? (
                <SymbolAvatar name={seed} size="100%" symbol={symbol} />
              ) : (
                <GeneratedAvatar name={seed} size="100%" />
              )}
            </div>
            <figcaption
              className="text-text-secondary mt-1 truncate font-mono text-xs"
              title={seed}
            >
              {symbol ? `${getCodePointLabel(symbol)} · ${seed}` : seed}
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}

const meta = {
  title: 'Users/Avatar Gallery',
  component: AvatarGallery,
  parameters: { layout: 'fullscreen' },
  args: {
    count: 96,
    size: 96,
    symbolsOnly: false,
  },
  argTypes: {
    count: { control: { type: 'range', min: 12, max: 240, step: 12 } },
    size: { control: { type: 'range', min: 48, max: 192, step: 16 } },
    symbolsOnly: { control: 'boolean' },
  },
} satisfies Meta<typeof AvatarGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {};

export const Symbols: Story = {
  args: {
    count: AVATAR_SYMBOLS.length,
    symbolsOnly: true,
  },
};
