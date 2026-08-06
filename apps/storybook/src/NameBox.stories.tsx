import type { Meta, StoryObj } from '@storybook/react-vite';
import { NameBox } from '@boluo/ui/chat/NameBox';
import Gamemaster from '@boluo/icons/Gamemaster';
import ChevronDown from '@boluo/icons/ChevronDown';
import Icon from '@boluo/ui/Icon';

const meta: Meta<typeof NameBox> = {
  title: 'Chat/NameBox',
  component: NameBox,
  parameters: {
    layout: 'centered',
  },
  args: {
    color: '#3b82f6',
    children: 'Iroha',
  },
};

export default meta;
type Story = StoryObj<typeof NameBox>;

const gmIcon = <Icon icon={Gamemaster} className="inline-block h-[1em] w-[1em]" />;
const chevronIcon = (
  <Icon icon={ChevronDown} className="text-text-muted inline-block h-[1em] w-[1em]" />
);

export const Basic: Story = {};

export const WithIcon: Story = {
  args: {
    icon: gmIcon,
    color: '#f97316',
  },
};

export const Interactive: Story = {
  args: {
    interactive: true,
    icon: chevronIcon,
  },
};

export const Pressed: Story = {
  args: {
    interactive: true,
    pressed: true,
    icon: chevronIcon,
    children: 'Editing Name',
  },
};

const lightnessSteps = [45, 55, 59, 61, 70, 74, 76, 85] as const;

const colorFamilies = [
  { name: 'Neutral', chroma: 0, hue: 0 },
  { name: 'Red', chroma: 0.18, hue: 25 },
  { name: 'Yellow', chroma: 0.16, hue: 95 },
  { name: 'Green', chroma: 0.16, hue: 145 },
  { name: 'Blue', chroma: 0.18, hue: 255 },
  { name: 'Purple', chroma: 0.18, hue: 310 },
] as const;

interface ColorMatrixProps {
  background: 'in-game' | 'out-of-game';
}

const ColorMatrix = ({ background }: ColorMatrixProps) => {
  const inGame = background === 'in-game';

  return (
    <section>
      <h2 className="mb-2 text-lg font-bold">
        {inGame ? 'In-game message background' : 'Out-of-game message background'}
      </h2>
      <p className="text-text-secondary mb-3 text-sm">
        Hover the table to inspect the corresponding hover background.
      </p>
      <div className="border-border-subtle overflow-x-auto rounded-lg border">
        <div
          className={
            inGame
              ? 'bg-message-in-game-bg hover:bg-message-in-game-bg-hover p-4'
              : 'bg-message-out-of-game-bg hover:bg-message-out-of-game-bg-hover p-4'
          }
        >
          <div className="grid w-max grid-cols-[4rem_repeat(6,8rem)] items-center gap-2">
            <span className="text-text-muted text-xs">OKLCH L</span>
            {colorFamilies.map(({ name }) => (
              <span key={name} className="text-text-secondary text-center text-xs font-bold">
                {name}
              </span>
            ))}
            {lightnessSteps.map((lightness) => (
              <div key={lightness} className="contents">
                <span className="text-text-secondary text-sm font-bold">{lightness}%</span>
                {colorFamilies.map(({ name, chroma, hue }) => {
                  const color = `oklch(${lightness}% ${chroma} ${hue})`;
                  return (
                    <NameBox key={name} color={color} title={color}>
                      {name}
                    </NameBox>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export const CurrentContrastMatrix: Story = {
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
  render: () => (
    <main className="bg-pane-bg text-text-primary min-h-screen space-y-8 p-8">
      <header className="max-w-3xl">
        <h1 className="mb-2 text-xl font-bold">Current name stroke behavior</h1>
        <p className="text-text-secondary text-sm">
          Every row has the same OKLCH lightness and varies only in hue and chroma. The current CSS
          adds a black stroke above 75% in light mode and a white stroke below 60% in dark mode.
          Switch themes from the Storybook toolbar to compare all four themes.
        </p>
      </header>
      <ColorMatrix background="out-of-game" />
      <ColorMatrix background="in-game" />
    </main>
  ),
};
