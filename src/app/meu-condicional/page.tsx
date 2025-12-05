'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SuccessModal } from '@/components/SuccessModal';
import { condicionaisListService } from '@/services/condicionais-list.service';
import { condicionaisService } from '@/services/condicionais.service';
import { Condicional } from '@/types/condicional';
import { Loader2, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface FilterState {
  nome: string;
  status: '' | 'ativos' | 'devolvidos';
}

const initialFilterState: FilterState = {
  nome: '',
  status: ''
};

const PAYMENT_METHODS: Array<
  | 'Pix'
  | 'Dinheiro'
  | 'Cartão de Crédito'
  | 'Cartão de Débito'
  | 'Boleto'
  | 'Cheque'
  | 'Permuta'
> = ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Cheque', 'Permuta'];

export default function MeuCondicionalPage() {
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [condicionais, setCondicionais] = useState<Condicional[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedCondicional, setSelectedCondicional] = useState<Condicional | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [saleItems, setSaleItems] = useState<
    Record<number, { selected: boolean; quantidade: number }>
  >({});
  const [salePaymentMethod, setSalePaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]>('Pix');
  const [saleDiscount, setSaleDiscount] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [saleProcessing, setSaleProcessing] = useState(false);

  const loadCondicionais = async (page = 1) => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 6
      };

      if (filters.nome) {
        // API aceita cliente_id; precisamos filtrar client-side pelo nome
      }
      if (filters.status) {
        params.devolvido = filters.status === 'devolvidos';
      }

      const result = await condicionaisListService.getAll(params);

      let data = result.condicionais;

      if (filters.nome) {
        data = data.filter((cond) =>
          cond.cliente_nome.toLowerCase().includes(filters.nome.toLowerCase())
        );
      }

      setCondicionais(data);
      setTotalPages(result.pagination.totalPages);
      return data;
    } catch (error) {
      console.error('Erro ao carregar condicionais:', error);
      setSuccessMessage('Erro ao carregar condicionais. Tente novamente.');
      setSuccessModalOpen(true);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCondicionais(currentPage);
  }, [currentPage]);

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadCondicionais(1);
  };

  const handleClearFilters = () => {
    setFilters(initialFilterState);
    setCurrentPage(1);
    loadCondicionais(1);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este condicional?')) {
      return;
    }

    try {
      setDeletingId(id);
      await condicionaisListService.delete(id);
      setSuccessMessage('Condicional removido com sucesso.');
      setSuccessModalOpen(true);
      await loadCondicionais(currentPage);
      if (selectedCondicional?.id === id) {
        setSelectedCondicional(null);
      }
    } catch (error) {
      console.error('Erro ao excluir condicional:', error);
      setSuccessMessage('Erro ao excluir condicional.');
      setSuccessModalOpen(true);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSaleItem = (itemId: number, maxQuantity: number) => {
    setSaleItems((prev) => {
      const current = prev[itemId];
      const wasSelected = current?.selected ?? false;
      const previousQuantity = current?.quantidade ?? 0;
      const nextSelected = !wasSelected;
      const nextQuantity = nextSelected
        ? previousQuantity > 0
          ? Math.min(previousQuantity, maxQuantity)
          : Math.min(1, maxQuantity)
        : 0;
      return {
        ...prev,
        [itemId]: {
          selected: nextSelected && nextQuantity > 0,
          quantidade: nextQuantity
        }
      };
    });
  };

  const updateSaleItemQuantity = (itemId: number, delta: number, max: number) => {
    setSaleItems((prev) => {
      const current = prev[itemId];
      if (!current) return prev;

      const nextQuantity = Math.max(0, Math.min(max, current.quantidade + delta));

      return {
        ...prev,
        [itemId]: {
          selected: nextQuantity > 0 ? true : false,
          quantidade: nextQuantity
        }
      };
    });
  };

  const resetSaleState = useCallback(() => {
    if (!selectedCondicional) {
      setSaleItems({});
      setSalePaymentMethod('Pix');
      setSaleDiscount('');
      setSaleNotes('');
      return;
    }

    const initial: Record<number, { selected: boolean; quantidade: number }> = {};
    selectedCondicional.itens.forEach((item) => {
      initial[item.id] = {
        selected: true,
        quantidade: item.quantidade
      };
    });
    setSaleItems(initial);
    setSalePaymentMethod('Pix');
    setSaleDiscount('');
    setSaleNotes('');
  }, [selectedCondicional]);

  useEffect(() => {
    resetSaleState();
  }, [resetSaleState]);

  const saleTotals = useMemo(() => {
    if (!selectedCondicional) {
      return {
        bruto: 0,
        desconto: 0,
        total: 0,
        itens: [] as Array<{ roupas_id: number; quantidade: number }>
      };
    }

    let bruto = 0;
    const itensSelecionados: Array<{ roupas_id: number; quantidade: number }> = [];

    selectedCondicional.itens.forEach((item) => {
      const saleState = saleItems[item.id];
      if (!saleState?.selected) return;
      const quantidade = Math.min(Math.max(saleState.quantidade, 0), item.quantidade);
      if (quantidade <= 0) return;
      itensSelecionados.push({
        roupas_id: item.roupas_id,
        quantidade
      });
      bruto += (item.valor_estimado ?? 0) * quantidade;
    });

    const parsedDiscount = saleDiscount ? Number.parseFloat(saleDiscount) : 0;
    const desconto = Number.isNaN(parsedDiscount) || parsedDiscount < 0 ? 0 : parsedDiscount;
    const descontoAplicado = Math.min(desconto, bruto);
    const total = Math.max(bruto - descontoAplicado, 0);

    return {
      bruto,
      desconto: descontoAplicado,
      total,
      itens: itensSelecionados
    };
  }, [saleItems, saleDiscount, selectedCondicional]);

  const handleConfirmSale = async () => {
    if (!selectedCondicional) return;

    if (selectedCondicional.devolvido) {
      setSuccessMessage('Este condicional já foi finalizado.');
      setSuccessModalOpen(true);
      return;
    }

    if (saleTotals.itens.length === 0) {
      setSuccessMessage('Selecione ao menos um item para registrar a venda.');
      setSuccessModalOpen(true);
      return;
    }

    setSaleProcessing(true);
    try {
      await condicionaisService.convertToSale(selectedCondicional.id, {
        itens_vendidos: saleTotals.itens,
        forma_pagamento: salePaymentMethod,
        desconto: saleTotals.desconto,
        observacoes: saleNotes.trim() ? saleNotes.trim() : undefined
      });

      setSuccessMessage('Venda registrada com sucesso!');
      setSuccessModalOpen(true);

      const updatedList = await loadCondicionais(currentPage);
      const updatedCondicional = updatedList.find(
        (cond) => cond.id === selectedCondicional.id
      );
      setSelectedCondicional(updatedCondicional ?? null);
    } catch (error) {
      console.error('Erro ao registrar venda:', error);
      setSuccessMessage('Não foi possível registrar a venda. Tente novamente.');
      setSuccessModalOpen(true);
    } finally {
      setSaleProcessing(false);
    }
  };

  const handleCancelSale = () => {
    resetSaleState();
  };

  const resumo = useMemo(() => {
    if (!selectedCondicional) return null;

    const totalItens = selectedCondicional.itens.reduce((acc, item) => acc + item.quantidade, 0);
    const valorTotal = selectedCondicional.itens.reduce(
      (acc, item) => acc + (item.valor_estimado ?? 0) * item.quantidade,
      0
    );

    return {
      totalItens,
      valorTotal
    };
  }, [selectedCondicional]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activePage="meu-condicional" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">Meus Condicionais</h1>
        </div>

        <section className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-700">Filtros</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nome do cliente
              </label>
              <Input
                placeholder="Ex: Vanessa"
                value={filters.nome}
                onChange={(e) => handleFilterChange('nome', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value as FilterState['status'])}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Todos</option>
                <option value="ativos">Ativos</option>
                <option value="devolvidos">Devolvidos</option>
              </select>
            </div>
            <div className="flex items-end gap-3">
              <Button className="bg-emerald-500 text-white hover:bg-emerald-600" onClick={handleSearch}>
                Aplicar filtros
              </Button>
              <Button variant="outline" onClick={handleClearFilters}>
                Limpar
              </Button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
          <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-700">Lista de condicionais</h2>
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 px-6 py-12 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando condicionais...
                </div>
              ) : condicionais.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 px-6 py-12 text-center text-gray-500">
                  Nenhum condicional encontrado.
                </div>
              ) : (
                condicionais.map((condicional) => (
                  <article
                    key={condicional.id}
                    onClick={() => setSelectedCondicional(condicional)}
                    className={`cursor-pointer rounded-lg border p-4 transition hover:border-emerald-400 ${
                      selectedCondicional?.id === condicional.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">{condicional.cliente_nome}</h3>
                        <p className="text-sm text-gray-500">
                          Criado em{' '}
                          {new Date(condicional.data).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-gray-500">
                          Devolução:{' '}
                          {new Date(condicional.data_devolucao).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                            condicional.devolvido
                              ? 'bg-green-100 text-green-600'
                              : 'bg-amber-100 text-amber-600'
                          }`}
                        >
                          {condicional.devolvido ? 'Devolvido' : 'Ativo'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(condicional.id);
                          }}
                          className="text-gray-400 transition hover:text-red-500"
                          disabled={deletingId === condicional.id}
                        >
                          {deletingId === condicional.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-4 text-sm text-gray-600">
                      <span>
                        Itens: {condicional.itens.length}
                      </span>
                      <span>
                        Total reservado:{' '}
                        {formatCurrency(
                          condicional.itens.reduce(
                            (acc, item) => acc + (item.valor_estimado ?? 0) * item.quantidade,
                            0
                          )
                        )}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  &lt;
                </Button>
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(index + 1)}
                    className={`rounded px-3 py-1 text-sm ${
                      currentPage === index + 1
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  &gt;
                </Button>
              </div>
            )}
          </section>

          <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-700">Detalhes do condicional</h2>
            {selectedCondicional ? (
              <div className="space-y-6">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-base font-semibold text-gray-800">
                    {selectedCondicional.cliente_nome}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Criado em{' '}
                    {new Date(selectedCondicional.data).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-sm text-gray-500">
                    Devolução prevista:{' '}
                    {new Date(selectedCondicional.data_devolucao).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-600">
                    Status:{' '}
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${
                        selectedCondicional.devolvido
                          ? 'bg-green-100 text-green-600'
                          : 'bg-amber-100 text-amber-600'
                      }`}
                    >
                      {selectedCondicional.devolvido ? 'Devolvido' : 'Ativo'}
                    </span>
                  </p>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-semibold text-gray-700">Itens incluídos</h4>
                  <div className="rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                            Selecionar
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Item
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Disponível
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Para venda
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Valor estimado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white text-sm text-gray-600">
                        {selectedCondicional.itens.map((item) => {
                          const saleState = saleItems[item.id] ?? {
                            selected: false,
                            quantidade: 0
                          };
                          const subtotal =
                            (item.valor_estimado ?? 0) * (saleState.selected ? saleState.quantidade : 0);

                          return (
                            <tr key={item.id}>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={saleState.selected && saleState.quantidade > 0}
                                  onChange={() => toggleSaleItem(item.id, item.quantidade)}
                                  disabled={selectedCondicional.devolvido || saleProcessing}
                                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                              </td>
                              <td className="px-4 py-2 font-medium text-gray-800">{item.nome_item}</td>
                              <td className="px-4 py-2">{item.quantidade}</td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => updateSaleItemQuantity(item.id, -1, item.quantidade)}
                                    disabled={
                                      selectedCondicional.devolvido ||
                                      saleProcessing ||
                                      saleState.quantidade <= 0
                                    }
                                    className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-emerald-500 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center text-sm font-semibold text-gray-800">
                                    {saleState.quantidade}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateSaleItemQuantity(item.id, 1, item.quantidade)}
                                    disabled={
                                      selectedCondicional.devolvido ||
                                      saleProcessing ||
                                      saleState.quantidade >= item.quantidade
                                    }
                                    className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-emerald-500 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                {subtotal > 0 ? formatCurrency(subtotal) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedCondicional.devolvido ? (
                  <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Este condicional já foi finalizado como venda. Revise o histórico ou selecione outro
                    registro para novas operações.
                  </div>
                ) : (
                  <div className="mt-6 space-y-4 rounded-lg border border-gray-200 p-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700">Forma de pagamento</h4>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {PAYMENT_METHODS.map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setSalePaymentMethod(method)}
                            disabled={saleProcessing}
                            className={`rounded-lg border px-3 py-2 text-sm transition ${
                              salePaymentMethod === method
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:text-emerald-600'
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700" htmlFor="sale-discount">
                          Desconto (R$)
                        </label>
                        <Input
                          id="sale-discount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={saleDiscount}
                          onChange={(event) => setSaleDiscount(event.target.value)}
                          disabled={saleProcessing}
                          placeholder="Ex: 50.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700" htmlFor="sale-notes">
                          Observações (opcional)
                        </label>
                        <textarea
                          id="sale-notes"
                          rows={3}
                          value={saleNotes}
                          onChange={(event) => setSaleNotes(event.target.value)}
                          disabled={saleProcessing}
                          placeholder="Ex: Pagamento no crédito em 2x."
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                      <div className="flex justify-between">
                        <span>Valor bruto selecionado</span>
                        <span className="font-semibold text-emerald-800">
                          {formatCurrency(saleTotals.bruto)}
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <span>Desconto aplicado</span>
                        <span className="font-semibold text-emerald-800">
                          {formatCurrency(saleTotals.desconto)}
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between text-base">
                        <span>Total final</span>
                        <span className="font-semibold text-emerald-900">
                          {formatCurrency(saleTotals.total)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={handleCancelSale}
                        disabled={saleProcessing}
                        className="min-w-[120px]"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleConfirmSale}
                        disabled={saleProcessing}
                        className="min-w-[160px] bg-emerald-500 text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saleProcessing ? 'Registrando...' : 'Registrar venda'}
                      </Button>
                    </div>
                  </div>
                )}

                {resumo && (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                    <div>
                      Quantidade total de itens:{' '}
                      <span className="font-semibold text-emerald-800">{resumo.totalItens}</span>
                    </div>
                    <div>
                      Valor estimado total:{' '}
                      <span className="font-semibold text-emerald-800">
                        {formatCurrency(resumo.valorTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 px-6 py-12 text-center text-gray-500">
                Selecione um condicional na lista para visualizar detalhes.
              </div>
            )}
          </section>
        </div>
      </main>

      <SuccessModal
        open={successModalOpen}
        message={successMessage || 'Operação concluída.'}
        onClose={() => setSuccessModalOpen(false)}
        onPrimaryAction={() => setSuccessModalOpen(false)}
      />
    </div>
  );
}

