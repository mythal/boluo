import clsx from 'clsx';
import { FC, ReactNode, Suspense } from 'react';
import { Loading } from 'ui';
import { ChildrenProps, StyleProps } from 'utils';
import { usePaneFocus } from '../hooks/usePaneFocus';
import { usePaneIsFocus } from '../hooks/usePaneIsFocus';
import { Delay } from './Delay';
import { PaneBodyError } from './PaneBodyError';

interface Props extends ChildrenProps, StyleProps {
  header: ReactNode;
}

const Placeholder = () => {
  return <div className="h-full"></div>;
};

export const PaneBox: FC<Props> = ({ className, header, children }) => {
  const isFocused = usePaneIsFocus();
  const focus = usePaneFocus();
  return (
    <div
      onClick={focus}
      className={clsx(
        '@container min-w-[22rem] flex-[1_1_100%] flex flex-col',
        isFocused ? 'max-md:flex-[1_1_100%] max-md:h-0' : 'max-md:flex-[0_1_0]',
        className,
      )}
    >
      {header}
      <div
        onFocus={focus}
        className={clsx('bg-bg overflow-y-auto overflow-x-hidden flex-grow', isFocused ? '' : 'max-md:hidden')}
      >
        <Suspense
          fallback={
            <div className="h-full flex justify-center items-center">
              <Loading />
            </div>
          }
        >
          <PaneBodyError>
            <Delay timeout={32} fallback={<Placeholder />}>
              {children}
            </Delay>
          </PaneBodyError>
        </Suspense>
      </div>
    </div>
  );
};
