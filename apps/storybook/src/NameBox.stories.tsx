import type { Meta, StoryObj } from '@storybook/react-vite';
import { NameBox } from '@boluo/ui/chat/NameBox';
import Gamemaster from '@boluo/icons/Gamemaster';
import ChevronDown from '@boluo/icons/ChevronDown';
import Icon from '@boluo/ui/Icon';
import type { ResolvedTheme } from '@boluo/types';

const meta: Meta<typeof NameBox> = {
  title: 'Chat/NameBox',
  component: NameBox,
  parameters: {
    layout: 'centered',
  },
  args: {
    color: '#3b82f6',
    theme: 'light',
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
  {
    name: 'Neutral',
    colors: [
      '#555555',
      '#717171',
      '#7D7D7D',
      '#838383',
      '#9E9E9E',
      '#ABABAB',
      '#B1B1B1',
      '#CECECE',
    ],
  },
  {
    name: 'Red',
    colors: [
      '#843C38',
      '#A45953',
      '#B1645F',
      '#B86A64',
      '#D6857F',
      '#E3928B',
      '#EA9891',
      '#FFB4AD',
    ],
  },
  {
    name: 'Yellow',
    colors: [
      '#675400',
      '#847020',
      '#907C2E',
      '#968234',
      '#B29E51',
      '#BEAA5E',
      '#C5B164',
      '#E2CE80',
    ],
  },
  {
    name: 'Green',
    colors: [
      '#2C6330',
      '#49814C',
      '#558D57',
      '#5B935D',
      '#76AF77',
      '#82BC83',
      '#88C28A',
      '#A5E0A5',
    ],
  },
  {
    name: 'Blue',
    colors: [
      '#2B568B',
      '#4773AB',
      '#537FB8',
      '#5985BE',
      '#73A1DC',
      '#7FAEE9',
      '#85B4F0',
      '#A1D1FF',
    ],
  },
  {
    name: 'Purple',
    colors: [
      '#66447E',
      '#83609D',
      '#8F6CAA',
      '#9672B0',
      '#B28DCD',
      '#BE99DA',
      '#C59FE1',
      '#E2BCFF',
    ],
  },
] as const;

interface ColorMatrixProps {
  background: 'in-game' | 'out-of-game';
  theme: ResolvedTheme;
}

const ColorMatrix = ({ background, theme }: ColorMatrixProps) => {
  const inGame = background === 'in-game';

  return (
    <section>
      <h2 className="mb-2 text-lg font-bold">
        {inGame ? 'In-game message background' : 'Out-of-game message background'}
      </h2>
      <p className="text-text-secondary mb-3 text-sm">
        Hover the table for the message hover state, or a name for its interactive state.
      </p>
      <div className="border-border-subtle overflow-x-auto rounded-lg border">
        <div
          className={
            inGame
              ? 'group/msg bg-message-in-game-bg hover:bg-message-in-game-bg-hover p-4'
              : 'group/msg bg-message-out-of-game-bg hover:bg-message-out-of-game-bg-hover p-4'
          }
        >
          <div className="grid w-max grid-cols-[4rem_repeat(6,8rem)] items-center gap-2">
            <span className="text-text-muted text-xs">OKLCH L</span>
            {colorFamilies.map(({ name }) => (
              <span key={name} className="text-text-secondary text-center text-xs font-bold">
                {name}
              </span>
            ))}
            {lightnessSteps.map((lightness, lightnessIndex) => (
              <div key={lightness} className="contents">
                <span className="text-text-secondary text-sm font-bold">{lightness}%</span>
                {colorFamilies.map(({ name, colors }) => {
                  const color = colors[lightnessIndex];
                  if (color == null) return null;
                  return (
                    <NameBox
                      key={name}
                      color={color}
                      theme={theme}
                      inGame={inGame}
                      interactive
                      title={color}
                    >
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
  render: (_, context) => {
    const selectedTheme = context.globals.theme;
    const theme: ResolvedTheme =
      selectedTheme === 'dark' || selectedTheme === 'graphite' || selectedTheme === 'dusha'
        ? selectedTheme
        : 'light';
    return (
      <main className="bg-pane-bg text-text-primary min-h-screen space-y-8 p-8">
        <header className="max-w-3xl">
          <h1 className="mb-2 text-xl font-bold">Name stroke contrast matrix</h1>
          <p className="text-text-secondary text-sm">
            Every row has the same OKLCH lightness and varies only in hue and chroma. A solid 3px
            stroke appears below 2.2:1 contrast. Switch themes from the Storybook toolbar to compare
            all four themes.
          </p>
        </header>
        <ColorMatrix background="out-of-game" theme={theme} />
        <ColorMatrix background="in-game" theme={theme} />
      </main>
    );
  },
};
