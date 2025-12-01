'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { SuccessModal } from '@/components/SuccessModal';
import { itemsService } from '@/services/items.service';
import { Item } from '@/types/item';
import { ArrowLeft, Upload, X } from 'lucide-react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function EditarItemPage() {
  const router = useRouter();
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [item, setItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: '',
    tamanho: '',
    cor: '',
    preco: '',
    quantidade: '',
    descricao: ''
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const itemId = useMemo(() => {
    if (!params?.id) return null;
    const parsed = Array.isArray(params.id) ? params.id[0] : params.id;
    return Number(parsed);
  }, [params]);

  useEffect(() => {
    const loadItem = async () => {
      if (!itemId) {
        return;
      }
      try {
        setLoading(true);
        const response = await itemsService.getById(itemId);
        if (response.success) {
          const data = response.data;
          setItem(data);
          setFormData({
            nome: data.nome.replace(/#\d+$/, '').trim(),
            tipo: data.tipo,
            tamanho: data.tamanho,
            cor: data.cor,
            preco: data.preco.toString().replace('.', ','),
            quantidade: data.quantidade.toString(),
            descricao: data.descricao ?? ''
          });

          if (data.Imagens && data.Imagens.length > 0) {
            const firstImage = `${apiBaseUrl}/imagens/${data.Imagens[0].url}`;
            setImagePreview(firstImage);
          }
        } else {
          setErrorMessage('Item não encontrado.');
        }
      } catch (error) {
        console.error('Erro ao carregar item:', error);
        setErrorMessage('Erro ao carregar o item. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [itemId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!item || !itemId) return;

    if (!formData.nome || !formData.tipo || !formData.tamanho || !formData.cor || !formData.preco) {
      setErrorMessage('Preencha todos os campos obrigatórios (Nome, Tipo, Tamanho, Cor, Preço).');
      return;
    }

    const precoValue = parseFloat(formData.preco.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(precoValue) || precoValue <= 0) {
      setErrorMessage('Informe um preço válido.');
      return;
    }

    const quantidadeValue = parseInt(formData.quantidade || '0', 10);
    if (isNaN(quantidadeValue) || quantidadeValue < 0) {
      setErrorMessage('Informe uma quantidade válida.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        nome: formData.nome,
        tipo: formData.tipo,
        tamanho: formData.tamanho,
        cor: formData.cor,
        preco: precoValue,
        quantidade: quantidadeValue,
        descricao: formData.descricao || undefined
      };

      await itemsService.update(itemId, payload);

      if (imageFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('images', imageFile);
        uploadFormData.append('item_id', itemId.toString());

        const uploadResponse = await fetch(`${apiBaseUrl}/imagens`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}`
          },
          body: uploadFormData
        });

        if (!uploadResponse.ok) {
          console.warn('Upload de imagem falhou ao editar item:', await uploadResponse.text());
        }
      }

      setSuccessMessage('Item atualizado com sucesso!');
      setSuccessModalOpen(true);
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      setErrorMessage('Erro ao atualizar o item. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header activePage="estoque" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">Carregando item...</div>
        </main>
      </div>
    );
  }

  if (!item || !itemId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header activePage="estoque" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            {errorMessage ?? 'Item não encontrado ou removido.'}
          </div>
          <div className="mt-6 flex justify-center">
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Voltar para Meu Estoque
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activePage="estoque" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push(`/visualizar-item/${itemId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
            type="button"
          >
            <ArrowLeft size={20} />
            Voltar para Visualização
          </button>
        </div>

        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Editar Item</h2>

        <div className="bg-white rounded-lg shadow p-6">
          {errorMessage && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome
              </label>
              <Input
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Nome do item"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código
                </label>
                <Input value={itemId} disabled className="bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <Input
                  value={formData.tipo}
                  onChange={(e) => handleInputChange('tipo', e.target.value)}
                  placeholder="Tipo (Vestido, Camiseta...)"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condição
                </label>
                <Input value={Number(formData.quantidade) > 0 ? 'Disponível' : 'Indisponível'} disabled className="bg-gray-50" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamanho
                </label>
                <Input
                  value={formData.tamanho}
                  onChange={(e) => handleInputChange('tamanho', e.target.value)}
                  placeholder="Ex: M, G, 38"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor
                </label>
                <Input
                  value={formData.cor}
                  onChange={(e) => handleInputChange('cor', e.target.value)}
                  placeholder="Ex: Azul, Preto"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estoque Atual
                </label>
                <Input
                  type="number"
                  min={0}
                  value={formData.quantidade}
                  onChange={(e) => handleInputChange('quantidade', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preço de Venda
                </label>
                <Input
                  value={formData.preco}
                  onChange={(e) => handleInputChange('preco', e.target.value)}
                  placeholder="120,00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Cadastro
                </label>
                <Input value={new Date(item.criado_em).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })} disabled className="bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição (Opcional)
                </label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                  value={formData.descricao}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  placeholder="Detalhes do item"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagem do Produto
              </label>
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                {imagePreview ? (
                  <div className="relative mx-auto max-w-sm">
                    <img
                      src={imagePreview}
                      alt={formData.nome}
                      className="w-full rounded-lg object-contain"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white transition hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Arraste uma imagem para cá ou clique para selecionar.
                    </p>
                    <label className="mt-4 inline-flex cursor-pointer items-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600">
                      Escolher imagem
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Formatos suportados: JPG, PNG, WEBP. Tamanho máximo: 10MB.
              </p>
            </div>

            <div className="flex flex-col gap-4 pt-6 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/visualizar-item/${itemId}`)}
                className="sm:w-auto"
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-500 text-white hover:bg-emerald-600 sm:w-auto"
                disabled={submitting}
              >
                {submitting ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <SuccessModal
        open={successModalOpen}
        message={successMessage || 'Item atualizado com sucesso!'}
        primaryLabel="Voltar para visualização"
        onPrimaryAction={() => {
          router.push(`/visualizar-item/${itemId}`);
          router.refresh();
        }}
        onClose={() => setSuccessModalOpen(false)}
      />
    </div>
  );
}

