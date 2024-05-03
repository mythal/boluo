import { ConfirmResetPassword } from './ConfirmResetPassword';

interface Props {
  params: { token: string };
}

export default function Page({ params: { token } }: Props) {
  return (
    <div>
      <ConfirmResetPassword token={token} />
    </div>
  );
}
