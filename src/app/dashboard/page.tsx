'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { SuccessModal } from '@/components/SuccessModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { itemsService } from '@/services/items.service';
import { Item } from '@/types/item';
import { Pencil, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AxiosError } from 'axios';

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
  details: SaleHistoryDetail[];
};

const STORAGE_KEY = 'dressfy-sales-history';

const getEntryItems = (entry: SaleHistoryEntry) =>
  entry.details.length
    ? entry.details.reduce((total, detail) => total + detail.quantity, 0)
    : entry.items;

const getEntryAmount = (entry: SaleHistoryEntry) =>
  entry.details.length
    ? entry.details.reduce((total, detail) => total + detail.subtotal, 0)
    : entry.amount;

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    nome: '',
    tamanho: '',
    status: '',
    valor: '',
    cor: ''
  });
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [modalVariant, setModalVariant] = useState<'success' | 'error'>('success');
  const [modalTitle, setModalTitle] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [salesHistory, setSalesHistory] = useState<SaleHistoryEntry[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedRange, setAppliedRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });

  // Carrega histórico salvo localmente (mesmo padrão da tela de preparar venda)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed: SaleHistoryEntry[] = JSON.parse(stored).map(
        (entry: Partial<SaleHistoryEntry>): SaleHistoryEntry => ({
          timestamp: entry.timestamp ?? new Date().toISOString(),
          items: entry.items ?? 0,
          amount: entry.amount ?? 0,
          method: entry.method ?? 'Desconhecido',
          details:
            entry.details?.map((detail) => ({
              id: detail?.id ?? 0,
              name: detail?.name ?? 'Item',
              quantity: detail?.quantity ?? 0,
              unitPrice: detail?.unitPrice ?? 0,
              subtotal: detail?.subtotal ?? 0
            })) ?? []
        })
      );

      parsed.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setSalesHistory(parsed);
    } catch (error) {
      console.error('Erro ao carregar histórico de vendas:', error);
    }
  }, []);

  const filteredHistory = useMemo(() => {
    if (!appliedRange.start && !appliedRange.end) return salesHistory;

    return salesHistory.filter((entry) => {
      const ts = new Date(entry.timestamp).getTime();
      if (appliedRange.start && ts < appliedRange.start.getTime()) return false;
      if (appliedRange.end && ts > appliedRange.end.getTime()) return false;
      return true;
    });
  }, [appliedRange, salesHistory]);

  const totalVendasPeriodo = filteredHistory.length;
  const totalItensPeriodo = useMemo(
    () => filteredHistory.reduce((total, entry) => total + getEntryItems(entry), 0),
    [filteredHistory]
  );
  const totalArrecadadoPeriodo = useMemo(
    () => filteredHistory.reduce((total, entry) => total + getEntryAmount(entry), 0),
    [filteredHistory]
  );

  const loadItems = async () => {
    try {
      setLoading(true);
      const valorNum = filters.valor ? parseFloat(filters.valor.replace(/[^\d.,]/g, '').replace(',', '.')) : undefined;
      
      console.log('🔍 Filtros aplicados:', {
        nome: filters.nome,
        tamanho: filters.tamanho,
        cor: filters.cor,
        valor: filters.valor,
        valorNum: valorNum,
        status: filters.status
      });
      
      const queryParams = {
        page: currentPage,
        limit: 10,
        ...(filters.nome && { nome: filters.nome }),
        ...(filters.tamanho && { tamanho: filters.tamanho }),
        ...(filters.cor && { cor: filters.cor }),
        ...(valorNum && !isNaN(valorNum) && { preco: valorNum })
      };
      
      console.log('📡 Enviando para API:', queryParams);
      
      const response = await itemsService.getAll(queryParams);

      if (response.success) {
        console.log('✅ Resposta da API:', response);
        
        // Remover # dos nomes dos produtos
        let itemsWithoutHash = response.data.map(item => ({
          ...item,
          nome: item.nome.replace(/#\d+$/, '').trim()
        }));

        const statusFilter = filters.status.trim().toLowerCase();
        if (statusFilter) {
          itemsWithoutHash = itemsWithoutHash.filter(item => {
            const itemStatus = item.quantidade > 0 ? 'disponível' : 'indisponível';
            return itemStatus.includes(statusFilter);
          });
        }

        if (valorNum && !isNaN(valorNum)) {
          itemsWithoutHash = itemsWithoutHash.filter(item => {
            return Math.abs(item.preco - valorNum) < 0.01;
          });
        }

        console.log(`📊 Items encontrados: ${itemsWithoutHash.length}`);

        setItems(itemsWithoutHash);
        setTotalPages(response.pagination.totalPages ?? 1);
      } else {
        console.error('❌ Erro na resposta da API:', response);
      }
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.nome, filters.tamanho, filters.cor, filters.valor, filters.status]);

  useEffect(() => {
    loadItems();
  }, [currentPage, filters]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadItems();
  };

  const handleClearFilter = (filterName: string) => {
    setFilters(prev => ({ ...prev, [filterName]: '' }));
  };

  const handleDeleteRequest = (item: Item) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      setIsDeleting(true);
      await itemsService.delete(itemToDelete.id);
      await loadItems();
      setModalVariant('success');
      setModalTitle('Tudo certo!');
      setSuccessMessage('Item excluído com sucesso!');
      setSuccessModalOpen(true);
    } catch (error) {
      console.error('Erro ao deletar item:', error);
      setModalVariant('error');

      let message = 'Não foi possível excluir o item.';
      if (error && typeof error === 'object') {
        const axiosError = error as AxiosError<{
          message?: string;
          errors?: Array<{ message?: string }>;
        }>;
        const apiMessage =
          axiosError.response?.data?.errors?.[0]?.message ??
          axiosError.response?.data?.message;
        if (apiMessage) {
          message = apiMessage;
        }
      }

      setModalTitle('Não foi possível excluir');
      setSuccessMessage(message);
      setSuccessModalOpen(true);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const applyDateRange = () => {
    if (!startDate && !endDate) {
      setAppliedRange({ start: null, end: null });
      return;
    }

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    setAppliedRange({ start, end });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activePage="estoque" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Meu Estoque</h2>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome
              </label>
              <div className="relative">
                <Input
                  placeholder="Ex: Vestido Floral Longo"
                  value={filters.nome}
                  onChange={(e) => setFilters({ ...filters, nome: e.target.value })}
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

            {/* Tamanho */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tamanho
              </label>
              <div className="relative">
                <Input
                  placeholder="Ex: GG"
                  value={filters.tamanho}
                  onChange={(e) => setFilters({ ...filters, tamanho: e.target.value })}
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

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <div className="relative">
                <Input
                  placeholder="Disponível"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
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

            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor
              </label>
              <div className="relative">
                <Input
                  placeholder="R$ 120.00"
                  value={filters.valor}
                  onChange={(e) => setFilters({ ...filters, valor: e.target.value })}
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

            {/* Cor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor
              </label>
              <div className="relative">
                <Input
                  placeholder="Amarelo"
                  value={filters.cor}
                  onChange={(e) => setFilters({ ...filters, cor: e.target.value })}
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

          <div className="flex justify-end">
            <Button
              onClick={() => router.push('/cadastrar-item')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Cadastrar Item
            </Button>
          </div>
        </div>

        {/* Resumo de vendas (histórico local) */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Início do período</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Final do período</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
                onClick={applyDateRange}
                disabled={!!startDate && !!endDate && new Date(startDate) > new Date(endDate)}
              >
                Aplicar intervalo
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-center shadow-sm">
              <div className="text-sm text-emerald-700">Vendas no período</div>
              <div className="text-2xl font-semibold text-emerald-600">{totalVendasPeriodo}</div>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-center shadow-sm">
              <div className="text-sm text-blue-700">Itens vendidos</div>
              <div className="text-2xl font-semibold text-blue-600">{totalItensPeriodo}</div>
            </div>
            <div className="rounded-lg border border-purple-100 bg-purple-50 p-4 text-center shadow-sm">
              <div className="text-sm text-purple-700">Total arrecadado</div>
              <div className="text-2xl font-semibold text-purple-600">
                {formatCurrency(totalArrecadadoPeriodo)}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Carregando itens...
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum item encontrado
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tamanho
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unidades
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr 
                      key={item.id} 
                      onClick={() => router.push(`/visualizar-item/${item.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {item.nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {item.tamanho}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {item.quantidade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {item.quantidade > 0 ? 'Disponível' : 'Indisponível'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(item.preco)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {item.cor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDeleteRequest(item)}
                            className="text-red-600 hover:text-red-900 transition"
                            title="Deletar item"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-center border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`px-3 py-1 rounded ${
                          currentPage === i + 1
                            ? 'bg-emerald-500 text-white'
                            : 'hover:bg-gray-200'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <SuccessModal
        open={successModalOpen}
        title={modalTitle}
        message={successMessage || 'Operação concluída.'}
        variant={modalVariant}
        onPrimaryAction={() => {
          setSuccessModalOpen(false);
          setSuccessMessage('');
          setModalTitle(undefined);
          setModalVariant('success');
        }}
        onClose={() => {
          setSuccessModalOpen(false);
          setSuccessMessage('');
          setModalTitle(undefined);
          setModalVariant('success');
        }}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Excluir item"
        description="Tem certeza que deseja deletar este item? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
