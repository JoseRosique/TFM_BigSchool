export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  timezone?: string;
}
