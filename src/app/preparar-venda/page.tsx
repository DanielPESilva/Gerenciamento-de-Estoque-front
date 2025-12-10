'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SuccessModal } from '@/components/SuccessModal';
import { itemsService } from '@/services/items.service';
import { Item } from '@/types/item';
import { SaleItem } from '@/types/sale';
import { CheckCircle2, CreditCard, Loader2, Minus, Plus, Trash2, X, ChevronDown, Check } from 'lucide-react';
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
  const [salesHistory, setSalesHistory] = useState<
    { timestamp: string; items: number; amount: number; method: string }[]
  >([]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('dressfy-sales-history');
    if (!stored) return;
    try {
      setSalesHistory(JSON.parse(stored));
    } catch (err) {
      console.error('Erro ao carregar histórico de vendas:', err);
    }
  }, []);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

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

  const handleConfirmSale = async () => {
    if (Object.keys(selectedItems).length === 0) {
      setSuccessMessage('Selecione ao menos um item para registrar a venda.');
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

      const saleEntry = {
        timestamp: new Date().toISOString(),
        items: totalQuantidade,
        amount: totalValor,
        method: paymentMethod
      };

      setSalesHistory((prev) => {
        const updated = [saleEntry, ...prev].slice(0, 3);
        if (typeof window !== 'undefined') {
          localStorage.setItem('dressfy-sales-history', JSON.stringify(updated));
        }
        return updated;
      });

      setSuccessMessage(`Venda concluída com sucesso!

Itens removidos: ${totalQuantidade}
Valor total: ${formatCurrency(totalValor)}
Método de pagamento: ${paymentMethod}`);
      setSuccessModalOpen(true);
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
        </section>

        {salesHistory.length > 0 && (
          <section className="mb-8 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-700">Últimas vendas</h2>
            <div className="space-y-3">
              {salesHistory.map((sale) => (
                <div
                  key={sale.timestamp}
                  className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="font-medium text-gray-800">
                    {new Date(sale.timestamp).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span>Itens: {sale.items}</span>
                    <span>Valor: {formatCurrency(sale.amount)}</span>
                    <span>Método: {sale.method}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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
                disabled={processingSale}
              >
                {processingSale ? 'Processando...' : 'Confirmar venda'}
              </Button>
            </div>
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

