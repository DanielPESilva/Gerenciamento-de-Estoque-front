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
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
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
