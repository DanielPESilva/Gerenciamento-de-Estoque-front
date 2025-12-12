'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SuccessModal } from '@/components/SuccessModal';
import { itemsService } from '@/services/items.service';
import { clientesService } from '@/services/clientes.service';
import { Item } from '@/types/item';
import { Client } from '@/types/client';
import { SaleItem } from '@/types/sale';
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Trash2,
  X,
  ChevronDown,
  Check,
  UserPlus2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterState {
  nome: string;
  tamanho: string;
  status: string;
  valor: string;
  cor: string;
}

const initialFilterState: FilterState = {
  nome: '',
  tamanho: '',
  status: '',
  valor: '',
  cor: ''
};

type SaleHistoryDetail = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type SaleHistoryEntry = {
  timestamp: string;
  items: number;
  amount: number;
  method: string;
  client?: {
    id: number | null;
    name: string;
  };
  details: SaleHistoryDetail[];
};

const getHistoryItems = (entry: SaleHistoryEntry) =>
  entry.details.length
    ? entry.details.reduce((total, detail) => total + detail.quantity, 0)
    : entry.items;

const getHistoryAmount = (entry: SaleHistoryEntry) =>
  entry.details.length
    ? entry.details.reduce((total, detail) => total + detail.subtotal, 0)
    : entry.amount;

