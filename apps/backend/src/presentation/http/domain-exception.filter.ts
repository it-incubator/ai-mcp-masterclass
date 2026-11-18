// The ONE place where domain errors become HTTP responses. Body shape is Nest's standard {statusCode, message, error}.
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import {
  BusinessRuleError, ConflictError, DomainError, NotFoundError, ValidationError,
} from '../../domain/errors';

function toHttp(e: DomainError): { statusCode: number; error: string } {
  if (e instanceof NotFoundError) return { statusCode: HttpStatus.NOT_FOUND, error: 'Not Found' };
  if (e instanceof ConflictError) return { statusCode: HttpStatus.CONFLICT, error: 'Conflict' };
  if (e instanceof BusinessRuleError) return { statusCode: HttpStatus.UNPROCESSABLE_ENTITY, error: 'Unprocessable Entity' };
  if (e instanceof ValidationError) return { statusCode: HttpStatus.BAD_REQUEST, error: 'Bad Request' };
  return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Internal Server Error' };
}

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
  catch(exception: DomainError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const { statusCode, error } = toHttp(exception);
    res.status(statusCode).json({ statusCode, message: exception.message, error });
  }
}
