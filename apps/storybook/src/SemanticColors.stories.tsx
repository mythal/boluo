import { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

type SemanticTokenGroup =
  | { title: string; tokens: readonly string[] }
  | { title: string; sections: ReadonlyArray<{ title: string; tokens: readonly string[] }> };

const semanticGroups: SemanticTokenGroup[] = [
  {
    title: 'Surfaces',
    tokens: [
      '--color-surface-default',
      '--color-surface-muted',
      '--color-surface-raised',
      '--color-surface-inverted',
      '--color-surface-floating',
      '--color-surface-interactive-hover',
      '--color-surface-interactive-active',
      '--color-surface-selectable-default',
      '--color-surface-selectable-hover',
      '--color-surface-selectable-selected',
    ],
  },
  {
    title: 'Typography',
    tokens: [
      '--color-text-primary',
      '--color-text-secondary',
      '--color-text-muted',
      '--color-text-subtle',
      '--color-text-inverted',
      '--color-text-on-floating',
      '--color-text-link',
      '--color-text-link-hover',
      '--color-text-link-active',
      '--color-text-link-decoration',
    ],
  },
  {
    title: 'Borders & Dividers',
    tokens: [
      '--color-border-default',
      '--color-border-strong',
      '--color-border-subtle',
      '--color-border-focus',
      '--color-border-raised',
    ],
  },
  {
    title: 'Interactive Controls',
    sections: [
      {
        title: 'Primary Action',
        tokens: [
          '--color-action-primary-bg',
          '--color-action-primary-text',
          '--color-action-primary-bg-hover',
          '--color-action-primary-bg-active',
          '--color-action-primary-bg-disabled',
          '--color-action-primary-text-disabled',
        ],
      },
      {
        title: 'Secondary Action',
        tokens: [
          '--color-action-secondary-bg',
          '--color-action-secondary-text',
          '--color-action-secondary-bg-hover',
          '--color-action-secondary-bg-active',
          '--color-action-secondary-bg-disabled',
          '--color-action-outline-border',
        ],
      },
      {
        title: 'Danger Action',
        tokens: [
          '--color-action-danger-bg',
          '--color-action-danger-bg-hover',
          '--color-action-danger-bg-active',
          '--color-action-danger-text',
        ],
      },
      {
        title: 'Inline & Toggle',
        tokens: [
          '--color-action-inline-bg',
          '--color-action-toggle-bg',
          '--color-action-toggle-bg-hover',
          '--color-action-toggle-bg-active',
          '--color-action-toggle-text',
          '--color-action-toggle-disabled-bg',
          '--color-action-toggle-disabled-text',
          '--color-action-toggle-selected-bg',
          '--color-action-toggle-indicator-on',
          '--color-action-toggle-indicator-off',
          '--color-action-toggle-icon',
        ],
      },
    ],
  },
  {
    title: 'Status Messaging',
    tokens: [
      '--color-state-success-text',
      '--color-state-warning-bg',
      '--color-state-warning-text',
      '--color-state-danger-bg',
      '--color-state-danger-text',
      '--color-state-info-bg',
      '--color-state-warning-border',
      '--color-state-danger-border',
    ],
  },
  {
    title: 'Elevation & Brand',
    tokens: [
      '--color-elevation-raised-shadow',
      '--color-brand-strong',
      '--color-backdrop',
      '--color-ring',
    ],
  },
  {
    title: 'Component Tokens',
    tokens: [
      '--color-surface-tooltip',
      '--color-tooltip-text',
      '--color-presence-online-indicator-bg',
      '--color-presence-online-indicator-border',
      '--color-presence-online-text',
      '--color-entity-fate-dice-bg',
      '--color-entity-fate-dice-border',
    ],
  },
  {
    title: 'Application Surfaces',
    sections: [
      {
        title: 'Backgrounds',
        tokens: ['--color-bg', '--color-light-bg', '--color-dark-bg', '--color-message-inGame-bg'],
      },
      {
        title: 'Connection States',
        tokens: ['--color-connect-other', '--color-connect-success'],
      },
      {
        title: 'Keyboard',
        tokens: ['--color-kbd-bg', '--color-kbd-shadow', '--color-kbd-text'],
      },
      {
        title: 'Name Surfaces',
        tokens: ['--color-name-bg', '--color-name-editable-hover'],
      },
      {
        title: 'Pane',
        tokens: ['--color-pane-bg', '--color-pane-header-bg', '--color-pane-header-border'],
      },
      {
        title: 'Sidebar Placeholders',
        tokens: [
          '--color-sidebar-channels-placeholder-random1',
          '--color-sidebar-channels-placeholder-random2',
          '--color-sidebar-channels-placeholder-random3',
        ],
      },
      {
        title: 'Themes',
        tokens: ['--color-theme-dark', '--color-theme-light', '--color-theme-system'],
      },
    ],
  },
];

const formatTokenLabel = (token: string) =>
  token
    .replace('--color-', '')
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const ColorSwatch = ({ token, theme }: { token: string; theme: 'light' | 'dark' }) => {
  const chipRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<number | null>(null);
  const [computedValue, setComputedValue] = useState('');
  const [copied, setCopied] = useState(false);
  const tokenWithoutPrefix = token.replace(/^--color-/, '');

  useEffect(() => {
    const swatch = chipRef.current;
    if (!swatch) return;

    const updateValue = () => {
      const value = getComputedStyle(swatch).getPropertyValue('background-color').trim();
      setComputedValue(value);
    };

    updateValue();
  }, [token, theme]);

  useEffect(
    () => () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    },
    [],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tokenWithoutPrefix);
      setCopied(true);
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Failed to copy token', error);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] shadow-sm">
      <div
        className="h-16"
        style={{
          backgroundImage:
            'linear-gradient(45deg, rgba(0,0,0,0.08) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.08) 75%), linear-gradient(45deg, rgba(0,0,0,0.08) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.08) 75%)',
          backgroundPosition: '0 0, 0.5rem 0.5rem',
          backgroundSize: '1rem 1rem',
        }}
      >
        <div ref={chipRef} className="h-full w-full" style={{ backgroundColor: `var(${token})` }} />
      </div>
      <div className="relative flex flex-col gap-1 px-3 py-2 text-xs text-[var(--color-text-muted)]">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {formatTokenLabel(token)}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="w-fit rounded bg-transparent py-0.5 text-left font-mono text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:outline-none"
        >
          {tokenWithoutPrefix}
        </button>
        {copied && <span className="absolute text-[var(--color-text-secondary)]">Copied</span>}
        {computedValue && (
          <span className="text-[var(--color-text-secondary)]">{computedValue}</span>
        )}
      </div>
    </div>
  );
};

