export interface CondicionalItem {
  id: number;
  roupas_id: number;
  nome_item: string;
  tamanho?: string;
  cor?: string;
  preco_unitario?: number | null;
  quantidade: number;
  valor_estimado?: number | null;
}

export interface Condicional {
  id: number;
  cliente_id: number;
  cliente_nome: string;
  data: string;
  data_devolucao: string;
  devolvido: boolean;
  itens: CondicionalItem[];
}

