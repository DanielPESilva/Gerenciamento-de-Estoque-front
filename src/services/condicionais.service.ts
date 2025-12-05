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
  },

  async convertToSale(
    condicionalId: number,
    payload: {
      itens_vendidos: 'todos' | Array<{ roupas_id: number; quantidade: number }>;
      forma_pagamento:
        | 'Pix'
        | 'Dinheiro'
        | 'Cartão de Crédito'
        | 'Cartão de Débito'
        | 'Boleto'
        | 'Cheque'
        | 'Permuta';
      desconto?: number;
      observacoes?: string;
    }
  ): Promise<{ success: boolean; message?: string }> {
    const response = await api.post<{ success: boolean; message?: string }>(
      `/condicionais/${condicionalId}/converter-venda`,
      {
        desconto: 0,
        ...payload
      }
    );
    return response.data;
  }
};

