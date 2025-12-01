// Auth Types
export interface User {
  id: number;
  nome: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
  error: boolean;
  code: number;
  message: string;
  errors: any[];
}

export interface RegisterRequest {
  nome: string;
  email: string;
  senha: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}
