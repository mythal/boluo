import * as React from 'react';
import {
  type AppError,
  BAD_REQUEST,
  type ErrorCode,
  errorText,
  LOADING,
  NOT_FOUND,
} from '../../api/error';
import { mY, pY, textSm } from '../../styles/atoms';
import Title from '../atoms/Title';
import NotFound from '../pages/NotFound';
import InformationBar from './InformationBar';
import Loading from './Loading';

interface Props {
  error: AppError;
  variant?: 'page' | 'component';
  more404?: boolean;
  rewrite?: { [code in ErrorCode]?: string };
}

export function RenderError({ error, more404, variant = 'page', rewrite = {} }: Props) {
  if (error.code === LOADING) {
    if (variant === 'page') {
      return (
        <div css={pY(2)}>
          <Loading />
        </div>
      );
    }
    return <Loading />;
  } else if (error.code === NOT_FOUND || (more404 && error.code === BAD_REQUEST)) {
    if (variant === 'component') {
      return <InformationBar variant="WARNING">找不到请求的资源</InformationBar>;
    } else {
      return <NotFound />;
    }
  }
  let { description, detail } = errorText(error);
  const rewriteText = rewrite[error.code];
  if (rewriteText) {
    description = rewriteText;
    detail = undefined;
  }
  if (variant === 'component') {
    return (
      <InformationBar variant="ERROR">
        <div>{description}</div>
        {detail && <div css={[textSm, mY(1)]}>{detail}</div>}
      </InformationBar>
    );
  }
  return (
    <div css={[pY(2)]}>
      <Title>{description}</Title>
      {detail && <p>{detail}</p>}
    </div>
  );
}
