import React, { useRef } from 'react';

interface Props {
  children: React.ReactNode;
}

export function Code({ children }: Props) {
  const ref = useRef<HTMLElement>(null);

  const copyWithSelection = (node: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('copy');
    selection.removeAllRanges();
  };

  const onClick = async () => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const text = node.textContent ?? '';
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      copyWithSelection(node);
    }
  };

  return (
    <code
      ref={ref}
      className="bg-legacy-black font-legacy-mono inline cursor-pointer rounded-[3px] px-2 py-1 text-[0.875rem] font-normal text-inherit not-italic hover:shadow-[inset_0_0_0_1px_var(--color-legacy-primary-700)] active:shadow-[inset_0_0_0_1px_var(--color-legacy-primary-500)]"
      onClick={onClick}
    >
      {children}
    </code>
  );
}
