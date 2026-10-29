export interface ApiResponse<T> {
  status: 'success';
  message: string;
  data: T | null;
  requestId: string | null;
  timestamp: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  status: 'error';
  code: number;
  message: string;
  errors?: FieldError[];
  requestId: string | null;
  timestamp: string;
  path: string;
}
