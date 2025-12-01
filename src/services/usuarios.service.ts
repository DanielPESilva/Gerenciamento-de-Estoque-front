import api from '@/lib/axios';

export interface UpdateUsuarioPayload {
  nome?: string;
  email?: string;
}

export const usuariosService = {
  async getById(id: number) {
    const response = await api.get<{ success: boolean; data: any }>(`/usuarios/${id}`);
    return response.data;
  },

  async update(id: number, data: UpdateUsuarioPayload) {
    const response = await api.patch<{ success: boolean; data: any; message?: string }>(
      `/usuarios/${id}`,
      data
    );
    return response.data;
  }
};

