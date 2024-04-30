import clsx from 'clsx';
import { FC, ReactNode, Suspense, useRef } from 'react';
import { Loading } from '@boluo/ui/Loading';
import { ChildrenProps, StyleProps } from '@boluo/utils';
import { usePaneFocus } from '../hooks/usePaneFocus';
import { usePaneIsFocus } from '../hooks/usePaneIsFocus';
import { Delay } from './Delay';
import { PaneBodyError } from './PaneBodyError';
import { BannerContext } from '../hooks/useBannerNode';

interface Props extends ChildrenProps, StyleProps {
  header?: ReactNode;
}

const Placeholder = () => {
  return <div className="h-full"></div>;
};

export const PaneBox: FC<Props> = ({ className, header, children }) => {
  const isFocused = usePaneIsFocus();
  const focus = usePaneFocus();
  const bannerRef = useRef<HTMLDivElement | null>(null);
  return (
    <BannerContext.Provider value={bannerRef}>
      <div
        onClick={focus}
        className={clsx(
          '@container flex min-w-[22rem] flex-[1_1_100%] flex-col md:contain-strict',
          isFocused ? 'max-md:h-0 max-md:flex-[1_1_100%]' : 'max-md:flex-[0_1_0]',
          className,
        )}
      >
        {header}
        <div ref={bannerRef}></div>
        <div
          onFocus={focus}
          className={clsx(
            'bg-pane-bg flex-grow overflow-y-auto overflow-x-hidden',
            Boolean(header) ? 'shadow-pane-header-shadow shadow-[0_9px_1px_-8px_inset]' : '',
            isFocused ? '' : 'max-md:hidden',
          )}
        >
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
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
    </BannerContext.Provider>
  );
};
