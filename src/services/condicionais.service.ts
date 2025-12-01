import api from '@/lib/axios';

export interface CreateCondicionalPayload {
  cliente_id: number;
  data_devolucao: string;
  itens: Array<{
    roupas_id?: number;
    nome_item?: string;
    quantidade: number;
  }>;
}

export interface CreateCondicionalResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
  };
}

export const condicionaisService = {
  async create(payload: CreateCondicionalPayload): Promise<CreateCondicionalResponse> {
    const response = await api.post<CreateCondicionalResponse>('/condicionais', payload);
    return response.data;
  }
};

