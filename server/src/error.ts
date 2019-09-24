import { ApolloError, ForbiddenError, UserInputError } from 'apollo-server-errors';
import { Result } from 'boluo-common';

export enum ServiceErrorType {
  Input,
  Forbidden,
  Internal,
}

export interface ServiceError {
  type: ServiceErrorType;
  message: string;
}

export type ServiceResult<T> = Result.Result<T, ServiceError>;

export const inputError = (message: string): ServiceError => ({ type: ServiceErrorType.Input, message });
export const forbiddenError = (message: string): ServiceError => ({ type: ServiceErrorType.Forbidden, message });
export const internalError = (message: string): ServiceError => ({ type: ServiceErrorType.Internal, message });
export const toApolloError = (error: ServiceError): ApolloError => {
  switch (error.type) {
    case ServiceErrorType.Forbidden:
      return new ForbiddenError(error.message);
    case ServiceErrorType.Internal:
      return new ApolloError(error.message);
    case ServiceErrorType.Input:
      return new UserInputError(error.message);
  }
};
export const throwApolloError = <T>(result: Result.Result<T, ServiceError>): T => {
  if (result.ok) {
    return result.some;
  } else {
    throw toApolloError(result.err);
  }
};
