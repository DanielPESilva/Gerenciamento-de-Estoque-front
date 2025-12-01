'use client';

import { useMemo, useState } from 'react';
import { SaleItem } from '@/types/sale';
import { Client } from '@/types/client';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

interface ConfirmCondicionalModalProps {
  open: boolean;
  items: Record<number, SaleItem>;
  clients: Client[];
  isSubmitting: boolean;
  defaultDate?: string;
  onClose: () => void;
  onConfirm: (clientId: number, dataDevolucao: string) => void;
}

export function ConfirmCondicionalModal({
  open,
  items,
  clients,
  isSubmitting,
  defaultDate,
  onClose,
  onConfirm
}: ConfirmCondicionalModalProps) {
  const [selectedClient, setSelectedClient] = useState<number | ''>('');
  const [devolucao, setDevolucao] = useState(defaultDate ?? '');
  const [error, setError] = useState<string | null>(null);

  const { quantidadeTotal, valorTotal } = useMemo(() => {
    return Object.values(items).reduce(
      (acc, curr) => {
        acc.quantidadeTotal += curr.quantidade;
        acc.valorTotal += curr.item.preco * curr.quantidade;
        return acc;
      },
      { quantidadeTotal: 0, valorTotal: 0 }
    );
  }, [items]);

  if (!open) {
    return null;
  }

  const handleConfirm = () => {
    if (!selectedClient) {
      setError('Selecione um cliente para o condicional.');
      return;
    }
    if (!devolucao) {
      setError('Informe a data de devolução.');
      return;
    }

    setError(null);
    onConfirm(Number(selectedClient), devolucao);
  };

  const handleClose = () => {
    setSelectedClient('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-800">Confirmar Condicional</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 transition hover:text-gray-600"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Cliente</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Selecione um cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.nome} {client.telefone ? `• ${client.telefone}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Data de devolução
              </label>
              <input
                type="datetime-local"
                value={devolucao}
                onChange={(e) => setDevolucao(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Item
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Quantidade
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white text-sm text-gray-600">
                {Object.values(items).map(({ item, quantidade }) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 font-medium text-gray-800">
                      {item.nome.replace(/#\d+$/, '').trim()}
                    </td>
                    <td className="px-4 py-2">{quantidade}</td>
                    <td className="px-4 py-2">
                      {formatCurrency(item.preco * quantidade)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
            <div>Itens selecionados: {Object.keys(items).length}</div>
            <div>Quantidade total: {quantidadeTotal}</div>
            <div>Valor total estimado: {formatCurrency(valorTotal)}</div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            className="bg-emerald-500 text-white hover:bg-emerald-600"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Criando...' : 'Confirmar condicional'}
          </Button>
        </div>
      </div>
    </div>
  );
}

