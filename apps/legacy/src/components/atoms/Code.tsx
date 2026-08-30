import React, { useRef } from 'react';

interface Props {
  children: React.ReactNode;
}

export function Code({ children }: Props) {
  const ref = useRef<HTMLButtonElement>(null);

  const copyWithSelection = (node: HTMLButtonElement) => {
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
    <button
      type="button"
      ref={ref}
      className="bg-legacy-black font-legacy-mono inline cursor-pointer rounded-[3px] border-0 px-2 py-1 text-[0.875rem] font-normal text-inherit hover:shadow-[inset_0_0_0_1px_var(--color-legacy-primary-700)] focus-visible:shadow-[inset_0_0_0_1px_var(--color-legacy-primary-700)] focus-visible:outline-none active:shadow-[inset_0_0_0_1px_var(--color-legacy-primary-500)]"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
