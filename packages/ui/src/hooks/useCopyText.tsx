import { useCallback, useEffect, useRef, useState } from 'react';

const writeTextToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        return document.execCommand('copy');
      } finally {
        textArea.remove();
      }
    } catch {
      return false;
    }
  }
};

interface UseCopyTextOptions {
  feedbackDuration?: number;
}

export const useCopyText = ({ feedbackDuration = 1500 }: UseCopyTextOptions = {}) => {
  const [copied, setCopied] = useState(false);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      clearTimeout(feedbackTimeout.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (!(await writeTextToClipboard(text))) return false;

      setCopied(true);
      clearTimeout(feedbackTimeout.current);
      feedbackTimeout.current = setTimeout(() => setCopied(false), feedbackDuration);
      return true;
    },
    [feedbackDuration],
  );

  return { copied, copy };
};
