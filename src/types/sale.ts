import { Item } from './item';

export interface SaleItem {
  item: Item;
  quantidade: number;
}

export interface SaleSummary {
  totalQuantidade: number;
  totalValor: number;
}

