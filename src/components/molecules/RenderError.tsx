import { AppError, BAD_REQUEST, errorText, LOADING, NOT_FOUND } from '../../api/error';
import Loading from './Loading';
import NotFound from '../pages/NotFound';
import InformationBar from './InformationBar';
import * as React from 'react';
import { mY, textSm } from '../../styles/atoms';
import Title from '../atoms/Title';

interface Props {
  error: AppError;
  variant?: 'page' | 'component';
  more404?: boolean;
}

export function RenderError({ error, more404, variant }: Props) {
  variant = variant ?? 'page';
  if (error.code === LOADING) {
    return <Loading />;
  } else if (error.code === NOT_FOUND || (more404 && error.code === BAD_REQUEST)) {
    if (variant === 'component') {
      return <InformationBar variant="WARNING">找不到请求的资源</InformationBar>;
    } else {
      return <NotFound />;
    }
  }
  const { description, detail } = errorText(error);
  if (variant === 'component') {
    return (
      <InformationBar variant="ERROR">
        <div>{description}</div>
        {detail && <div css={[textSm, mY(1)]}>{detail}</div>}
      </InformationBar>
    );
  }
  return (
    <>
      <Title>{description}</Title>
      {detail && <p>{detail}</p>}
    </>
  );
}