export default function PrepararVendaPage() {
  const router = useRouter();

  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Record<number, SaleItem>>({});
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [processingSale, setProcessingSale] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [salesHistory, setSalesHistory] = useState<SaleHistoryEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('dressfy-sales-history');
    if (!stored) return;
    try {
        const parsed: SaleHistoryEntry[] = JSON.parse(stored).map(
          (entry: Partial<SaleHistoryEntry> & { clientName?: string; cliente?: string }): SaleHistoryEntry => {
            const fallbackClientName =
              entry.client?.name ??
              entry.clientName ??
              entry.cliente ??
              'Cliente não informado';

            return {
              timestamp: entry.timestamp ?? new Date().toISOString(),
              items: entry.items ?? 0,
              amount: entry.amount ?? 0,
              method: entry.method ?? 'Desconhecido',
              client: {
                id:
                  typeof entry.client?.id === 'number'
                    ? entry.client.id
                    : null,
                name: fallbackClientName
              },
              details:
                entry.details?.map((detail) => ({
                  id: detail?.id ?? 0,
                  name: detail?.name ?? 'Item',
                  quantity: detail?.quantity ?? 0,
                  unitPrice: detail?.unitPrice ?? 0,
                  subtotal: detail?.subtotal ?? 0
                })) ?? []
            };
          }
        );
      parsed.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setSalesHistory(parsed);
    } catch (err) {
      console.error('Erro ao carregar histórico de vendas:', err);
    }
  }, []);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  const loadClients = useCallback(async () => {
    try {
      setClientsLoading(true);
      const response = await clientesService.getAll({ page: 1, limit: 500 });
      const items = response.data ?? [];
      const sorted = [...items].sort((a, b) =>
        (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR', {
          sensitivity: 'base'
        })
      );
      setClients(sorted);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    const handleFocus = () => {
      if (!document.hidden) {
        void loadClients();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'dressfy-clients-updated') {
        void loadClients();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [loadClients]);

  const loadItems = async (page = 1) => {
    try {
      setLoading(true);
      const valorNum = filters.valor ? parseFloat(filters.valor.replace(/[^\d.,]/g, '').replace(',', '.')) : undefined;

      const queryParams = {
        page,
        limit: 10,
        ...(filters.nome && { nome: filters.nome }),
        ...(filters.tamanho && { tamanho: filters.tamanho }),
        ...(filters.cor && { cor: filters.cor }),
        ...(filters.status && { status: filters.status }),
        ...(valorNum && !isNaN(valorNum) && { preco: valorNum })
      };

      const response = await itemsService.getAll(queryParams);

      if (response.success) {
        const itensDisponiveis = response.data.filter((item) => item.quantidade > 0);
        setItems(itensDisponiveis);
        setTotalPages(response.pagination.totalPages);
      }
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems(currentPage);
  }, [currentPage]);

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadItems(1);
  };

  const handleClearFilter = (field: keyof FilterState) => {
    setFilters((prev) => ({
      ...prev,
      [field]: ''
    }));
    setCurrentPage(1);
    loadItems(1);
  };

  const handleSelectItem = (item: Item) => {
    setSelectedItems((prev) => {
      const alreadySelected = prev[item.id];
      if (alreadySelected) {
        // Incrementa unidade se ainda houver estoque disponível
        if (alreadySelected.quantidade < item.quantidade) {
          return {
            ...prev,
            [item.id]: {
              item,
              quantidade: alreadySelected.quantidade + 1
            }
          };
        }
        return prev;
      }

      return {
        ...prev,
        [item.id]: {
          item,
          quantidade: 1
        }
      };
    });
  };

  const handleDecreaseQuantity = (itemId: number) => {
    setSelectedItems((prev) => {
      const current = prev[itemId];
      if (!current) return prev;

      if (current.quantidade <= 1) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [itemId]: {
          ...current,
          quantidade: current.quantidade - 1
        }
      };
    });
  };

  const handleIncreaseQuantity = (itemId: number) => {
    setSelectedItems((prev) => {
      const current = prev[itemId];
      if (!current) return prev;

      if (current.quantidade >= current.item.quantidade) {
        return prev;
      }

      return {
        ...prev,
        [itemId]: {
          ...current,
          quantidade: current.quantidade + 1
        }
      };
    });
  };

  const removeSelectedItem = (itemId: number) => {
    setSelectedItems((prev) => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
  };

  const totalQuantidade = useMemo(() => {
    return Object.values(selectedItems).reduce((acc, curr) => acc + curr.quantidade, 0);
  }, [selectedItems]);

  const totalValor = useMemo(() => {
    return Object.values(selectedItems).reduce(
      (acc, curr) => acc + curr.item.preco * curr.quantidade,
      0
    );
  }, [selectedItems]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const normalizeText = useCallback((value: string) => {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }, []);

  const sanitizeDigits = useCallback((value: string | null | undefined) => {
    return (value ?? '').replace(/\D/g, '');
  }, []);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) {
      return clients;
    }
    const termNormalized = normalizeText(clientSearch);
    const termDigits = sanitizeDigits(clientSearch);

    return clients.filter((client) => {
      const name = normalizeText(client.nome ?? '');
      const email = normalizeText(client.email ?? '');
      const phoneDigits = sanitizeDigits(client.telefone);
      const cpfDigits = sanitizeDigits(client.cpf);

      const matchesText =
        name.includes(termNormalized) || email.includes(termNormalized);

      const matchesDigits =
        termDigits.length > 0 &&
        (phoneDigits.includes(termDigits) || cpfDigits.includes(termDigits));

      return matchesText || matchesDigits;
    });
  }, [clientSearch, clients, normalizeText, sanitizeDigits]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const handleConfirmSale = async () => {
    if (Object.keys(selectedItems).length === 0) {
      setSuccessMessage('Selecione ao menos um item para registrar a venda.');
      setSuccessModalOpen(true);
      return;
    }

    if (!selectedClient) {
      setSuccessMessage('Selecione um cliente para registrar a venda.');
      setSuccessModalOpen(true);
      return;
    }

    setProcessingSale(true);

    try {
      for (const { item, quantidade } of Object.values(selectedItems)) {
        const quantidadeRestante = Math.max(item.quantidade - quantidade, 0);
        await itemsService.update(item.id, { quantidade: quantidadeRestante });
      }

      setSelectedItems({});
      await loadItems(currentPage);

      const saleDetails: SaleHistoryDetail[] = Object.values(selectedItems).map(
        ({ item, quantidade }) => ({
          id: item.id,
          name: item.nome.replace(/#\d+$/, '').trim(),
          quantity: quantidade,
          unitPrice: item.preco,
          subtotal: item.preco * quantidade
        })
      );

      const saleEntry: SaleHistoryEntry = {
        timestamp: new Date().toISOString(),
        items: totalQuantidade,
        amount: totalValor,
        method: paymentMethod,
        client: {
          id: selectedClient.id ?? null,
          name: selectedClient.nome
        },
        details: saleDetails
      };

      setSalesHistory((prev) => {
        const updated = [saleEntry, ...prev]
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() -
              new Date(a.timestamp).getTime()
          )
          .slice(0, 200);
        if (typeof window !== 'undefined') {
          localStorage.setItem('dressfy-sales-history', JSON.stringify(updated));
        }
        return updated;
      });

      setSuccessMessage(`Venda concluída com sucesso!

Itens removidos: ${totalQuantidade}
Valor total: ${formatCurrency(totalValor)}
Método de pagamento: ${paymentMethod}
Cliente: ${selectedClient.nome}`);
      setSuccessModalOpen(true);
      setSelectedClientId(null);
      setClientSearch('');
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      setSuccessMessage('Erro ao finalizar venda. Tente novamente.');
      setSuccessModalOpen(true);
    } finally {
      setProcessingSale(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activePage="preparar-venda" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 text-center">Preparar Venda</h1>
        </div>

        {/* Filters */}
        <section className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-700">Filtros</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
              <div className="relative">
                <Input
                  placeholder="Ex: Vestido Floral Longo"
                  value={filters.nome}
                  onChange={(e) => handleFilterChange('nome', e.target.value)}
                  className="pr-8"
                />
                {filters.nome && (
                  <button
                    onClick={() => handleClearFilter('nome')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tamanho</label>
              <div className="relative">
                <Input
                  placeholder="Ex: GG"
                  value={filters.tamanho}
                  onChange={(e) => handleFilterChange('tamanho', e.target.value)}
                  className="pr-8"
                />
                {filters.tamanho && (
                  <button
                    onClick={() => handleClearFilter('tamanho')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <div className="relative">
                <Input
                  placeholder="Disponível"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="pr-8"
                />
                {filters.status && (
                  <button
                    onClick={() => handleClearFilter('status')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Valor</label>
              <div className="relative">
                <Input
                  placeholder="R$ 120,00"
                  value={filters.valor}
                  onChange={(e) => handleFilterChange('valor', e.target.value)}
                  className="pr-8"
                />
                {filters.valor && (
                  <button
                    onClick={() => handleClearFilter('valor')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Cor</label>
              <div className="relative">
                <Input
                  placeholder="Ex: Azul"
                  value={filters.cor}
                  onChange={(e) => handleFilterChange('cor', e.target.value)}
                  className="pr-8"
                />
                {filters.cor && (
                  <button
                    onClick={() => handleClearFilter('cor')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Button onClick={handleSearch} className="bg-emerald-500 text-white hover:bg-emerald-600">
              Aplicar filtros
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters(initialFilterState);
                setCurrentPage(1);
                loadItems(1);
              }}
            >
              Limpar filtros
            </Button>
          </div>
        </section>

        {/* Selected summary */}
        <section className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-700">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Resumo da Venda
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-center">
              <div className="text-sm text-emerald-800">Itens selecionados</div>
              <div className="text-2xl font-bold text-emerald-600">{Object.keys(selectedItems).length}</div>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-center">
              <div className="text-sm text-blue-800">Quantidade total</div>
              <div className="text-2xl font-bold text-blue-600">{totalQuantidade}</div>
            </div>
            <div className="rounded-lg border border-purple-100 bg-purple-50 p-4 text-center">
              <div className="text-sm text-purple-800">Valor total</div>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(totalValor)}</div>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-center">
              <div className="text-sm text-amber-800">Pagamento</div>
              <button
                type="button"
                onClick={() => setShowPaymentOptions((prev) => !prev)}
                className="group mt-1 flex w-full items-center justify-center gap-2 text-base font-semibold text-amber-700 transition hover:text-amber-800 focus:outline-none"
              >
                <CreditCard className="h-4 w-4" />
                {paymentMethod}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    showPaymentOptions ? 'rotate-180' : 'rotate-0'
                  )}
                />
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {showPaymentOptions && (
              <div className="flex flex-wrap gap-2 rounded-lg border border-amber-100 bg-amber-50/70 p-3 text-sm text-gray-600 sm:justify-start">
                {['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Cheque', 'Permuta'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(option);
                      setShowPaymentOptions(false);
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-1 transition',
                      option === paymentMethod
                        ? 'border-amber-400 bg-amber-100 text-amber-700 font-medium'
                        : 'border-transparent bg-white text-gray-600 hover:border-amber-200 hover:bg-amber-50'
                    )}
                  >
                    {option === paymentMethod && <Check className="h-4 w-4" />}
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 space-y-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-800">Cliente selecionado</p>
                <p className="text-sm text-emerald-700">
                  {selectedClient ? selectedClient.nome : 'Nenhum cliente selecionado'}
                </p>
                {selectedClient && (
                  <p className="text-xs text-emerald-600">
                    {selectedClient.email ?? 'Sem e-mail cadastrado'}
                    {selectedClient.telefone ? ` • ${selectedClient.telefone}` : ''}
                  </p>
                )}
              </div>
              <Link
                href="/clientes"
                className="inline-flex items-center justify-center rounded-md border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
              >
                Gerenciar clientes
              </Link>
            </div>
            {!selectedClient && (
              <p className="text-xs text-emerald-700">
                Escolha o cliente na lista abaixo para continuar o registro da venda.
              </p>
            )}
          </div>
        </section>

        <section className="mb-8 rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">Últimas vendas</h2>
            <Link
              href="/historico-vendas"
              className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
            >
              Ver histórico completo
            </Link>
          </div>
          {salesHistory.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              Nenhuma venda registrada recentemente.
            </div>
          ) : (
            <div className="space-y-3">
              {salesHistory.slice(0, 3).map((sale, index) => (
                <div
                  key={`${sale.timestamp}-${index}`}
                  className="flex flex-col gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="font-medium text-emerald-800">
                    {new Date(sale.timestamp).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-emerald-700">
                    <span>
                      Itens:{' '}
                      <strong>{getHistoryItems(sale)}</strong>
                    </span>
                    <span>
                      Valor:{' '}
                      <strong>{formatCurrency(getHistoryAmount(sale))}</strong>
                    </span>
                    <span>
                      Método: <strong>{sale.method}</strong>
                    </span>
                    <span>
                      Cliente:{' '}
                      <strong>{sale.client?.name ?? 'Não informado'}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
          {/* Items list */}
          <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-700">Estoque disponível</h2>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-6 py-12 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando itens...
                </div>
              ) : items.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  Nenhum item disponível com os filtros atuais.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Tamanho
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Disponível
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Valor
                      </th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {item.nome.replace(/#\d+$/, '').trim()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.tamanho}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.quantidade}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {formatCurrency(item.preco)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectItem(item)}
                            disabled={item.quantidade <= (selectedItems[item.id]?.quantidade ?? 0)}
                          >
                            Adicionar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
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

          {/* Selected items */}
          <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-700">Itens selecionados</h2>

            {Object.keys(selectedItems).length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center text-gray-500">
                Nenhum item selecionado ainda. Escolha itens no quadro ao lado.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.values(selectedItems).map(({ item, quantidade }) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-gray-200 p-4 shadow-sm"
                  >
                    <div className="flex justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-gray-800">
                          {item.nome.replace(/#\d+$/, '').trim()}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Tamanho: {item.tamanho} • Cor: {item.cor}
                        </p>
                      </div>
                      <button
                        className="text-gray-400 transition hover:text-red-500"
                        onClick={() => removeSelectedItem(item.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="rounded-full border border-gray-300 p-1 text-gray-600 transition hover:border-emerald-500 hover:text-emerald-600"
                          onClick={() => handleDecreaseQuantity(item.id)}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-10 text-center text-base font-semibold text-gray-800">
                          {quantidade}
                        </span>
                        <button
                          type="button"
                          className="rounded-full border border-gray-300 p-1 text-gray-600 transition hover:border-emerald-500 hover:text-emerald-600"
                          onClick={() => handleIncreaseQuantity(item.id)}
                          disabled={quantidade >= item.quantidade}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Subtotal</div>
                        <div className="text-lg font-semibold text-emerald-600">
                          {formatCurrency(item.preco * quantidade)}
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      Disponíveis: {item.quantidade} • Em venda: {quantidade}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-700">Cliente da venda</h3>
                  <p className="text-xs text-gray-500">
                    Busque e selecione o cliente responsável por esta venda.
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-emerald-600 transition hover:text-emerald-700"
                  onClick={() => {
                    setSelectedClientId(null);
                    setClientSearch('');
                  }}
                >
                  Limpar seleção de cliente
                </button>
              </div>
              <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Input
                    placeholder="Buscar por nome, e-mail, telefone ou CPF"
                    value={clientSearch}
                    onChange={(event) => setClientSearch(event.target.value)}
                    className="sm:max-w-xs"
                    disabled={clientsLoading}
                  />
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span>Total cadastrados: {clients.length}</span>
                    {selectedClient && (
                      <span className="text-emerald-600">
                        Cliente selecionado: {selectedClient.nome}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-100">
                {clientsLoading ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando clientes...
                    </div>
                  ) : filteredClients.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-gray-500">
                      {clients.length === 0
                        ? 'Nenhum cliente cadastrado. Utilize o botão abaixo para cadastrar.'
                        : 'Nenhum cliente encontrado com o termo informado.'}
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">Nome</th>
                            <th className="px-4 py-3 text-left font-semibold">Contato</th>
                            <th className="px-4 py-3 text-left font-semibold">CPF</th>
                            <th className="px-4 py-3 text-right font-semibold">
                              Selecionar
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {filteredClients.map((client) => {
                            const isActive = client.id === selectedClientId;
                            return (
                              <tr
                                key={client.id ?? `${client.nome}-${client.email}`}
                                className={cn(
                                  'transition hover:bg-gray-50',
                                  isActive && 'bg-emerald-50/80'
                                )}
                              >
                                <td className="px-4 py-3 font-medium text-gray-800">
                                  {client.nome}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  <div className="flex flex-col gap-1">
                                    <span>{client.email ?? 'Sem e-mail'}</span>
                                    <span className="text-xs text-gray-500">
                                      {client.telefone ?? 'Sem telefone'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  {client.cpf ?? '—'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex justify-end gap-2">
                                    {isActive ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                        <Check className="h-3 w-3" />
                                        Selecionado
                                      </span>
                                    ) : (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedClientId(client.id ?? null)}
                                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                      >
                                        Selecionar
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-start gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Quer cadastrar um novo cliente? Clique em &quot;Cadastrar cliente&quot; para abrir a tela dedicada. Ao retornar, a lista será atualizada automaticamente.
                  </span>
                  <Link
                    href="/clientes"
                    className="inline-flex items-center gap-2 text-emerald-600 transition hover:text-emerald-700"
                  >
                    <UserPlus2 className="h-4 w-4" />
                    Cadastrar cliente
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Quantidade total</span>
                <span className="font-semibold text-gray-800">{totalQuantidade}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Valor total</span>
                <span className="text-lg font-semibold text-gray-800">
                  {formatCurrency(totalValor)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => setSelectedItems({})}>
                Limpar seleção
              </Button>
              <Button
                className="bg-emerald-500 text-white hover:bg-emerald-600"
                onClick={handleConfirmSale}
                disabled={processingSale || !selectedClient}
              >
                {processingSale ? 'Processando...' : 'Confirmar venda'}
              </Button>
            </div>
            {!selectedClient && (
              <p className="text-xs text-red-500">
                Selecione um cliente para habilitar a finalização da venda.
              </p>
            )}
          </section>
        </div>
      </main>

      <SuccessModal
        open={successModalOpen}
        message={successMessage || 'Venda registrada com sucesso!'}
        onClose={() => setSuccessModalOpen(false)}
        onPrimaryAction={() => setSuccessModalOpen(false)}
        primaryLabel="Ok, entendi"
      />
    </div>
  );
}

