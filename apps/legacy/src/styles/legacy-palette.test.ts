import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { darken, lighten, mix, transparentize } from 'polished';
import {
  bgColor,
  black,
  blue,
  buttonColor,
  buttonDangerColor,
  buttonDarkColor,
  buttonPrimaryColor,
  chatSidebarColor,
  closeButtonActiveColor,
  closeButtonHoverColor,
  dangerColor,
  dialogBgColor,
  dialogShadowColor,
  dialogTitleColor,
  errorColor,
  focusOutlineColor,
  gray,
  green,
  headerBgColor,
  informationErrorColor,
  informationInfoColor,
  informationSuccessColor,
  informationWarnColor,
  inputBgColor,
  lineColor,
  linkColor,
  menuBgColor,
  menuItemHoverColor,
  menuShadowColor,
  minorTextColor,
  modalMaskColor,
  primary,
  primaryColor,
  purple,
  red,
  sidebarItemActiveBgColor,
  sidebarItemColor,
  sidebarItemHoverBgColor,
  textColor,
  transparent,
  uiShadowColor,
  white,
} from './colors';

const normalizeColor = (value: string) => value.toLowerCase().replace(/\s/g, '');

const css = readFileSync(new URL('../tailwind.css', import.meta.url), 'utf8');
const actual = new Map(
  [...css.matchAll(/--color-(legacy-[\w-]+):\s*([^;]+);/g)].map((match) => [
    match[1],
    normalizeColor(match[2]),
  ]),
);

const expected = new Map<string, string>();
const add = (name: string, value: string) => expected.set(`legacy-${name}`, normalizeColor(value));
const addScale = (name: string, scale: Record<string, string>) => {
  for (const [step, value] of Object.entries(scale)) add(`${name}-${step}`, value);
};

add('black', black);
add('white', white);
addScale('gray', gray);
addScale('red', red);
addScale('blue', blue);
addScale('primary', primary);
addScale('green', green);
addScale('purple', purple);
addScale('transparent', transparent);

const semanticColors = {
  background: bgColor,
  text: textColor,
  'text-minor': minorTextColor,
  'ui-shadow': uiShadowColor,
  error: errorColor,
  line: lineColor,
  'brand-primary': primaryColor,
  danger: dangerColor,
  link: linkColor,
  'close-hover': closeButtonHoverColor,
  'close-active': closeButtonActiveColor,
  'modal-mask': modalMaskColor,
  'dialog-background': dialogBgColor,
  'dialog-title': dialogTitleColor,
  'dialog-shadow': dialogShadowColor,
  button: buttonColor,
  'button-primary': buttonPrimaryColor,
  'button-danger': buttonDangerColor,
  'button-dark': buttonDarkColor,
  'information-info': informationInfoColor,
  'information-warn': informationWarnColor,
  'information-error': informationErrorColor,
  'information-success': informationSuccessColor,
  'header-background': headerBgColor,
  'focus-outline': focusOutlineColor,
  'chat-sidebar': chatSidebarColor,
  'input-background': inputBgColor,
  'menu-background': menuBgColor,
  'menu-shadow': menuShadowColor,
  'menu-item-hover': menuItemHoverColor,
  'sidebar-item': sidebarItemColor,
  'sidebar-item-hover-background': sidebarItemHoverBgColor,
  'sidebar-item-active-background': sidebarItemActiveBgColor,
};
for (const [name, value] of Object.entries(semanticColors)) add(name, value);

const derivedColors = {
  'link-hover': lighten(0.1, linkColor),
  'outline-primary-border': lighten(0.075, primaryColor),
  'select-primary-75': darken(0.3, primaryColor),
  'select-primary-50': darken(0.25, primaryColor),
  'select-primary-25': darken(0.2, primaryColor),
  'select-neutral-5': mix(0.9, bgColor, textColor),
  'select-neutral-10': mix(0.8, bgColor, textColor),
  'select-neutral-20': mix(0.7, bgColor, textColor),
  'select-neutral-30': mix(0.6, bgColor, textColor),
  'select-neutral-40': mix(0.5, bgColor, textColor),
  'select-neutral-50': mix(0.4, bgColor, textColor),
  'select-neutral-60': mix(0.3, bgColor, textColor),
  'select-neutral-70': mix(0.2, bgColor, textColor),
  'select-neutral-80': mix(0.1, bgColor, textColor),
  'compose-input-background': darken(0.05, bgColor),
  'compose-input-border': lighten(0.2, bgColor),
  'compose-input-border-hover': lighten(0.3, bgColor),
  'compose-input-border-focus': lighten(0.4, bgColor),
  'menu-item-active': darken(0.15, menuItemHoverColor),
  'new-space-background': lighten(0.025, bgColor),
  'card-background': lighten(0.05, bgColor),
  'card-hover': lighten(0.1, bgColor),
  'member-card-background': darken(0.1, bgColor),
  'error-text': lighten(0.5, errorColor),
  'header-hover': darken(0.05, headerBgColor),
  'header-active': darken(0.1, headerBgColor),
  'header-deep': darken(0.15, headerBgColor),
  'chat-item-background': gray['800'],
  'chat-item-hover': darken(0.05, gray['800']),
  'chat-item-out-background': bgColor,
  'chat-item-out-hover': darken(0.015, bgColor),
  'preview-in-stripe': darken(0.15, gray['800']),
  'preview-out-stripe': darken(0.15, bgColor),
  'sidebar-border': darken(0.04, chatSidebarColor),
  'connection-background': transparentize(0.6, green['500']),
  'connection-hover': transparentize(0.5, green['500']),
  'chat-toolbar-text': darken(0.35, textColor),
  'item-move-handle': darken(0.6, textColor),
  'expression-background': darken(0.7, textColor),
  'expression-hover': darken(0.65, textColor),
  'expression-border': darken(0.5, textColor),
  'compose-background': darken(0.05, blue['900']),
  'information-info-border': lighten(0.15, informationInfoColor),
  'information-info-hover': lighten(0.3, informationInfoColor),
  'information-warn-border': lighten(0.15, informationWarnColor),
  'information-warn-hover': lighten(0.3, informationWarnColor),
  'information-error-border': lighten(0.15, informationErrorColor),
  'information-error-hover': lighten(0.3, informationErrorColor),
  'information-success-border': lighten(0.15, informationSuccessColor),
  'information-success-hover': lighten(0.3, informationSuccessColor),
  'ui-shadow-muted': transparentize(0.6, uiShadowColor),
  'button-shadow': 'rgba(0, 0, 0, 0.2)',
  'button-focus': 'rgba(255, 255, 255, 0.3)',
  'outline-background': 'rgba(255, 255, 255, 0.05)',
  'outline-border': 'rgba(255, 255, 255, 0.2)',
  'outline-active': 'rgba(255, 255, 255, 0.1)',
};
for (const [name, value] of Object.entries(derivedColors)) add(name, value);

test('Tailwind exposes only the exact legacy color contract', () => {
  assert.match(css, /--color-\*:\s*initial;/);
  assert.deepEqual(actual, expected);
});

test('Tailwind keeps Preflight disabled during the legacy migration', () => {
  assert.match(css, /@import 'tailwindcss\/theme\.css' layer\(theme\);/);
  assert.match(css, /@import 'tailwindcss\/utilities\.css' layer\(utilities\);/);
  assert.doesNotMatch(css, /@import 'tailwindcss\/preflight\.css'/);
  assert.doesNotMatch(css, /@import 'tailwindcss';/);
});
