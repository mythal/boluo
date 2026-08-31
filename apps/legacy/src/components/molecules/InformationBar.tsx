import * as React from 'react';
import { type InformationLevel } from '../../information';
import { cls } from '../../utils/classnames';
import CloseButton from './CloseButton';

interface Props {
  variant: InformationLevel;
  children: React.ReactNode;
  className?: string;
  dismiss?: () => void;
}

const informationClassName =
  'grid grid-cols-[1fr_auto] items-center rounded-[3px] border border-solid p-1 text-[1rem] shadow-legacy-ui data-[variant=INFO]:border-legacy-information-info-border data-[variant=INFO]:bg-legacy-information-info data-[variant=INFO]:hover:border-legacy-information-info-hover data-[variant=ERROR]:border-legacy-information-error-border data-[variant=ERROR]:bg-legacy-information-error data-[variant=ERROR]:hover:border-legacy-information-error-hover data-[variant=SUCCESS]:border-legacy-information-warn-border data-[variant=SUCCESS]:bg-legacy-information-warn data-[variant=SUCCESS]:hover:border-legacy-information-warn-hover data-[variant=WARNING]:border-legacy-information-success-border data-[variant=WARNING]:bg-legacy-information-success data-[variant=WARNING]:hover:border-legacy-information-success-hover';

function InformationBar({ variant, className, dismiss, children }: Props) {
  return (
    <div className={cls(informationClassName, className)} data-variant={variant}>
      <div className="p-2">{children}</div>
      {dismiss && <CloseButton className="text-[1.25rem]" onClick={dismiss} />}
    </div>
  );
}

export default React.memo(InformationBar);
