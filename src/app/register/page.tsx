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
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos').optional().or(z.literal('')),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos').optional().or(z.literal('')),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  termos: z.boolean().refine((val) => val === true, {
    message: 'Você deve concordar com os termos e condições',
  }),
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
      
      await authService.register({
        nome: nomeCompleto,
        email: data.email,
        senha: data.senha,
      });

      // Redirecionar para login após cadastro bem-sucedido
      router.push('/login?registered=true');
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        'Erro ao criar conta. Tente novamente.';
      setError(errorMessage);
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
                  placeholder="E-mail"
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
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="CPF"
                    maxLength={11}
                    {...register('cpf')}
                    disabled={isLoading}
                    className="h-11"
                  />
                  {errors.cpf && (
                    <p className="text-xs text-red-500">{errors.cpf.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    type="text"
                    placeholder="CNPJ"
                    maxLength={14}
                    {...register('cnpj')}
                    disabled={isLoading}
                    className="h-11"
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
                  placeholder="Senha"
                  {...register('senha')}
                  disabled={isLoading}
                  className="h-11"
                />
                {errors.senha && (
                  <p className="text-xs text-red-500">{errors.senha.message}</p>
                )}
              </div>

              {/* Termos */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="termos"
                  checked={termos}
                  onCheckedChange={(checked) => {
                    setTermos(checked as boolean);
                    setValue('termos', checked as boolean);
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

              {/* Botão Cadastrar */}
              <Button
                type="submit"
                className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'Criando conta...' : 'Login'}
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
