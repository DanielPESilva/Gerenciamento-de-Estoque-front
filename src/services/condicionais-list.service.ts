import api from '@/lib/axios';
import { Condicional, CondicionalItem } from '@/types/condicional';

export interface ListCondicionaisParams {
  page?: number;
  limit?: number;
  cliente_id?: number;
  devolvido?: boolean;
}

export interface ListCondicionaisResult {
  condicionais: Condicional[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const condicionaisListService = {
  async getAll(params: ListCondicionaisParams = {}): Promise<ListCondicionaisResult> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.cliente_id) searchParams.append('cliente_id', params.cliente_id.toString());
    if (params.devolvido !== undefined) {
      searchParams.append('devolvido', params.devolvido ? 'true' : 'false');
    }

    const response = await api.get(`/condicionais?${searchParams.toString()}`);
    const payload = response.data;
    const rawWrapper = payload?.data ?? {};
    const rawList: any[] = rawWrapper.data ?? [];

    const condicionais: Condicional[] = rawList.map((condicional: any) => {
      const itens: CondicionalItem[] = (condicional.CondicionaisItens ?? []).map((item: any) => ({
        id: item.id,
        roupas_id: item.roupas_id,
        nome_item: item.Roupa?.nome ?? item.nome_item ?? 'Item',
        quantidade: item.quatidade ?? item.quantidade ?? 0,
        valor_estimado: item.Roupa?.preco ?? null
      }));

      return {
        id: condicional.id,
        cliente_id: condicional.cliente_id,
        cliente_nome: condicional.Cliente?.nome ?? 'Cliente não informado',
        data: condicional.data,
        data_devolucao: condicional.data_devolucao,
        devolvido: condicional.devolvido,
        itens
      };
    });

    return {
      condicionais,
      pagination: {
        page: rawWrapper.page ?? params.page ?? 1,
        limit: rawWrapper.limit ?? params.limit ?? 10,
        total: rawWrapper.total ?? condicionais.length,
        totalPages: rawWrapper.totalPages ?? 1
      }
    };
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/condicionais/${id}`);
  }
};

