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
import { Loader2, Trash2, UserPlus2, Pencil } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AxiosError } from 'axios';

const clientSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, 'Informe o nome completo'),
  email: z
    .string()
    .trim()
    .min(1, 'E-mail é obrigatório')
    .email('E-mail inválido'),
  telefone: z
    .string()
    .trim()
    .min(1, 'Telefone é obrigatório')
    .refine((value) => value.replace(/\D/g, '').length >= 10, {
      message: 'Telefone deve conter DDD + número'
    }),
  cpf: z
    .string()
    .trim()
    .min(1, 'CPF é obrigatório')
    .refine((value) => value.replace(/\D/g, '').length === 11, {
      message: 'CPF deve ter 11 dígitos'
    }),
  endereco: z
    .string()
    .trim()
    .min(5, 'Endereço é obrigatório')
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
  const [isEditing, setIsEditing] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError: setFormError,
    trigger,
    formState: { errors, isValid, isSubmitting }
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      cpf: '',
      endereco: ''
    }
  });

  const cacheClients = (list: Client[]) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dressfy-clients-cache', JSON.stringify(list));
    }
  };

  const notifyClientsUpdated = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dressfy-clients-updated', Date.now().toString());
    }
  };

  const loadClients = async () => {
    try {
      setIsLoading(true);
      const response = await clientesService.getAll({ page: 1, limit: 100 });
      const items = response.data ?? [];
      setClients(items);
      cacheClients(items);
      notifyClientsUpdated();
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
        email: data.email.trim(),
        telefone: data.telefone.trim(),
        cpf: data.cpf.replace(/\D/g, ''),
        endereco: data.endereco.trim()
      };

      if (isEditing && clientToEdit) {
        const updated = await clientesService.update(clientToEdit.id, {
          ...sanitizedPayload
        });
        setClients((prev) => {
          const next = prev.map((client) =>
            client.id === clientToEdit.id ? { ...client, ...updated } : client
          );
          cacheClients(next);
          return next;
        });
        notifyClientsUpdated();
        setModalVariant('success');
        setModalTitle('Tudo certo!');
        setSuccessMessage('Cliente atualizado com sucesso!');
        setSuccessModalOpen(true);
        handleCancelEdit();
      } else {
        await clientesService.create(sanitizedPayload);
        await loadClients();
        setModalVariant('success');
        setModalTitle('Tudo certo!');
        setSuccessMessage('Cliente cadastrado com sucesso!');
        setSuccessModalOpen(true);
        reset();
      }
    } catch (err: any) {
      console.error(isEditing ? 'Erro ao atualizar cliente:' : 'Erro ao cadastrar cliente:', err);
      setModalVariant('error');
      setModalTitle(isEditing ? 'Não foi possível atualizar' : 'Não foi possível salvar');

      const backendErrors = err?.response?.data;
      const message = backendErrors?.message || backendErrors?.errors?.[0];

      if (typeof message === 'string') {
        if (message.toLowerCase().includes('email')) {
          setFormError('email', { message });
        } else if (message.toLowerCase().includes('cpf')) {
          setFormError('cpf', { message });
        } else if (message.toLowerCase().includes('telefone')) {
          setFormError('telefone', { message });
        } else if (message.toLowerCase().includes('endereço') || message.toLowerCase().includes('endereco')) {
          setFormError('endereco', { message });
        } else if (message.toLowerCase().includes('nome')) {
          setFormError('nome', { message });
        } else {
          setError(message);
        }
      } else {
        setError(
          isEditing
            ? 'Erro ao atualizar cliente. Revise as informações e tente novamente.'
            : 'Erro ao salvar cliente. Revise as informações e tente novamente.'
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClient = (client: Client) => {
    reset({
      nome: client.nome ?? '',
      email: client.email ?? '',
      telefone: client.telefone ?? '',
      cpf: client.cpf ?? '',
      endereco: client.endereco ?? ''
    });
    void trigger();
    setClientToEdit(client);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    reset();
    setIsEditing(false);
    setClientToEdit(null);
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

  const handleSubmitEditing = (data: ClientFormData) => {
    onSubmit(data);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;

    try {
      setIsDeleting(true);
      await clientesService.delete(clientToDelete.id);
      setClients((prev) => {
        const next = prev.filter((c) => c.id !== clientToDelete.id);
        cacheClients(next);
        return next;
      });
      notifyClientsUpdated();
      setModalVariant('success');
      setModalTitle('Tudo certo!');
      setSuccessMessage('Cliente removido com sucesso.');
      setSuccessModalOpen(true);
      await loadClients();
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
                {isEditing ? <Pencil size={20} /> : <UserPlus2 size={20} />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {isEditing ? 'Editar cliente' : 'Cadastrar novo cliente'}
                </h2>
                <p className="text-sm text-gray-500">
                  Todos os campos são obrigatórios para contato e identificação do cliente.
                </p>
              </div>
            </header>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit(handleSubmitEditing)}
              className="space-y-5"
            >
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

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  className="sm:w-auto"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Cancelar edição
                </Button>
              )}
                <Button
                  type="submit"
                  className="w-full bg-emerald-500 text-white hover:bg-emerald-600 sm:w-auto"
                  disabled={isSaving || !isValid || isSubmitting}
                >
                  {isSaving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar cliente'}
                </Button>
              </div>
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
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEditClient(client)}
                                className="inline-flex items-center rounded-md border border-transparent bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                              >
                                <Pencil size={14} className="mr-1" />
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteRequest(client)}
                                className="inline-flex items-center rounded-md border border-transparent bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
                              >
                                <Trash2 size={14} className="mr-1" />
                                Remover
                              </button>
                            </div>
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


