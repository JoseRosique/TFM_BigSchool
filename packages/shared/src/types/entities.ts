/**
 * Tipos compartidos entre Backend y Frontend
 * Clean Architecture: Value Objects y DTOs
 */

// ============================================
// VALUE OBJECTS & ENUMS
// ============================================

export enum FriendshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED = 'blocked',
}

export enum VisibilityScope {
  PRIVATE = 'private',
  FRIENDS = 'friends',
  LIST = 'list',
}

export enum SlotStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  CANCELED = 'canceled',
}

export enum ReservationStatus {
  CREATED = 'created',
  CANCELED = 'canceled',
}

export enum NotificationEventType {
  SLOT_OPENED = 'slot_opened',
  RESERVATION_CREATED = 'reservation_created',
  RESERVATION_CANCELED = 'reservation_canceled',
  SLOT_UPDATED = 'slot_updated',
}

// ============================================
// DOMAIN ENTITIES (IDs + timestamps)
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string; // IANA timezone (e.g., 'Europe/Madrid')
  createdAt: Date;
  updatedAt: Date;
}

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Slot {
  id: string;
  ownerId: string;
  start: Date; // UTC
  end: Date; // UTC
  timezone: string; // IANA timezone
  visibilityScope: VisibilityScope;
  notes?: string;
  status: SlotStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reservation {
  id: string;
  slotId: string;
  userId: string; // Person making reservation
  status: ReservationStatus;
  createdAt: Date;
  canceledAt?: Date;
}

export interface Notification {
  id: string;
  userId: string;
  eventType: NotificationEventType;
  data: Record<string, unknown>; // Event-specific payload
  readAt?: Date;
  createdAt: Date;
}

// ============================================
// DTOs (Data Transfer Objects)
// ============================================

export namespace RegisterDTO {
  export interface Request {
    email: string;
    password: string;
    name: string;
    timezone: string;
  }

  export interface Response {
    id: string;
    email: string;
    name: string;
    timezone: string;
  }
}

export namespace LoginDTO {
  export interface Request {
    email: string;
    password: string;
  }

  export interface Response {
    userId: string;
    email: string;
    accessToken: string;
  }
}

export namespace OpenSlotDTO {
  export interface Request {
    start: string; // ISO datetime
    end: string; // ISO datetime
    timezone: string;
    visibilityScope: VisibilityScope;
    notes?: string;
  }

  export interface Response {
    id: string;
    ownerId: string;
    start: Date;
    end: Date;
    timezone: string;
    visibilityScope: VisibilityScope;
    status: SlotStatus;
  }
}

export namespace ReserveSlotDTO {
  export interface Request {
    slotId: string;
  }

  export interface Response {
    id: string;
    slotId: string;
    userId: string;
    status: ReservationStatus;
  }
}

export namespace GetUserDTO {
  export interface Response {
    id: string;
    email: string;
    name: string;
    timezone: string;
  }
}

export namespace ListSlotsDTO {
  export interface Query {
    userId?: string;
    status?: SlotStatus;
    from?: string; // ISO datetime
    to?: string; // ISO datetime
  }

  export interface Response {
    items: Slot[];
    total: number;
  }
}

// ============================================
// ERROR TYPES (Tipado fuerte)
// ============================================

export enum ErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  SLOT_NOT_FOUND = 'SLOT_NOT_FOUND',
  RESERVATION_NOT_FOUND = 'RESERVATION_NOT_FOUND',
  SLOT_ALREADY_RESERVED = 'SLOT_ALREADY_RESERVED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

// ============================================
// PAGINATION
// ============================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
