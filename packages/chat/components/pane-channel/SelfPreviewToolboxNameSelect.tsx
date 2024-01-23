import {
  autoUpdate,
  flip,
  useFloating,
  useInteractions,
  useListNavigation,
  useTypeahead,
  useClick,
  useListItem,
  useDismiss,
  useRole,
  FloatingFocusManager,
  FloatingList,
} from '@floating-ui/react';
import clsx from 'clsx';
import { ChevronDown, ChevronUp } from 'icons';
import { Atom, useAtomValue } from 'jotai';
import React, { FC, ReactNode, useCallback, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from 'ui/Icon';

interface SelectContextValue {
  activeIndex: number | null;
  selectedIndex: number | null;
  getItemProps: ReturnType<typeof useInteractions>['getItemProps'];
  handleSelect: (index: number | null) => void;
}

const SelectContext = React.createContext<SelectContextValue>({} as SelectContextValue);

interface SelectProps {
  children: React.ReactNode;
  selectedValueAtom: Atom<string>;
  onChange: (name: string) => void;
}

export function Select({ children, selectedValueAtom, onChange }: SelectProps) {
  const selectedValue = useAtomValue(selectedValueAtom);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const { refs, floatingStyles, context } = useFloating({
    placement: 'right-end',
    open: isOpen,
    onOpenChange: setIsOpen,
    whileElementsMounted: autoUpdate,
    middleware: [flip()],
  });

  const elementsRef = useRef<Array<HTMLElement | null>>([]);
  const labelsRef = useRef<Array<string | null>>([]);

  const handleSelect = useCallback(
    (index: number | null) => {
      setIsOpen(false);
      setSelectedIndex(index);
      if (index != null) {
        onChange(labelsRef.current[index]!);
      }
    },
    [onChange],
  );

  function handleTypeaheadMatch(index: number | null) {
    if (isOpen) {
      setActiveIndex(index);
    } else {
      handleSelect(index);
    }
  }

  const listNav = useListNavigation(context, {
    listRef: elementsRef,
    activeIndex,
    selectedIndex,
    onNavigate: setActiveIndex,
  });
  const typeahead = useTypeahead(context, {
    listRef: labelsRef,
    activeIndex,
    selectedIndex,
    onMatch: handleTypeaheadMatch,
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'listbox' });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    listNav,
    typeahead,
    click,
    dismiss,
    role,
  ]);

  const selectContext = React.useMemo(
    () => ({
      activeIndex,
      selectedIndex,
      getItemProps,
      handleSelect,
    }),
    [activeIndex, selectedIndex, getItemProps, handleSelect],
  );

  return (
    <>
      <div
        className="flex cursor-pointer select-none items-center gap-0.5 text-sm"
        ref={refs.setReference}
        tabIndex={0}
        {...getReferenceProps()}
      >
        <FormattedMessage defaultMessage="Name" />
        {isOpen ? <Icon icon={ChevronUp} /> : <Icon icon={ChevronDown} />}
      </div>
      <SelectContext.Provider value={selectContext}>
        {isOpen && (
          <FloatingFocusManager context={context} modal={false}>
            <div
              className="bg-surface-50 border-surface-500 z-20 flex min-w-max flex-col rounded-sm border shadow"
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
            >
              <FloatingList elementsRef={elementsRef} labelsRef={labelsRef}>
                {children}
              </FloatingList>
            </div>
          </FloatingFocusManager>
        )}
      </SelectContext.Provider>
    </>
  );
}

export const Option: FC<{ children: ReactNode; name: string }> = ({ children, name: label }) => {
  const { activeIndex, selectedIndex, getItemProps, handleSelect } = React.useContext(SelectContext);

  const { ref, index } = useListItem({ label });

  const isActive = activeIndex === index;
  const isSelected = selectedIndex === index;

  return (
    <button
      ref={ref}
      role="option"
      className={clsx(
        'px-4 py-2 text-left text-base active:bg-blue-500/75',
        isActive && 'bg-blue-500/50',
        isSelected && 'font-bold',
      )}
      aria-selected={isActive && isSelected}
      tabIndex={isActive ? 0 : -1}
      {...getItemProps({
        onClick: () => handleSelect(index),
      })}
    >
      {children}
    </button>
  );
};
