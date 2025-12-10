'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Header } from '@/components/Header';
import { SuccessModal } from '@/components/SuccessModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { clientesService } from '@/services/clientes.service';
import { Client } from '@/types/client';
import { Loader2, Trash2, UserPlus2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AxiosError } from 'axios';

const clientSchema = z.object({
  nome: z.string().min(3, 'Informe o nome completo'),
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'Email inválido'
    }),
  telefone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || value.replace(/\D/g, '').length >= 10, {
      message: 'Telefone deve conter DDD + número'
    }),
  cpf: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || value.replace(/\D/g, '').length === 11, {
      message: 'CPF deve ter 11 dígitos'
    }),
  endereco: z.string().trim().optional()
});

type ClientFormData = z.infer<typeof clientSchema>;

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [modalVariant, setModalVariant] = useState<'success' | 'error'>('success');
  const [modalTitle, setModalTitle] = useState<string | undefined>();
  const [filterTerm, setFilterTerm] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: { errors }
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      cpf: '',
      endereco: ''
    }
  });

  const loadClients = async () => {
    try {
      setIsLoading(true);
      const response = await clientesService.getAll({ page: 1, limit: 100 });
      setClients(response.data);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      setError('Não foi possível carregar os clientes. Tente novamente em instantes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const onSubmit = async (data: ClientFormData) => {
    setIsSaving(true);
    setError(null);

    try {
      const sanitizedPayload = {
        nome: data.nome.trim(),
        email: data.email?.trim() || undefined,
        telefone: data.telefone?.trim() || undefined,
        cpf: data.cpf?.replace(/\D/g, ''),
        endereco: data.endereco?.trim() || undefined
      };

      const created = await clientesService.create(sanitizedPayload);
      setClients((prev) => [created, ...prev]);
      setModalVariant('success');
      setModalTitle('Tudo certo!');
      setSuccessMessage('Cliente cadastrado com sucesso!');
      setSuccessModalOpen(true);
      reset();
    } catch (err: any) {
      console.error('Erro ao cadastrar cliente:', err);
      setModalVariant('error');
      setModalTitle('Não foi possível salvar');

      const backendErrors = err?.response?.data;
      const message = backendErrors?.message || backendErrors?.errors?.[0];

      if (typeof message === 'string') {
        if (message.toLowerCase().includes('email')) {
          setFormError('email', { message });
        } else if (message.toLowerCase().includes('cpf')) {
          setFormError('cpf', { message });
        } else {
          setError(message);
        }
      } else {
        setError('Erro ao salvar cliente. Revise as informações e tente novamente.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const filteredClients = useMemo(() => {
    if (!filterTerm) return clients;
    return clients.filter((client) => {
      const term = filterTerm.toLowerCase();
      return (
        client.nome.toLowerCase().includes(term) ||
        (client.email ?? '').toLowerCase().includes(term) ||
        (client.telefone ?? '').toLowerCase().includes(term)
      );
    });
  }, [clients, filterTerm]);

  const handleDeleteRequest = (client: Client) => {
    setClientToDelete(client);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;

    try {
      setIsDeleting(true);
      await clientesService.delete(clientToDelete.id);
      setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
      setModalVariant('success');
      setModalTitle('Tudo certo!');
      setSuccessMessage('Cliente removido com sucesso.');
      setSuccessModalOpen(true);
    } catch (err) {
      console.error('Erro ao remover cliente:', err);
      setModalVariant('error');
      setModalTitle('Não foi possível remover');

      let message = 'Não foi possível remover o cliente. Tente novamente.';
      if (err && typeof err === 'object') {
        const axiosError = err as AxiosError<{
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

      setSuccessMessage(message);
      setSuccessModalOpen(true);
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setClientToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setClientToDelete(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activePage="clientes" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">Cadastro de clientes</h1>
          <p className="mt-2 text-sm text-gray-500">
            Mantenha aqui a lista de clientes para agilizar o cadastro dos condicionais.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1.8fr]">
          <section className="rounded-lg bg-white p-6 shadow">
            <header className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <UserPlus2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Cadastrar novo cliente</h2>
                <p className="text-sm text-gray-500">
                  Nome é obrigatório; demais campos aceleram a comunicação com o cliente.
                </p>
              </div>
            </header>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Vanessa Oliveira"
                  autoComplete="name"
                  {...register('nome')}
                  disabled={isSaving}
                />
                {errors.nome && (
                  <p className="text-xs text-red-500">{errors.nome.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="cliente@email.com"
                    autoComplete="email"
                    {...register('email')}
                    disabled={isSaving}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                  <Input
                    id="telefone"
                    type="tel"
                    placeholder="(11) 99999-0000"
                    autoComplete="tel"
                    {...register('telefone')}
                    disabled={isSaving}
                  />
                  {errors.telefone && (
                    <p className="text-xs text-red-500">{errors.telefone.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    placeholder="00000000000"
                    inputMode="numeric"
                    {...register('cpf')}
                    disabled={isSaving}
                  />
                  {errors.cpf && <p className="text-xs text-red-500">{errors.cpf.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    placeholder="Rua Exemplo, 123 - Centro"
                    autoComplete="street-address"
                    {...register('endereco')}
                    disabled={isSaving}
                  />
                  {errors.endereco && (
                    <p className="text-xs text-red-500">{errors.endereco.message}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
                disabled={isSaving}
              >
                {isSaving ? 'Salvando...' : 'Cadastrar cliente'}
              </Button>
            </form>
          </section>

          <section className="rounded-lg bg-white p-6 shadow">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Clientes cadastrados</h2>
                <p className="text-sm text-gray-500">
                  Estes clientes estarão disponíveis ao criar ou finalizar condicionais.
                </p>
              </div>
              <Input
                placeholder="Buscar por nome, email ou telefone"
                className="max-w-xs"
                value={filterTerm}
                onChange={(event) => setFilterTerm(event.target.value)}
              />
            </header>

            <div className="rounded-lg border border-gray-200">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 px-6 py-12 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando clientes...
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-gray-500">
                  Nenhum cliente encontrado. Cadastre novos clientes para começar.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Contato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Criado em
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white text-sm text-gray-600">
                    {filteredClients.map((client, index) => {
                      const rowKey =
                        client.id ??
                        `${client.nome}-${client.email ?? client.telefone ?? 'sem-identificador'}-${index}`;
                      return (
                        <tr key={rowKey} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-800">{client.nome}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {client.email && <span>{client.email}</span>}
                              {client.telefone && (
                                <span className="text-xs text-gray-500">{client.telefone}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {client.criado_em
                              ? new Date(client.criado_em).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })
                              : '—'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteRequest(client)}
                              className="inline-flex items-center rounded-md border border-transparent bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
                            >
                              <Trash2 size={14} className="mr-1" />
                              Remover
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </main>

      <SuccessModal
        open={successModalOpen}
        title={modalTitle}
        message={successMessage ?? 'Operação concluída.'}
        variant={modalVariant}
        onClose={() => {
          setSuccessModalOpen(false);
          setSuccessMessage(null);
          setModalVariant('success');
          setModalTitle(undefined);
        }}
        onPrimaryAction={() => {
          setSuccessModalOpen(false);
          setSuccessMessage(null);
          setModalVariant('success');
          setModalTitle(undefined);
        }}
      />
      <ConfirmDialog
        open={deleteModalOpen}
        title="Remover cliente"
        description="Tem certeza que deseja remover este cliente? Isso pode afetar os condicionais associados."
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}


