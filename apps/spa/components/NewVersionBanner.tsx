import { NewVersionBanner as NewVersionBannerView } from '@boluo/ui/NewVersionBanner';
import { useNewVersion } from '../hooks/useNewVersion';

export const NewVersionBanner = () => {
  const { available, dismiss } = useNewVersion();

  if (!available) return null;

  return <NewVersionBannerView onDismiss={dismiss} onRefresh={() => location.reload()} />;
};
