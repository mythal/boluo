import { AppError, errorText, LOADING, NOT_FOUND } from '../../api/error';
import Loading from './Loading';
import NotFound from '../pages/NotFound';
import InformationBar from './InformationBar';
import * as React from 'react';
import { pY } from '../../styles/atoms';

export function RenderError({ error }: { error: AppError }) {
  if (error.code === LOADING) {
    return <Loading />;
  } else if (error.code === NOT_FOUND) {
    return <NotFound />;
  } else {
    return (
      <div css={[pY(2)]}>
        <InformationBar variant="ERROR">{errorText(error)}</InformationBar>
      </div>
    );
  }
}
