// Types for Items (Roupas)
export interface Item {
  id: number;
  nome: string;
  descricao?: string;
  tipo: string;
  tamanho: string;
  cor: string;
  preco: number;
  quantidade: number;
  usuarios_id: number;
  criado_em: string;
  Usuario?: {
    id: number;
    nome: string;
    email: string;
  };
}

export interface ItemsResponse {
  success: boolean;
  data: Item[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ItemFilters {
  page?: number;
  limit?: number;
  tipo?: string;
  cor?: string;
  tamanho?: string;
  nome?: string;
  preco?: number;
}

export interface CreateItemData {
  nome: string;
  descricao?: string;
  tipo: string;
  tamanho: string;
  cor: string;
  preco: number;
  quantidade: number;
  usuarios_id: number;
}

export interface UpdateItemData {
  nome?: string;
  descricao?: string;
  tipo?: string;
  tamanho?: string;
  cor?: string;
  preco?: number;
  quantidade?: number;
}
