import type { ApiError, CharacterVisibility } from '@boluo/api';
import { explainError } from '@boluo/locale/errors';
import { Drama } from '@boluo/icons';
import { useStore } from 'jotai';
import type { FC } from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import {
  FormProvider,
  useController,
  useForm,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { FormattedMessage, type IntlShape, useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';
import { Button } from '@boluo/ui/Button';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { ColorPickerInput } from '@boluo/ui/ColorPickerInput';
import { ErrorMessageBox } from '@boluo/ui/ErrorMessageBox';
import { HelpText } from '@boluo/ui/HelpText';
import { TextArea, TextInput } from '@boluo/ui/TextInput';
import { computeColors, parseGameColor, parseHexColor } from '@boluo/color';
import { useMutateCharacterCreate } from '@boluo/hooks/useMutateCharacterCreate';
import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { usePaneClose } from '../../hooks/usePaneClose';
import { chatAtom } from '../../state/chat.atoms';
import { collectCharacterNameHistory } from '../../state/name-history';
import { PaneBox } from '../PaneBox';
import { PaneFooterBox } from '../PaneFooterBox';
import { PaneHeaderBox } from '../PaneHeaderBox';

interface FormSchema {
  name: string;
  alias: string;
  description: string;
  color: string;
  visibility: CharacterVisibility;
}

const FormErrorDispay: FC<{ error: ApiError; intl: IntlShape }> = ({ error, intl }) => {
  return <ErrorMessageBox>{explainError(intl, error)}</ErrorMessageBox>;
};

const FieldErrorDisplay: FC<{ message?: string }> = ({ message }) => {
  if (!message) return null;
  return <div className="pt-1 text-sm">{message}</div>;
};

const resolveColorValue = (color: string, userId: string): string => {
  const hex = parseHexColor(color);
  if (hex) {
    return hex.toUpperCase();
  }
  return computeColors(userId, parseGameColor(color)).light;
};

const NameField: FC<{ spaceId: string; userId: string | null }> = ({ spaceId, userId }) => {
  const intl = useIntl();
  const id = useId();
  const store = useStore();
  const [showAllNames, setShowAllNames] = useState(false);
  const {
    register,
    setValue,
    setFocus,
    formState: {
      errors: { name: error },
    },
  } = useFormContext<FormSchema>();
  const currentName = useWatch<FormSchema, 'name'>({ name: 'name' }) ?? '';
  const normalizedCurrentName = currentName.trim();
  const requiredMessage = intl.formatMessage({ defaultMessage: 'Character name is required.' });
  const nameCandidates = useMemo(() => {
    if (!userId) return [];
    return collectCharacterNameHistory({
      state: store.get(chatAtom),
      userId,
      spaceId,
      otherLimit: 200,
    }).filter((name) => name !== normalizedCurrentName);
  }, [normalizedCurrentName, spaceId, store, userId]);
  const visibleCandidates = showAllNames ? nameCandidates : nameCandidates.slice(0, 5);
  return (
    <div>
      <label className="block pb-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Character Name" />
      </label>
      <TextInput
        id={id}
        className="w-full"
        variant={error ? 'error' : 'normal'}
        {...register('name', {
          required: requiredMessage,
          validate: (value) =>
            value.trim().length > 0 ||
            intl.formatMessage({ defaultMessage: 'Character name cannot be empty.' }),
        })}
      />
      <FieldErrorDisplay message={error?.message} />
      {visibleCandidates.length > 0 && (
        <div className="pt-1 flex flex-wrap gap-1">
          {visibleCandidates.map((candidate) => (
            <ButtonInline
              key={candidate}
              onClick={() => {
                setValue('name', candidate, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                });
                setFocus('name');
              }}
            >
              {candidate}
            </ButtonInline>
          ))}
          {!showAllNames && nameCandidates.length > 5 && (
            <ButtonInline
              onClick={() => {
                setShowAllNames(true);
              }}
            >
              ...
            </ButtonInline>
          )}
        </div>
      )}
    </div>
  );
};

const AliasField: FC = () => {
  const id = useId();
  const { register } = useFormContext<FormSchema>();
  return (
    <div>
      <label className="block pb-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Alias (Optional)" />
      </label>
      <TextInput id={id} className="w-full" {...register('alias')} />
    </div>
  );
};

const DescriptionField: FC = () => {
  const id = useId();
  const { register } = useFormContext<FormSchema>();
  return (
    <div>
      <label className="block pb-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Description (Optional)" />
      </label>
      <TextArea id={id} className="w-full" {...register('description')} />
    </div>
  );
};

const ColorField: FC<{ previewSeed: string; fallbackColor: string }> = ({
  previewSeed,
  fallbackColor,
}) => {
  const id = useId();
  const {
    field: { value, onChange },
  } = useController<FormSchema, 'color'>({
    name: 'color',
  });
  const colorValue = useMemo(() => {
    const trimmed = value.trim();
    const candidate = trimmed === '' ? fallbackColor : trimmed;
    return resolveColorValue(candidate, previewSeed);
  }, [fallbackColor, previewSeed, value]);
  return (
    <div>
      <label className="block pb-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Name Color" />
      </label>
      <ColorPickerInput id={id} colorValue={colorValue} textValue={value} onChange={onChange} />
      <div className="pt-1">
        <HelpText>
          <FormattedMessage defaultMessage="Use a hex color like #RRGGBB, or keep it empty to use the default." />
        </HelpText>
      </div>
    </div>
  );
};

const VisibilityField: FC = () => {
  const id = useId();
  const { register } = useFormContext<FormSchema>();
  const fieldId = {
    public: `${id}-public`,
    private: `${id}-private`,
  };
  return (
    <div>
      <div className="pb-1">
        <FormattedMessage defaultMessage="Visibility" />
      </div>
      <div className="grid grid-cols-[1.5em_minmax(0,1fr)] gap-x-1 gap-y-0">
        <input
          id={fieldId.public}
          type="radio"
          value="PUBLIC"
          {...register('visibility')}
          className="mr-2"
        />
        <label htmlFor={fieldId.public}>
          <FormattedMessage defaultMessage="Public" />
        </label>
        <label htmlFor={fieldId.public} className="col-start-2 mb-2">
          <HelpText>
            <FormattedMessage defaultMessage="Visible to everyone in the space." />
          </HelpText>
        </label>
        <input
          id={fieldId.private}
          type="radio"
          value="PRIVATE"
          {...register('visibility')}
          className="mr-2"
        />
        <label htmlFor={fieldId.private}>
          <FormattedMessage defaultMessage="Private" />
        </label>
        <label htmlFor={fieldId.private} className="col-start-2 mb-2">
          <HelpText>
            <FormattedMessage defaultMessage="Only visible to you." />
          </HelpText>
        </label>
      </div>
    </div>
  );
};

export const PaneCreateCharacter: FC<{ spaceId: string }> = ({ spaceId }) => {
  const intl = useIntl();
  const close = usePaneClose();
  const { mutate } = useSWRConfig();
  const { data: currentUser } = useQueryCurrentUser();
  const previewSeed = currentUser?.id ?? 'default';
  const defaultColor = currentUser?.defaultColor ?? '';
  const form = useForm<FormSchema>({
    defaultValues: {
      name: '',
      alias: '',
      description: '',
      color: defaultColor,
      visibility: 'PUBLIC',
    },
  });
  useEffect(() => {
    if (!currentUser) return;
    if (form.formState.isDirty) return;
    const current = form.getValues('color');
    if (current === '') {
      form.setValue('color', currentUser.defaultColor);
    }
  }, [currentUser, form]);
  const { trigger, isMutating, error } = useMutateCharacterCreate(spaceId, false);
  const onSubmit = async (data: FormSchema) => {
    const payload = {
      name: data.name.trim(),
      description: data.description.trim(),
      color: data.color.trim(),
      alias: data.alias.trim() === '' ? null : data.alias.trim(),
      imageId: null,
      visibility: data.visibility,
      isArchived: false,
      metadata: null,
    };
    const created = await trigger(payload);
    if (created) {
      void mutate(['/characters/query', created.id], created, { revalidate: false });
      close();
    }
  };
  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={<Drama />}>
          <FormattedMessage defaultMessage="Create Character" />
        </PaneHeaderBox>
      }
    >
      <div className="relative">
        <FormProvider {...form}>
          <form
            onSubmit={(event) => {
              void form.handleSubmit(onSubmit)(event);
            }}
          >
            <div className="p-pane flex h-full max-w-md flex-col gap-4">
              <NameField spaceId={spaceId} userId={currentUser?.id ?? null} />
              <AliasField />
              <DescriptionField />
              <ColorField previewSeed={previewSeed} fallbackColor={defaultColor} />
              <VisibilityField />
              {error && <FormErrorDispay error={error} intl={intl} />}
            </div>
            <PaneFooterBox>
              <Button type="button" onClick={close}>
                <FormattedMessage defaultMessage="Cancel" />
              </Button>
              <Button type="submit" variant="primary" disabled={!form.formState.isDirty || isMutating}>
                <FormattedMessage defaultMessage="Create Character" />
              </Button>
            </PaneFooterBox>
          </form>
        </FormProvider>
      </div>
    </PaneBox>
  );
};

export default PaneCreateCharacter;
