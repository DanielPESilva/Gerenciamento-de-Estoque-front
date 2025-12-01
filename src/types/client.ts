export interface Client {
  id: number;
  nome: string;
  email?: string | null;
  cpf?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  criado_em?: string;
}

