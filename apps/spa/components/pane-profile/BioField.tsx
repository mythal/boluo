import { type FC } from 'react';
import { useController } from 'react-hook-form';
import { TextArea } from '@boluo/ui/TextInput';
import { type ProfileEditSchema } from './PaneProfileEdit';

interface Props {
  className?: string;
}

export const BioField: FC<Props> = ({ className }) => {
  const {
    field: { onChange, onBlur, value },
  } = useController<ProfileEditSchema, 'bio'>({ name: 'bio' });
  return <TextArea className={className} value={value} onChange={onChange} onBlur={onBlur} />;
};
