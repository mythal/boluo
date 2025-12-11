import { useEffect } from 'react';
import type { Settings } from '@boluo/settings';

const STYLE_ID = 'custom-theme-overrides';
const wrapCss = (css: string): string => {
  const trimmed = css.trim();
  if (!trimmed) return '';
  // If the user already provided a selector block, respect it.
  if (trimmed.includes('{')) {
    return trimmed;
  }
  return `:root { ${trimmed} }`;
};

const removeExistingStyle = () => {
  const existing = document.getElementById(STYLE_ID);
  if (existing?.parentNode) {
    existing.parentNode.removeChild(existing);
  }
};

export const useCustomThemeOverrides = (settings: Settings | null | undefined) => {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const enabled = settings?.customThemeEnabled;
    const styleContent = enabled ? wrapCss(settings?.customThemeCss ?? '') : '';

    if (!styleContent) {
      removeExistingStyle();
      return;
    }

    let styleElement = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = STYLE_ID;
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = styleContent;
    return () => {
      if (styleElement?.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, [settings?.customThemeCss, settings?.customThemeEnabled]);
};
