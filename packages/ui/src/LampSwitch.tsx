import clsx from 'clsx';

export const LampSwitch = ({ isOn }: { isOn: boolean }) => {
  return (
    <span
      aria-hidden
      className={clsx(
        'absolute top-1 right-1 block h-[0.5ch] w-[0.5ch] rounded-full',
        isOn
          ? 'bg-action-toggle-indicator-on shadow-action-toggle-indicator-on/20 shadow-[0_0_0_1px]'
          : 'bg-action-toggle-indicator-off',
      )}
    />
  );
};
