import type { ApiError, EditSpace, Space } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import Settings from '@boluo/icons/Settings';
import { type FC, useCallback, useState } from 'react';
import { useId } from 'react';
import { FormProvider, useController, useForm, useFormContext, useWatch } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import type { MutationFetcher } from 'swr/mutation';
import useSWRMutation from 'swr/mutation';
import { Button } from '@boluo/ui/Button';
import { HelpText } from '@boluo/ui/HelpText';
import { Loading } from '@boluo/ui/Loading';
import { Spinner } from '@boluo/ui/Spinner';
import { TextArea, TextInput } from '@boluo/ui/TextInput';
import { type ChildrenProps } from '@boluo/types';
import { usePaneClose } from '../../hooks/usePaneClose';
import { useQuerySpace } from '@boluo/hooks/useQuerySpace';
import { DangerZone } from '@boluo/ui/DangerZone';
import { DiceSelect } from '@boluo/ui/DiceSelect';
import { ErrorDisplay } from '../ErrorDisplay';
import { InviteSpaceMember } from '../InviteSpaceMember';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { FieldDestroySpace } from './FieldDestroySpace';
import { Failed } from '@boluo/ui/Failed';
import { PaneFooterBox } from '../PaneFooterBox';

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

const SectionTitle: FC<ChildrenProps> = ({ children }) => (
  <h3 className="mb-2 font-bold">{children}</h3>
);

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

const InvitationField: FC<{ spaceId: string }> = ({ spaceId }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <div>
        <Button
          onClick={() => setExpanded((x) => !x)}
          variant="detail"
          aria-pressed={expanded}
          type="button"
        >
          <FormattedMessage defaultMessage="Invite" />
        </Button>
      </div>
      {expanded && (
        <div className="py-2">
          <InviteSpaceMember spaceId={spaceId} />
        </div>
      )}
    </div>
  );
};

const AllowsSpectatorField: FC = () => {
  const { register } = useFormContext<FormSchema>();
  const publicity = useWatch<FormSchema, 'publicity'>({ name: 'publicity' });
  const id = useId();
  if (publicity === 'public') {
    return null;
  }
  return (
    <>
      <input id={id} type="checkbox" className="mr-2" {...register('allowSpectator')} />

      <label htmlFor={id}>
        <div>
          <FormattedMessage defaultMessage="Allow Spectator" />
        </div>
      </label>

      <label htmlFor={id} className="col-start-2">
        <HelpText>
          <FormattedMessage defaultMessage="Whether to allow everyone on the Internet to view this space" />
        </HelpText>
      </label>
    </>
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
      <div className="grid grid-cols-[1.5em_minmax(0,1fr)] gap-x-1 gap-y-0">
        <input
          id={fieldId.public}
          type="radio"
          value="public"
          {...register('publicity')}
          className="mr-2"
        />
        <label htmlFor={fieldId.public}>
          <FormattedMessage defaultMessage="Public" />
        </label>
        <label htmlFor={fieldId.public} className="col-start-2 mb-2">
          <HelpText>
            <FormattedMessage defaultMessage="Everyone can join this space" />
          </HelpText>
        </label>

        <input
          id={fieldId.private}
          type="radio"
          value="private"
          {...register('publicity')}
          className="mr-2"
        />
        <label htmlFor={fieldId.private}>
          <FormattedMessage defaultMessage="Private" />
        </label>
        <label htmlFor={fieldId.private} className="col-start-2 mb-2">
          <HelpText>
            <FormattedMessage defaultMessage="Only invited people can join this space" />
          </HelpText>
        </label>
        <AllowsSpectatorField />
      </div>
    </div>
  );
};

const DEFAULT_DICE_TYPE = 'd20';

const FieldDefaultDice: FC = () => {
  const {
    field: { onChange, value },
  } = useController<FormSchema, 'defaultDiceType'>({
    name: 'defaultDiceType',
    defaultValue: DEFAULT_DICE_TYPE,
  });
  return (
    <div>
      <label>
        <div className="py-1">
          <FormattedMessage defaultMessage="Default Dice" />
        </div>
        <DiceSelect value={value ?? DEFAULT_DICE_TYPE} onChange={onChange} />
      </label>
    </div>
  );
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

const PaneSpaceSettingsForm: FC<{ space: Space }> = ({ space }) => {
  const key = ['/spaces/query', space.id] as const;
  const updater: MutationFetcher<Space, typeof key, EditSpace> = useCallback(
    async ([_, _spaceId], { arg }) => {
      const result = await post('/spaces/edit', null, arg);
      const space = result.unwrap();
      return space;
    },
    [],
  );
  const cancel = usePaneClose();

  const {
    trigger: editSpace,
    isMutating,
    error,
  } = useSWRMutation<Space, ApiError, typeof key, EditSpace>(['/spaces/query', space.id], updater, {
    populateCache: (space: Space) => space,
    revalidate: false,
  });
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
    <FormProvider {...form}>
      {error && (
        <div>
          <ErrorDisplay type="banner" error={error} />
        </div>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="p-pane flex h-full max-w-md flex-col gap-8">
          <div className="flex flex-col gap-2">
            <SectionTitle>
              <FormattedMessage defaultMessage="Basic" />
            </SectionTitle>
            <NameField />
            <FieldDefaultDice />
            <DescriptionField />
            <InvitationField spaceId={space.id} />
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
            <DangerZone
              prompt={
                <span className="text-lg">
                  <FormattedMessage defaultMessage="Destroy Space" />
                </span>
              }
            >
              <FieldDestroySpace spaceId={space.id} spaceName={space.name} />
            </DangerZone>
          </div>
        </div>
        <PaneFooterBox>
          {isMutating && <Spinner />}
          <Button type="button" onClick={cancel}>
            <FormattedMessage defaultMessage="Cancel" />
          </Button>

          <Button type="submit" variant="primary" disabled={isMutating || !form.formState.isDirty}>
            <FormattedMessage defaultMessage="Change Settings" />
          </Button>
        </PaneFooterBox>
      </form>
    </FormProvider>
  );
};

export const PaneSpaceSettings: FC<Props> = ({ spaceId }) => {
  const { data: currentUser, isLoading: isQueryingUser } = useQueryCurrentUser();
  const { data: space, error } = useQuerySpace(spaceId);
  if (error != null) {
    if (space == null) {
      return (
        <Failed
          code={error.code}
          title={<FormattedMessage defaultMessage="Failed to query the space" />}
        />
      );
    }
  }
  if (!space || isQueryingUser) {
    return <Loading />;
  }
  if (!currentUser) {
    return (
      <PaneBox
        header={
          <PaneHeaderBox icon={<Settings />}>
            <FormattedMessage
              defaultMessage='Settings of "{spaceName}" Space'
              values={{ spaceName: space.name ?? '...' }}
            />
          </PaneHeaderBox>
        }
      >
        <div className="text-text-subtle flex items-center justify-center p-8">
          <FormattedMessage defaultMessage="You are not logged in" />
        </div>
      </PaneBox>
    );
  }
  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={<Settings />}>
          <FormattedMessage
            defaultMessage='Settings of "{spaceName}" Space'
            values={{ spaceName: space.name }}
          />
        </PaneHeaderBox>
      }
    >
      <div className="relative">
        <PaneSpaceSettingsForm space={space} />
      </div>
    </PaneBox>
  );
};

export default PaneSpaceSettings;
