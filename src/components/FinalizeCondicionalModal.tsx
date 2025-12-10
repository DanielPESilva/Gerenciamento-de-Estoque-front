'use client';

import { useMemo, useState } from 'react';
import { Condicional } from '@/types/condicional';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

const PAYMENT_METHODS: Array<
  | 'Pix'
  | 'Dinheiro'
  | 'Cartão de Crédito'
  | 'Cartão de Débito'
  | 'Boleto'
  | 'Cheque'
  | 'Permuta'
> = ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Cheque', 'Permuta'];

interface FinalizeCondicionalModalProps {
  open: boolean;
  condicional: Condicional | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (params: {
    forma_pagamento: typeof PAYMENT_METHODS[number];
    observacoes?: string;
    descricao_permuta?: string;
  }) => void;
}

export function FinalizeCondicionalModal({
  open,
  condicional,
  isSubmitting,
  onClose,
  onConfirm
}: FinalizeCondicionalModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<typeof PAYMENT_METHODS[number]>('Pix');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [barterDescription, setBarterDescription] = useState('');

  const resumo = useMemo(() => {
    if (!condicional) return { totalItens: 0, valorTotal: 0 };
    const totalItens = condicional.itens.reduce((acc, item) => acc + item.quantidade, 0);
    const valorTotal = condicional.itens.reduce(
      (acc, item) => acc + (item.valor_estimado ?? 0) * item.quantidade,
      0
    );
    return { totalItens, valorTotal };
  }, [condicional]);

  if (!open || !condicional) {
    return null;
  }

  const handleConfirm = () => {
    if (!selectedMethod) {
      setError('Escolha a forma de pagamento.');
      return;
    }

    if (selectedMethod === 'Permuta' && !barterDescription.trim()) {
      setError('Descreva a permuta antes de concluir a venda.');
      return;
    }

    setError(null);
    onConfirm({
      forma_pagamento: selectedMethod,
      observacoes: notes.trim() ? notes.trim() : undefined,
      descricao_permuta:
        selectedMethod === 'Permuta' ? barterDescription.trim() : undefined
    });
  };

  const handleClose = () => {
    setNotes('');
    setBarterDescription('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-800">Registrar venda</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 transition hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          <header className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-gray-500">Cliente</p>
                <h3 className="text-lg font-semibold text-gray-800">{condicional.cliente_nome}</h3>
              </div>
              <div className="text-sm text-gray-500">
                Retirado em{' '}
                {new Date(condicional.data).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600">
              <span>
                Devolução prevista:{' '}
                {new Date(condicional.data_devolucao).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <span>
                Itens:{' '}
                <strong className="text-gray-800">
                  {condicional.itens.length} | {resumo.totalItens} peças
                </strong>
              </span>
              <span>
                Valor estimado:{' '}
                <strong className="text-gray-800">{formatCurrency(resumo.valorTotal)}</strong>
              </span>
            </div>
          </header>

          <section className="mt-6 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700">Itens enviados</h4>
              <div className="mt-2 rounded-lg border border-gray-200">
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
                        Valor estimado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white text-sm text-gray-600">
                    {condicional.itens.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 font-medium text-gray-800">{item.nome_item}</td>
                        <td className="px-4 py-2">{item.quantidade}</td>
                        <td className="px-4 py-2">
                          {item.valor_estimado
                            ? formatCurrency(item.valor_estimado * item.quantidade)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700">Forma de pagamento</h4>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(method);
                      if (method !== 'Permuta') {
                        setBarterDescription('');
                        setError(null);
                      }
                    }}
                    className={`rounded-lg border px-3 py-3 text-sm transition ${
                      selectedMethod === method
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:text-emerald-600'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {selectedMethod === 'Permuta' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700" htmlFor="barter-description">
                  Descrição da permuta <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="barter-description"
                  value={barterDescription}
                  onChange={(event) => setBarterDescription(event.target.value)}
                  placeholder="Ex: Cliente trocou por mercadorias equivalentes."
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-gray-700" htmlFor="sale-notes">
                Observações (opcional)
              </label>
              <textarea
                id="sale-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ex: Cliente realizou pagamento no crédito em 2x."
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </section>
        </div>

        <footer className="flex justify-end gap-3 border-t px-6 py-4">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            className="bg-emerald-500 text-white hover:bg-emerald-600"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registrando...' : 'Confirmar venda'}
          </Button>
        </footer>
      </div>
    </div>
  );
}


