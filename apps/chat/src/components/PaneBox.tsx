import clsx from 'clsx';
import { FC, ReactNode, Suspense } from 'react';
import { Loading } from 'ui';
import { ChildrenProps, StyleProps } from 'utils';
import { useFocusPane, useIsFocused } from '../state/chat-view';
import { Delay } from './Delay';
import { PaneBodyError } from './PaneBodyError';

interface Props extends ChildrenProps, StyleProps {
  header: ReactNode;
}

const Placeholder = () => {
  return <div className="h-full"></div>;
};

export const PaneBox: FC<Props> = ({ className, header, children }) => {
  const isFocused = useIsFocused();
  const focus = useFocusPane();
  return (
    <div
      onClick={focus}
      onFocus={focus}
      className={clsx(
        '@container min-w-[18rem] flex-[1_1_100%] flex flex-col h-full',
        isFocused ? 'max-md:flex-[1_1_100%]' : 'max-md:flex-[0_1_0%]',
        className,
      )}
    >
      {header}
      <div className={clsx('bg-bg overflow-y-auto overflow-x-hidden flex-grow', isFocused ? '' : 'max-md:hidden')}>
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
