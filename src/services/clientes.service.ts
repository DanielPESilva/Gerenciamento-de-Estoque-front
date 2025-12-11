import api from '@/lib/axios';
import { Client } from '@/types/client';

export interface ClientFilters {
  page?: number;
  limit?: number;
  nome?: string;
  email?: string;
  cpf?: string;
  telefone?: string;
}

export interface ClientsResponse {
  data: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

interface ApiResponse<T> {
  data: T;
  pagination?: ClientsResponse['pagination'];
  error: boolean;
  code: number;
  message: string;
  errors: Array<{ message: string }>;
}

export const clientesService = {
  async getAll(filters: ClientFilters = {}): Promise<ClientsResponse> {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.nome) params.append('nome', filters.nome);
    if (filters.email) params.append('email', filters.email);
    if (filters.cpf) params.append('cpf', filters.cpf);
    if (filters.telefone) params.append('telefone', filters.telefone);

    const response = await api.get<ApiResponse<Client[]>>(`/clientes?${params.toString()}`);
    const { data, pagination } = response.data;

    const items = Array.isArray(data) ? data : [];
    const resolvedPagination: ClientsResponse['pagination'] =
      pagination ?? {
        page: filters.page ?? 1,
        limit: filters.limit ?? items.length,
        total: items.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      };

    return {
      data: items,
      pagination: resolvedPagination
    };
  },

  async create(payload: {
    nome: string;
    email: string;
    telefone: string;
    cpf: string;
    endereco: string;
  }): Promise<Client> {
    const response = await api.post<ApiResponse<Client>>('/clientes', payload);
    return response.data.data;
  },

  async update(
    id: number,
    payload: {
      nome: string;
      email: string;
      telefone: string;
      cpf: string;
      endereco: string;
    }
  ): Promise<Client> {
    const response = await api.patch<ApiResponse<Client>>(`/clientes/${id}`, payload);
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/clientes/${id}`);
  }
};

