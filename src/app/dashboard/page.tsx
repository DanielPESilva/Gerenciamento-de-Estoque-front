'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { SuccessModal } from '@/components/SuccessModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { itemsService } from '@/services/items.service';
import { Item } from '@/types/item';
import { Pencil, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState({
    nome: '',
    tamanho: '',
    status: '',
    valor: '',
    cor: ''
  });
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

        // Filtrar por status (Disponível/Indisponível)
        if (filters.status) {
          itemsWithoutHash = itemsWithoutHash.filter(item => {
            const itemStatus = item.quantidade > 0 ? 'Disponível' : 'Indisponível';
            return itemStatus.toLowerCase().includes(filters.status.toLowerCase());
          });
        }

        if (valorNum && !isNaN(valorNum)) {
          itemsWithoutHash = itemsWithoutHash.filter(item => {
            return Math.abs(item.preco - valorNum) < 0.01;
          });
        }

        console.log(`📊 Items encontrados: ${itemsWithoutHash.length}`);
        
        setItems(itemsWithoutHash);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
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
      setSuccessMessage('Item excluído com sucesso!');
      setSuccessModalOpen(true);
    } catch (error) {
      console.error('Erro ao deletar item:', error);
      setSuccessMessage('Erro ao deletar item.');
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
        message={successMessage || 'Operação concluída.'}
        onClose={() => setSuccessModalOpen(false)}
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
