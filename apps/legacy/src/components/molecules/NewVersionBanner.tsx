import { useNewVersion } from '../../hooks/useNewVersion';
import Button from '../atoms/Button';
import InformationBar from './InformationBar';

export const NewVersionBanner = () => {
  const { available, dismiss } = useNewVersion();
  if (!available) return null;

  return (
    <div
      role="status"
      className="animate-legacy-version-enter fixed top-2 left-1/2 z-[200] w-max max-w-[calc(100%-1rem)] motion-reduce:-translate-x-1/2 motion-reduce:animate-none"
    >
      <InformationBar variant="INFO" dismiss={dismiss}>
        <div className="flex flex-wrap items-center justify-center gap-3 text-[0.875rem]">
          <span>菠萝有新版本可用。</span>
          <Button size="small" variant="primary" onClick={() => location.reload()}>
            刷新页面
          </Button>
        </div>
      </InformationBar>
    </div>
  );
};
