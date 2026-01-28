/**
 * Shared Errors across the application
 * Clean Architecture: Typed errors from domain
 */

import { ErrorCode } from '@meetwithfriends/shared';

export class DomainError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super(
      ErrorCode.INVALID_CREDENTIALS,
      'Invalid email or password',
      401,
    );
  }
}

export class UserNotFoundError extends DomainError {
  constructor(userId: string) {
    super(
      ErrorCode.USER_NOT_FOUND,
      `User ${userId} not found`,
      404,
    );
  }
}

export class UserAlreadyExistsError extends DomainError {
  constructor(email: string) {
    super(
      ErrorCode.USER_ALREADY_EXISTS,
      `User with email ${email} already exists`,
      409,
    );
  }
}

export class SlotNotFoundError extends DomainError {
  constructor(slotId: string) {
    super(
      ErrorCode.SLOT_NOT_FOUND,
      `Slot ${slotId} not found`,
      404,
    );
  }
}

export class SlotAlreadyReservedError extends DomainError {
  constructor(slotId: string) {
    super(
      ErrorCode.SLOT_ALREADY_RESERVED,
      `Slot ${slotId} is already reserved`,
      409,
    );
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized') {
    super(
      ErrorCode.UNAUTHORIZED,
      message,
      401,
    );
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden') {
    super(
      ErrorCode.FORBIDDEN,
      message,
      403,
    );
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      ErrorCode.VALIDATION_ERROR,
      message,
      400,
      details,
    );
  }
}
