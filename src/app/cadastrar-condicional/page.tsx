'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SuccessModal } from '@/components/SuccessModal';
import { ConfirmCondicionalModal } from '@/components/ConfirmCondicionalModal';
import { itemsService } from '@/services/items.service';
import { clientesService } from '@/services/clientes.service';
import { condicionaisService } from '@/services/condicionais.service';
import { Item } from '@/types/item';
import { Client } from '@/types/client';
import { SaleItem } from '@/types/sale';
import { Loader2, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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

function getDefaultDevolucaoDate() {
  const now = new Date();
  now.setDate(now.getDate() + 3);
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export default function CadastrarCondicionalPage() {
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Record<number, SaleItem>>({});
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        setItems(response.data.filter((item) => item.quantidade > 0));
        setTotalPages(response.pagination.totalPages);
      }
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      setClientsLoading(true);
      const response = await clientesService.getAll({ page: 1, limit: 100 });
      setClients(response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setClientsLoading(false);
    }
  };

  useEffect(() => {
    loadItems(currentPage);
  }, [currentPage]);

  useEffect(() => {
    loadClients();
  }, []);

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
      const current = prev[item.id];
      if (current) {
        if (current.quantidade < item.quantidade) {
          return {
            ...prev,
            [item.id]: {
              item,
              quantidade: current.quantidade + 1
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

  const updateQuantity = (itemId: number, delta: number) => {
    setSelectedItems((prev) => {
      const current = prev[itemId];
      if (!current) return prev;

      const newQuantity = current.quantidade + delta;

      if (newQuantity <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }

      if (newQuantity > current.item.quantidade) {
        return prev;
      }

      return {
        ...prev,
        [itemId]: {
          ...current,
          quantidade: newQuantity
        }
      };
    });
  };

  const removeItem = (itemId: number) => {
    setSelectedItems((prev) => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
  };

  const totalQuantidade = useMemo(() => {
    return Object.values(selectedItems).reduce((acc, curr) => acc + curr.quantidade, 0);
  }, [selectedItems]);

  const totalValor = useMemo(() => {
    return Object.values(selectedItems).reduce((acc, curr) => acc + curr.item.preco * curr.quantidade, 0);
  }, [selectedItems]);

  const handleOpenConfirmModal = () => {
    if (Object.keys(selectedItems).length === 0) {
      setSuccessMessage('Selecione ao menos um item para criar o condicional.');
      setSuccessModalOpen(true);
      return;
    }
    setConfirmModalOpen(true);
  };

  const handleCreateCondicional = async (clienteId: number, dataDevolucao: string) => {
    setIsSubmitting(true);
    try {
      const payload = {
        cliente_id: clienteId,
        data_devolucao: new Date(dataDevolucao).toISOString(),
        itens: Object.values(selectedItems).map(({ item, quantidade }) => ({
          roupas_id: item.id,
          quantidade
        }))
      };

      await condicionaisService.create(payload);

      setSuccessMessage('Condicional criado com sucesso!');
      setSuccessModalOpen(true);
      setSelectedItems({});
      setConfirmModalOpen(false);
      await loadItems(currentPage);
    } catch (error) {
      console.error('Erro ao criar condicional:', error);
      setSuccessMessage('Erro ao criar condicional. Verifique os dados e tente novamente.');
      setSuccessModalOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activePage="cadastrar-condicional" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">Cadastrar Condicional</h1>
        </div>

        {/* Filters */}
        <section className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-700">Filtros</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {(['nome', 'tamanho', 'status', 'valor', 'cor'] as (keyof FilterState)[]).map((field) => (
              <div key={field}>
                <label className="mb-1 block text-sm font-medium text-gray-700 capitalize">
                  {field === 'valor' ? 'Valor (R$)' : field}
                </label>
                <div className="relative">
                  <Input
                    placeholder={
                      field === 'nome'
                        ? 'Ex: Vestido Floral Longo'
                        : field === 'tamanho'
                        ? 'Ex: GG'
                        : field === 'status'
                        ? 'Disponível'
                        : field === 'valor'
                        ? 'R$ 120,00'
                        : 'Ex: Amarelo'
                    }
                    value={filters[field]}
                    onChange={(e) => handleFilterChange(field, e.target.value)}
                    className="pr-8"
                  />
                  {filters[field] && (
                    <button
                      onClick={() => handleClearFilter(field)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
          {/* Items list */}
          <section className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-700">Itens disponíveis</h2>
              <span className="text-sm text-gray-500">
                Clientes cadastrados: {clientsLoading ? 'Carregando...' : clients.length}
              </span>
            </div>
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
                      <tr key={item.id} className="transition hover:bg-gray-50">
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
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-700">Itens selecionados</h2>
              <Button variant="outline" size="sm" onClick={() => setSelectedItems({})}>
                Limpar seleção
              </Button>
            </div>

            {Object.keys(selectedItems).length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center text-gray-500">
                Nenhum item selecionado ainda. Escolha itens no quadro ao lado.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.values(selectedItems).map(({ item, quantidade }) => (
                  <div key={item.id} className="rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
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
                        onClick={() => removeItem(item.id)}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="rounded-full border border-gray-300 px-3 py-1 text-gray-600 transition hover:border-emerald-500 hover:text-emerald-600"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          -
                        </button>
                        <span className="w-10 text-center text-base font-semibold text-gray-800">
                          {quantidade}
                        </span>
                        <button
                          type="button"
                          className="rounded-full border border-gray-300 px-3 py-1 text-gray-600 transition hover:border-emerald-500 hover:text-emerald-600"
                          onClick={() => updateQuantity(item.id, 1)}
                          disabled={quantidade >= item.quantidade}
                        >
                          +
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
                      Disponíveis: {item.quantidade} • Reservados: {quantidade}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Itens selecionados</span>
                <span className="font-semibold text-gray-800">{Object.keys(selectedItems).length}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Quantidade total</span>
                <span className="font-semibold text-gray-800">{totalQuantidade}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Valor total estimado</span>
                <span className="text-lg font-semibold text-gray-800">
                  {formatCurrency(totalValor)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                className="bg-emerald-500 text-white hover:bg-emerald-600"
                onClick={handleOpenConfirmModal}
                disabled={clientsLoading}
              >
                Criar condicional
              </Button>
            </div>
          </section>
        </div>
      </main>

      <ConfirmCondicionalModal
        open={confirmModalOpen}
        items={selectedItems}
        clients={clients}
        isSubmitting={isSubmitting}
        defaultDate={getDefaultDevolucaoDate()}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleCreateCondicional}
      />

      <SuccessModal
        open={successModalOpen}
        message={successMessage || 'Operação concluída.'}
        onClose={() => setSuccessModalOpen(false)}
        onPrimaryAction={() => setSuccessModalOpen(false)}
      />
    </div>
  );
}

