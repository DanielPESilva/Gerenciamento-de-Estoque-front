'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SuccessModal } from '@/components/SuccessModal';
import { useAuth } from '@/contexts/AuthContext';
import { usuariosService } from '@/services/usuarios.service';

interface ProfileExtras {
  telefone: string;
  whatsapp: string;
  instagram: string;
  empresa: string;
  cnpj: string;
  cpf: string;
}

const defaultExtras: ProfileExtras = {
  telefone: '',
  whatsapp: '',
  instagram: '',
  empresa: '',
  cnpj: '',
  cpf: ''
};

export default function MeuPerfilPage() {
  const { user, loading, updateUser } = useAuth();
  const [form, setForm] = useState({ nome: '', email: '' });
  const [extras, setExtras] = useState<ProfileExtras>(defaultExtras);
  const [initialData, setInitialData] = useState({ nome: '', email: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [avatar, setAvatar] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const storageKey = useMemo(
    () => (user ? `profileExtras:${user.id}` : null),
    [user?.id]
  );
  const avatarStorageKey = useMemo(
    () => (user ? `profileAvatar:${user.id}` : null),
    [user?.id]
  );

  useEffect(() => {
    if (!user) {
      setIsFetching(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setIsFetching(true);
        const response = await usuariosService.getById(user.id);
        const data = response.data ?? {};

        const nome = data.nome ?? user.nome ?? '';
        const email = data.email ?? user.email ?? '';

        setForm({ nome, email });
        setInitialData({ nome, email });

        if (storageKey) {
          const storedExtras = localStorage.getItem(storageKey);
          if (storedExtras) {
            setExtras({ ...defaultExtras, ...JSON.parse(storedExtras) });
          }
        }

        if (avatarStorageKey) {
          const storedAvatar = localStorage.getItem(avatarStorageKey);
          if (storedAvatar) {
            setAvatar(storedAvatar);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        setErrorMessage('Não foi possível carregar seus dados. Tente novamente.');
      } finally {
        setIsFetching(false);
      }
    };

    loadProfile();
  }, [user, storageKey]);

  const avatarUrl = useMemo(() => {
    const displayName = form.nome || initialData.nome || user?.nome || 'Usuário';
    if (avatar) {
      return avatar;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      displayName
    )}&background=10B981&color=FFFFFF&size=256`;
  }, [avatar, form.nome, initialData.nome, user?.nome]);

  const handleInputChange = (field: 'nome' | 'email', value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleExtrasChange = (field: keyof ProfileExtras, value: string) => {
    setExtras((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload: Record<string, string> = {};

      if (form.nome && form.nome !== initialData.nome) {
        payload.nome = form.nome.trim();
      }

      if (form.email && form.email !== initialData.email) {
        payload.email = form.email.trim();
      }

      if (Object.keys(payload).length > 0) {
        await usuariosService.update(user.id, payload);
        setInitialData((prev) => ({
          ...prev,
          ...payload
        }));
        updateUser({
          ...user,
          nome: payload.nome ?? user.nome,
          email: payload.email ?? user.email
        });
      }

      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(extras));
      }

      if (avatarStorageKey && avatar) {
        localStorage.setItem(avatarStorageKey, avatar);
      }

      setSuccessMessage('Perfil atualizado com sucesso!');
      setSuccessOpen(true);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      setErrorMessage('Não foi possível salvar as alterações. Verifique os dados e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setAvatar(result);
        if (avatarStorageKey) {
          localStorage.setItem(avatarStorageKey, result);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading || isFetching) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex h-[70vh] items-center justify-center text-gray-500">
          Carregando perfil...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex h-[70vh] items-center justify-center text-gray-500">
          Faça login para acessar seu perfil.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <section className="flex flex-col items-center gap-6 text-center">
          <div className="relative">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="group relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-emerald-200 shadow-md transition hover:border-emerald-400 hover:shadow-lg"
            >
              <img
                src={avatarUrl}
                alt={form.nome}
                className="h-full w-full object-cover transition group-hover:opacity-80"
              />
              <span className="absolute inset-x-0 bottom-0 translate-y-10 bg-black/60 px-3 py-1 text-xs text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                Clique para alterar
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-gray-800">{form.nome || 'Usuário'}</h1>
            <p className="text-sm text-gray-500">{form.email || 'sem-email@dominio.com'}</p>
          </div>
        </section>

        <section className="mt-10 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-6 text-left text-lg font-semibold text-gray-700">Dados pessoais</h2>

          {errorMessage && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">Gmail</label>
                <div className="flex gap-3">
                  <Input
                    id="email-input"
                    value={form.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="seuemail@exemplo.com"
                  />
                  <Button
                    type="button"
                    className="bg-emerald-500 text-white hover:bg-emerald-600"
                    onClick={() => document.getElementById('email-input')?.focus()}
                  >
                    Alterar Email
                  </Button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">Nome</label>
                <Input
                  value={form.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">CNPJ</label>
                <Input
                  value={extras.cnpj}
                  onChange={(e) => handleExtrasChange('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">Nome da empresa</label>
                <Input
                  value={extras.empresa}
                  onChange={(e) => handleExtrasChange('empresa', e.target.value)}
                  placeholder="Nome fantasia"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">Telefone</label>
                <Input
                  value={extras.telefone}
                  onChange={(e) => handleExtrasChange('telefone', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">WhatsApp</label>
                <Input
                  value={extras.whatsapp}
                  onChange={(e) => handleExtrasChange('whatsapp', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">CPF</label>
                <Input
                  value={extras.cpf}
                  onChange={(e) => handleExtrasChange('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">Instagram</label>
                <Input
                  value={extras.instagram}
                  onChange={(e) => handleExtrasChange('instagram', e.target.value)}
                  placeholder="@perfil"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  className="bg-emerald-500 px-8 text-white hover:bg-emerald-600"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SuccessModal
        open={successOpen}
        message={successMessage || 'Perfil atualizado!'}
        onClose={() => setSuccessOpen(false)}
        onPrimaryAction={() => setSuccessOpen(false)}
      />
    </div>
  );
}

