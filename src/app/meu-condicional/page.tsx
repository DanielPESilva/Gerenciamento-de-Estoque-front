'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SuccessModal } from '@/components/SuccessModal';
import { condicionaisListService } from '@/services/condicionais-list.service';
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
    } catch (error) {
      console.error('Erro ao carregar condicionais:', error);
      setSuccessMessage('Erro ao carregar condicionais. Tente novamente.');
      setSuccessModalOpen(true);
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
                        {selectedCondicional.itens.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 font-medium text-gray-800">{item.nome_item}</td>
                            <td className="px-4 py-2">{item.quantidade}</td>
                            <td className="px-4 py-2">
                              {item.valor_estimado
                                ? formatCurrency(item.valor_estimado * item.quantidade)
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

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

