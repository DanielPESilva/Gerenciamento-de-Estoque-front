'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { itemsService } from '@/services/items.service';
import { Item } from '@/types/item';
import { ArrowLeft, Edit } from 'lucide-react';

export default function VisualizarItemPage() {
  const router = useRouter();
  const params = useParams();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadItem = async () => {
      try {
        setLoading(true);
        const id = parseInt(params.id as string);
        const response = await itemsService.getById(id);
        
        if (response.success) {
          setItem(response.data);
        }
      } catch (error) {
        console.error('Erro ao carregar item:', error);
        alert('Erro ao carregar item');
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadItem();
    }
  }, [params.id, router]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header activePage="estoque" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600">Carregando item...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header activePage="estoque" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600">Item não encontrado</p>
          </div>
        </main>
      </div>
    );
  }

  const itemNome = item.nome.replace(/#\d+$/, '').trim();
  const primeiraImagem = item.Imagens && item.Imagens.length > 0 ? item.Imagens[0].url : null;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  const primeiraImagemUrl = primeiraImagem ? `${apiBaseUrl}/imagens/${primeiraImagem}` : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activePage="estoque" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Botão Voltar */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
          >
            <ArrowLeft size={20} />
            Voltar para Meu Estoque
          </button>
        </div>

        {/* Título e Botão Editar */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Visualizar Item</h2>
          <Button
            onClick={() => router.push(`/editar-item/${item.id}`)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-2"
          >
            <Edit size={18} />
            Editar
          </Button>
        </div>

        {/* Conteúdo Principal */}
        <div className="bg-white rounded-lg shadow p-6">
          {/* Nome do Item */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome
            </label>
            <Input
              value={itemNome}
              disabled
              className="bg-gray-50 text-gray-900 font-semibold"
            />
          </div>

          {/* Grid com Imagem e Informações */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Imagem do Produto */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 flex items-center justify-center h-full min-h-[400px]">
                {primeiraImagemUrl ? (
                  <img
                    src={primeiraImagemUrl}
                    alt={itemNome}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto bg-gray-300 rounded-lg flex items-center justify-center mb-4">
                      <svg
                        className="w-16 h-16 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">Sem imagem cadastrada</p>
                  </div>
                )}
              </div>
            </div>

            {/* Informações do Produto */}
            <div className="lg:col-span-2 space-y-6">
              {/* Primeira linha - Código, Tipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código
                  </label>
                  <Input
                    value={item.id}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo
                  </label>
                  <Input
                    value={item.tipo}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>

              {/* Segunda linha - Condição, Estoque Atual */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condição
                  </label>
                  <Input
                    value={item.quantidade > 0 ? 'Disponível' : 'Indisponível'}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estoque Atual
                  </label>
                  <Input
                    value={item.quantidade}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção Características */}
          <div className="border-t pt-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
              Características
            </h3>

            <div className="space-y-4">
              {/* Primeira linha de características */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Do Cadastro
                  </label>
                  <Input
                    value={formatDate(item.criado_em)}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <Input
                    value={item.quantidade > 0 ? 'Disponível' : 'Indisponível'}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>

              {/* Segunda linha de características */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tamanho
                  </label>
                  <Input
                    value={item.tamanho}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor
                  </label>
                  <Input
                    value={item.cor}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço de Venda
                  </label>
                  <Input
                    value={formatCurrency(item.preco)}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>

              {/* Descrição (se existir) */}
              {item.descricao && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={item.descricao}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                    rows={3}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

