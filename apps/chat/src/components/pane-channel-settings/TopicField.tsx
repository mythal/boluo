import { FC, useId } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import { TextArea } from 'ui';

interface Props {
}

export const TopicField: FC<Props> = ({}) => {
  const { register } = useFormContext();
  const id = useId();
  return (
    <div>
      <label className="block pb-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Topic" />
      </label>
      <div>
        <TextArea className="w-full" id={id} {...register('topic')} />
      </div>
    </div>
  );
};
