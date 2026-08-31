import * as React from 'react';
import Loading from '../../components/molecules/Loading';

interface Props {
  text?: string;
}

function PageLoading({ text }: Props) {
  return (
    <div className="bg-legacy-modal-mask fixed inset-0 z-[1000] flex items-center justify-center">
      <div>
        <Loading style={{ display: 'block' }} text={text} />
      </div>
    </div>
  );
}

export default PageLoading;
