import clsx from 'clsx';

export const LampOnline = ({ isOn }: { isOn: boolean }) => {
  return (
    <span
      aria-hidden
      className={clsx(
        'absolute bottom-0 left-0 block h-[0.75ch] w-[0.75ch] -translate-x-[25%] translate-y-[25%] rounded-full',
        isOn
          ? 'bg-action-toggle-indicator-on shadow-action-toggle-indicator-on/20 shadow-[0_0_0_1px]'
          : 'bg-action-toggle-indicator-off',
      )}
    />
  );
};
