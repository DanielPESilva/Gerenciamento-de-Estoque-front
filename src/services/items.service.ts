import api from '@/lib/axios';
import { ItemsResponse, ItemFilters, CreateItemData, UpdateItemData, Item } from '@/types/item';

export const itemsService = {
  async getAll(filters?: ItemFilters): Promise<ItemsResponse> {
    const params = new URLSearchParams();
    
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.tipo) params.append('tipo', filters.tipo);
    if (filters?.cor) params.append('cor', filters.cor);
    if (filters?.tamanho) params.append('tamanho', filters.tamanho);
    if (filters?.nome) params.append('nome', filters.nome);
    if (filters?.preco) params.append('preco', filters.preco.toString());

    const response = await api.get<ItemsResponse>(`/itens?${params.toString()}`);
    return response.data;
  },

  async getById(id: number): Promise<{ success: boolean; data: Item }> {
    const response = await api.get<{ success: boolean; data: Item }>(`/itens/${id}`);
    return response.data;
  },

  async create(data: CreateItemData): Promise<{ success: boolean; data: Item }> {
    const response = await api.post<{ success: boolean; data: Item }>('/itens', data);
    return response.data;
  },

  async update(id: number, data: UpdateItemData): Promise<{ success: boolean; data: Item }> {
    const response = await api.patch<{ success: boolean; data: Item }>(`/itens/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/itens/${id}`);
  },

  async searchByName(searchTerm: string, limit = 10): Promise<{ success: boolean; data: Item[] }> {
    const response = await api.get<{ success: boolean; data: Item[] }>(`/itens/search?q=${searchTerm}&limit=${limit}`);
    return response.data;
  },
};