const SemanticColorPalette = ({ theme = 'light' }: { theme: 'light' | 'dark' }) => (
  <div className={theme === 'dark' ? 'dark' : undefined} data-theme={theme}>
    <div className="min-h-screen space-y-8 bg-[var(--color-surface-default)] p-6 text-[var(--color-text-primary)]">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Semantic Color Palette</h1>
        <p className="max-w-3xl text-sm text-[var(--color-text-secondary)]">
          The tokens below are sourced from the shared Tailwind semantic color definitions. Switch
          the Storybook controls to preview how each token resolves under the light and dark themes.
        </p>
      </header>
      <div className="space-y-10">
        {semanticGroups.map((group) => (
          <section key={group.title} className="space-y-4">
            <h2 className="text-lg font-semibold">{group.title}</h2>
            {'tokens' in group ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.tokens.map((token) => (
                  <ColorSwatch key={token} token={token} theme={theme} />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {group.sections.map((section) => (
                  <div key={section.title} className="space-y-3">
                    <h3 className="text-base font-semibold">{section.title}</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {section.tokens.map((token) => (
                        <ColorSwatch key={token} token={token} theme={theme} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  </div>
);

const meta = {
  title: 'Design Tokens/Semantic Colors',
  component: SemanticColorPalette,
  parameters: { layout: 'fullscreen' },
  args: { theme: 'light' as const },
  argTypes: {
    theme: {
      options: ['light', 'dark'],
      control: { type: 'radio' },
    },
  },
} satisfies Meta<typeof SemanticColorPalette>;

export default meta;

type Story = StoryObj<typeof SemanticColorPalette>;

export const LightTheme: Story = {};

export const DarkTheme: Story = { args: { theme: 'dark' } };
