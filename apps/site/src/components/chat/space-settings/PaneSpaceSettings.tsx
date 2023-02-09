import type { EditSpace, Space } from 'boluo-api';
import { Settings } from 'boluo-icons';
import type { FC } from 'react';
import { useState } from 'react';
import { useId } from 'react';
import { FormProvider, useController, useForm, useFormContext } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import type { MutationFetcher } from 'swr/mutation';
import useSWRMutation from 'swr/mutation';
import { Button, HelpText, Spinner, TextArea, TextInput } from 'ui';
import type { ChildrenProps } from 'ui/types';
import { post } from '../../../api/browser';
import { useSpace } from '../../../hooks/useSpace';
import { useClosePane } from '../../../state/panes';
import { DiceSelect } from '../../DiceSelect';
import { ClosePaneButton } from '../ClosePaneButton';
import { PaneBodyBox } from '../PaneBodyBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { FieldDestroySpace } from './FieldDestroySpace';

interface Props {
  spaceId: string;
}

type FormSchema = {
  spaceId: string;
  name: string;
  description: string;
  explorable: boolean;
  publicity: string;
  allowSpectator: boolean;
  defaultDiceType: string;
};

const SectionTitle: FC<ChildrenProps> = ({ children }) => <h3 className="font-bold mb-2">{children}</h3>;

const NameField: FC = () => {
  const { register } = useFormContext<FormSchema>();
  return (
    <label className="flex flex-col">
      <div className="py-1">
        <FormattedMessage defaultMessage="Space Name" />
      </div>
      <TextInput {...register('name')} />
    </label>
  );
};

const DescriptionField: FC = () => {
  const { register } = useFormContext<FormSchema>();
  return (
    <label className="flex flex-col">
      <div className="py-1">
        <FormattedMessage defaultMessage="Space Description" />
      </div>
      <TextArea {...register('description')} />
    </label>
  );
};

const PublicityField: FC = () => {
  const { register } = useFormContext<FormSchema>();
  const id = useId();
  const fieldId = {
    public: id + 'public',
    private: id + 'private',
    spectator: id + 'spectator',
  };

  return (
    <div>
      <div className="grid grid-cols-[1.5em_minmax(0,_1fr)] gap-x-1 gap-y-0">
        <input id={fieldId.public} type="radio" value="public" {...register('publicity')} className="mr-2" />
        <label htmlFor={fieldId.public}>
          <FormattedMessage defaultMessage="Public" />
        </label>
        <label htmlFor={fieldId.public} className="mb-2 col-start-2">
          <HelpText>
            <FormattedMessage defaultMessage="Everyone can join this space" />
          </HelpText>
        </label>

        <input id={fieldId.private} type="radio" value="private" {...register('publicity')} className="mr-2" />
        <label htmlFor={fieldId.private}>
          <FormattedMessage defaultMessage="Private" />
        </label>
        <label htmlFor={fieldId.private} className="mb-2 col-start-2">
          <HelpText>
            <FormattedMessage defaultMessage="Only invited people can join this space" />
          </HelpText>
        </label>

        <input id={fieldId.spectator} type="checkbox" className="mr-2" {...register('allowSpectator')} />

        <label htmlFor={fieldId.spectator}>
          <div>
            <FormattedMessage defaultMessage="Allow Spectator" />
          </div>
        </label>

        <label htmlFor={fieldId.spectator} className="col-start-2">
          <HelpText>
            <FormattedMessage defaultMessage="Whether to allow everyone on the Internet to view this space" />
          </HelpText>
        </label>
      </div>
    </div>
  );
};

const FieldDefaultDice: FC = () => {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController<FormSchema, 'defaultDiceType'>({
    name: 'defaultDiceType',
    defaultValue: 'd20',
  });
  return (
    <div>
      <label>
        <div className="py-1">
          <FormattedMessage defaultMessage="Default Dice" />
        </div>
        <DiceSelect value={value} onChange={onChange} />
      </label>
    </div>
  );
};

const PaneFooterBox: FC<ChildrenProps> = ({ children }) => (
  <div className="p-4 sticky bottom-0 border-t bg-bg flex justify-end gap-2">{children}</div>
);

const updater: MutationFetcher<Space, EditSpace, [string, string]> = async ([_, spaceId], { arg }) => {
  const result = await post('/spaces/edit', null, arg);
  const space = result.unwrap();
  return space;
};

const spaceToForm = (space: Space): FormSchema => ({
  spaceId: space.id,
  name: space.name,
  description: space.description,
  defaultDiceType: space.defaultDiceType,
  explorable: space.explorable,
  publicity: space.isPublic ? 'public' : 'private',
  allowSpectator: space.allowSpectator,
});

export const PaneSpaceSettings: FC<Props> = ({ spaceId }) => {
  const close = useClosePane();
  const space = useSpace(spaceId);
  const { trigger: editSpace, isMutating } = useSWRMutation(
    ['/spaces/query', spaceId],
    updater,
    {
      populateCache: (space: Space) => {
        console.log(space);
        return space;
      },
      revalidate: false,
    },
  );
  const form = useForm<FormSchema>({
    defaultValues: spaceToForm(space),
  });
  const onSubmit = async ({ publicity, ...rest }: FormSchema): Promise<void> => {
    const isPublic = publicity === 'public';
    const space = await editSpace({ isPublic, ...rest, grantAdmins: [], removeAdmins: [] });
    if (space) {
      form.reset(spaceToForm(space));
    }
  };
  return (
    <>
      <PaneHeaderBox operators={<ClosePaneButton />} icon={<Settings />}>
        <FormattedMessage
          defaultMessage="Settings of &quot;{spaceName}&quot; Space"
          values={{ spaceName: space.name }}
        />
      </PaneHeaderBox>
      <PaneBodyBox className="relative overflow-x-hidden overflow-y-auto ">
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="p-4 flex flex-col gap-8 h-full max-w-md">
              <div className="flex flex-col gap-2">
                <SectionTitle>
                  <FormattedMessage defaultMessage="Basic" />
                </SectionTitle>
                <NameField />
                <FieldDefaultDice />
                <DescriptionField />
              </div>
              <div className="flex flex-col gap-2">
                <SectionTitle>
                  <FormattedMessage defaultMessage="Space Publicity" />
                </SectionTitle>
                <PublicityField />
              </div>
              <div>
                <SectionTitle>
                  <FormattedMessage defaultMessage="Danger Zone" />
                </SectionTitle>
                <FieldDestroySpace spaceId={space.id} spaceName={space.name} />
              </div>
            </div>
            <PaneFooterBox>
              {isMutating && <Spinner />}
              <Button type="button" onClick={close}>
                <FormattedMessage defaultMessage="Cancel" />
              </Button>

              <Button type="submit" data-type="primary" disabled={isMutating || !form.formState.isDirty}>
                <FormattedMessage defaultMessage="Change Settings" />
              </Button>
            </PaneFooterBox>
          </form>
        </FormProvider>
      </PaneBodyBox>
    </>
  );
};
