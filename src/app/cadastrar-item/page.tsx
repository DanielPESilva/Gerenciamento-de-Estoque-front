'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { SuccessModal } from '@/components/SuccessModal';
import { itemsService } from '@/services/items.service';
import { X } from 'lucide-react';

export default function CadastrarItemPage() {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const initialFormState = {
    tipo: '',
    nome: '',
    preco: '',
    estoqueAtual: '1',
    tamanho: '',
    cor: '',
    descricao: ''
  };
  const [formData, setFormData] = useState(initialFormState);



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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.tipo || !formData.cor || !formData.tamanho || !formData.preco) {
      alert('Por favor, preencha todos os campos obrigatórios (Nome, Tipo, Cor, Tamanho e Preço).');
      return;
    }

    // Verificar se o usuário está autenticado
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('Você não está autenticado. Por favor, faça login novamente.');
      router.push('/login');
      return;
    }

    setLoading(true);
    
    try {
      const itemData = {
        nome: formData.nome,
        tipo: formData.tipo,
        cor: formData.cor,
        tamanho: formData.tamanho,
        preco: parseFloat(formData.preco.replace(/[^\d.,]/g, '').replace(',', '.')),
        quantidade: parseInt(formData.estoqueAtual) || 1,
        ...(formData.descricao && { descricao: formData.descricao })
      };

      console.log('📤 Enviando item para API:', itemData);
      console.log('🔑 Token presente:', !!token);
      
      const response = await itemsService.create(itemData);
      console.log('✅ Item cadastrado:', response);
      
      const itemId = response.data.id;

      // Fazer upload da imagem se existir
      if (imageFile && itemId) {
        console.log('📤 Fazendo upload da imagem...');
        const formData = new FormData();
        formData.append('images', imageFile);
        formData.append('item_id', itemId.toString());

        try {
        const uploadResponse = await fetch(`${apiBaseUrl}/imagens`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (uploadResponse.ok) {
            console.log('✅ Imagem enviada com sucesso!');
            setImageFile(null);
            setImagePreview(null);
          } else {
            console.error('⚠️ Erro ao enviar imagem:', await uploadResponse.text());
          }
        } catch (uploadError) {
          console.error('⚠️ Erro no upload da imagem:', uploadError);
        }
      }
      
      setFormData(initialFormState);
      setSuccessMessage('Produto cadastrado com sucesso!');
      setSuccessModalOpen(true);
    } catch (error: any) {
      console.error('❌ Erro ao cadastrar item:', error);
      console.error('📋 Detalhes do erro:', error.response?.data);
      
      // Tratamento específico para erro 401 (não autenticado)
      if (error.response?.status === 401) {
        alert('Sessão expirada. Por favor, faça login novamente.');
        router.push('/login');
        return;
      }
      
      const errorMessage = error.response?.data?.errors 
        ? error.response.data.errors.map((e: any) => `${e.path}: ${e.message}`).join('\n')
        : error.response?.data?.message || 'Erro ao cadastrar item. Tente novamente.';
      alert(`Erro ao cadastrar item:\n${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activePage="cadastrar-item" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Cadastrar Item</h2>

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Primeira linha - Tipo, Nome */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <Input
                  placeholder="Ex: Vestido, Blusa, Calça..."
                  value={formData.tipo}
                  onChange={(e) => handleInputChange('tipo', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <Input
                  placeholder="Ex: Vestido Floral Longo"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  required
                  className="w-full"
                />
              </div>
            </div>

            {/* Segunda linha - Tamanho, Cor, Preço de Venda, Quantidade */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tamanho *
                </label>
                <Input
                  placeholder="P, M, G, 38..."
                  value={formData.tamanho}
                  onChange={(e) => handleInputChange('tamanho', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cor *
                </label>
                <Input
                  placeholder="Azul, Vermelho..."
                  value={formData.cor}
                  onChange={(e) => handleInputChange('cor', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço de Venda *
                </label>
                <Input
                  placeholder="120.00"
                  value={formData.preco}
                  onChange={(e) => handleInputChange('preco', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade
                </label>
                <Input
                  type="number"
                  placeholder="1"
                  min="0"
                  value={formData.estoqueAtual}
                  onChange={(e) => handleInputChange('estoqueAtual', e.target.value)}
                />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição (Opcional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
                placeholder="Descreva detalhes do item como material, estilo, ocasião de uso..."
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
              />
            </div>

            {/* Upload de Imagem */}
            <div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mx-auto max-h-64 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg text-gray-600 mb-2">
                      Adicione aqui uma imagem
                    </p>
                    <p className="text-sm text-gray-500 mb-1">
                      Arraste a imagem para esse campo
                    </p>
                    <p className="text-sm text-gray-500 mb-4">ou</p>
                    <p className="text-sm text-gray-500 mb-4">Pressione o botão</p>
                    <label className="cursor-pointer bg-emerald-500 text-white px-6 py-2 rounded-md hover:bg-emerald-600 inline-block">
                      Carregar
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-4 justify-end pt-6">
              <Button
                type="button"
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="px-8"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8"
              >
                {loading ? 'Salvando...' : 'Salvar Item'}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <SuccessModal
        open={successModalOpen}
        message={successMessage || 'Operação realizada com sucesso.'}
        primaryLabel="Voltar ao estoque"
        onPrimaryAction={() => {
          router.push('/dashboard');
          router.refresh();
        }}
        onClose={() => {
          setSuccessModalOpen(false);
        }}
      />
    </div>
  );
}