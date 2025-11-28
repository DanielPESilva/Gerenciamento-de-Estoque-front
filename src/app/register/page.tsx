'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';

const registerSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  sobrenome: z.string().min(2, 'Sobrenome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  cpf: z.string().optional().refine(
    (val) => !val || val === '' || /^\d{11}$/.test(val),
    { message: 'CPF deve ter 11 dígitos' }
  ),
  cnpj: z.string().optional().refine(
    (val) => !val || val === '' || /^\d{14}$/.test(val),
    { message: 'CNPJ deve ter 14 dígitos' }
  ),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmarSenha: z.string().min(1, 'Confirme sua senha'),
  termos: z.boolean().refine((val) => val === true, {
    message: 'Você deve aceitar os termos de uso',
  }),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: 'As senhas não correspondem',
  path: ['confirmarSenha'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termos, setTermos] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Combinar nome e sobrenome
      const nomeCompleto = `${data.nome} ${data.sobrenome}`;
      
      // Preparar dados para envio
      const registerData: any = {
        nome: nomeCompleto,
        email: data.email,
        senha: data.senha,
      };

      // Adicionar CPF se foi preenchido
      if (data.cpf && data.cpf.trim() !== '') {
        registerData.cpf = data.cpf;
      }

      // Adicionar CNPJ se foi preenchido
      if (data.cnpj && data.cnpj.trim() !== '') {
        registerData.cnpj = data.cnpj;
      }
      
      await authService.register(registerData);

      // Redirecionar para login após cadastro bem-sucedido
      router.push('/login?registered=true');
    } catch (err: any) {
      console.error('Erro no cadastro:', err);
      
      // Tratamento de erros específicos
      if (err?.response?.data?.errors) {
        const errors = err.response.data.errors;
        
        // Verificar se é um array de erros do Zod
        if (Array.isArray(errors)) {
          // Verificar se é o formato do backend (array de strings)
          if (typeof errors[0] === 'string') {
            const errorMsg = errors[0];
            
            if (errorMsg.includes('Email já está em uso') || errorMsg.includes('já está em uso')) {
              setError('Este email já está cadastrado. Tente fazer login ou use outro email.');
            } else {
              setError(errorMsg);
            }
          } else {
            // Formato padrão com objetos {path, message}
            const errorMessages = errors.map((e: any) => e.message || e).join(', ');
            setError(errorMessages);
          }
        } else if (typeof errors === 'string') {
          if (errors.includes('Email já está em uso')) {
            setError('Este email já está cadastrado. Tente fazer login ou use outro email.');
          } else {
            setError(errors);
          }
        } else if (typeof errors === 'object') {
          const errorMessages = Object.values(errors).join(', ');
          setError(errorMessages);
        }
      } else if (err?.response?.data?.message) {
        const message = err.response.data.message;
        
        // Mensagens específicas
        if (message.includes('Email já está em uso') || message.includes('já está em uso')) {
          setError('Este email já está cadastrado. Tente fazer login ou use outro email.');
        } else if (message.includes('CPF') && message.includes('already')) {
          setError('Este CPF já está cadastrado no sistema.');
        } else if (message.includes('CNPJ') && message.includes('already')) {
          setError('Este CNPJ já está cadastrado no sistema.');
        } else {
          setError(message);
        }
      } else if (err?.code === 'ERR_NETWORK') {
        setError('Erro de conexão. Verifique se o servidor está rodando.');
      } else {
        setError('Erro ao criar conta. Verifique os dados e tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Lado Esquerdo - Verde com Logo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-500 to-emerald-600 items-center justify-center p-12">
        <div className="text-center text-white">
          {/* Logo Icon */}
          <div className="flex justify-center mb-6">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-white rounded-full"
                  style={{
                    height: `${40 + i * 8}px`,
                    animation: `pulse ${1 + i * 0.2}s ease-in-out infinite`,
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Logo Text */}
          <h1 className="text-6xl font-serif mb-4">Dressify</h1>
          <p className="text-xl opacity-90">Sistema de Gerenciamento de Estoque</p>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <Card className="w-full max-w-md border-0 shadow-none">
          <CardContent className="pt-6">
            {/* Logo Mobile */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex justify-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-emerald-500 rounded-full"
                    style={{ height: `${24 + i * 6}px` }}
                  />
                ))}
              </div>
              <h1 className="text-4xl font-serif text-emerald-600">Dressify</h1>
            </div>

            <h2 className="text-3xl font-bold text-center mb-8">Crie sua conta</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Nome e Sobrenome */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    type="text"
                    placeholder="Nome"
                    {...register('nome')}
                    disabled={isLoading}
                    className="h-11"
                  />
                  {errors.nome && (
                    <p className="text-xs text-red-500">{errors.nome.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sobrenome">Sobrenome</Label>
                  <Input
                    id="sobrenome"
                    type="text"
                    placeholder="Sobrenome"
                    {...register('sobrenome')}
                    disabled={isLoading}
                    className="h-11"
                  />
                  {errors.sobrenome && (
                    <p className="text-xs text-red-500">{errors.sobrenome.message}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...register('email')}
                  disabled={isLoading}
                  className="h-11"
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* CPF e CNPJ */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF (opcional)</Label>
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    {...register('cpf')}
                    disabled={isLoading}
                    className="h-11"
                    onChange={(e) => {
                      // Remover caracteres não numéricos
                      let value = e.target.value.replace(/\D/g, '');
                      
                      // Limitar a 11 dígitos
                      value = value.substring(0, 11);
                      
                      // Aplicar máscara: 000.000.000-00
                      if (value.length > 9) {
                        value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
                      } else if (value.length > 6) {
                        value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
                      } else if (value.length > 3) {
                        value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
                      }
                      
                      e.target.value = value;
                      setValue('cpf', value.replace(/\D/g, ''), { shouldValidate: true });
                    }}
                  />
                  {errors.cpf && (
                    <p className="text-xs text-red-500">{errors.cpf.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                  <Input
                    id="cnpj"
                    type="text"
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    {...register('cnpj')}
                    disabled={isLoading}
                    className="h-11"
                    onChange={(e) => {
                      // Remover caracteres não numéricos
                      let value = e.target.value.replace(/\D/g, '');
                      
                      // Limitar a 14 dígitos
                      value = value.substring(0, 14);
                      
                      // Aplicar máscara: 00.000.000/0000-00
                      if (value.length > 12) {
                        value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
                      } else if (value.length > 8) {
                        value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
                      } else if (value.length > 5) {
                        value = value.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
                      } else if (value.length > 2) {
                        value = value.replace(/(\d{2})(\d{1,3})/, '$1.$2');
                      }
                      
                      e.target.value = value;
                      setValue('cnpj', value.replace(/\D/g, ''), { shouldValidate: true });
                    }}
                  />
                  {errors.cnpj && (
                    <p className="text-xs text-red-500">{errors.cnpj.message}</p>
                  )}
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="Senha (mínimo 6 caracteres)"
                  {...register('senha')}
                  disabled={isLoading}
                  className="h-11"
                />
                {errors.senha && (
                  <p className="text-xs text-red-500">{errors.senha.message}</p>
                )}
              </div>

              {/* Confirmar Senha */}
              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar Senha</Label>
                <Input
                  id="confirmarSenha"
                  type="password"
                  placeholder="Digite a senha novamente"
                  {...register('confirmarSenha')}
                  disabled={isLoading}
                  className="h-11"
                />
                {errors.confirmarSenha && (
                  <p className="text-xs text-red-500">{errors.confirmarSenha.message}</p>
                )}
              </div>

              {/* Termos */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="termos"
                    checked={termos}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      setTermos(isChecked);
                      setValue('termos', isChecked, { shouldValidate: true });
                    }}
                  />
                  <Label
                    htmlFor="termos"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Concordo com os termos e condições
                  </Label>
                </div>
                {errors.termos && (
                  <p className="text-xs text-red-500">{errors.termos.message}</p>
                )}
              </div>

              {/* Botão Cadastrar */}
              <Button
                type="submit"
                className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'Criando conta...' : 'Cadastrar'}
              </Button>

              {/* Link para Login */}
              <div className="text-center text-sm text-gray-600 mt-4">
                Já tem uma conta?{' '}
                <Link
                  href="/login"
                  className="text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Fazer login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
