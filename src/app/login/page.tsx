'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  // Verificar se veio da tela de cadastro
  useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('registered') === 'true') {
        setSuccess('Conta criada com sucesso! Faça login para continuar.');
      }
    }
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    console.log('🔐 Tentando fazer login com:', { email: data.email });

    try {
      await login(data);
      console.log('✅ Login bem-sucedido!');
    } catch (err: any) {
      console.error('❌ Erro no login:', err);
      console.error('Resposta completa:', err?.response);
      
      // Tratamento específico de erros
      if (err?.response?.data?.errors) {
        const errors = err.response.data.errors;
        
        if (Array.isArray(errors)) {
          // Array de erros do Zod
          const errorMessages = errors.map((e: any) => e.message).join(', ');
          setError(errorMessages);
        } else if (typeof errors === 'string') {
          setError(errors);
        } else if (Array.isArray(errors) && errors.length > 0 && errors[0].includes('Credenciais inválidas')) {
          setError('Email ou senha incorretos. Verifique seus dados e tente novamente.');
        } else {
          setError('Email ou senha incorretos. Verifique seus dados e tente novamente.');
        }
      } else if (err?.response?.data?.message) {
        const message = err.response.data.message;
        
        // Mensagens específicas
        if (message.includes('Credenciais inválidas') || message.includes('inválidas')) {
          setError('Email ou senha incorretos. Verifique seus dados e tente novamente.');
        } else {
          setError(message);
        }
      } else if (err?.response?.status === 401) {
        setError('Email ou senha incorretos. Verifique seus dados e tente novamente.');
      } else if (err?.response?.status === 404) {
        setError('Usuário não encontrado. Verifique seu email ou crie uma conta.');
      } else if (err?.code === 'ERR_NETWORK') {
        setError('Erro de conexão. Verifique se o servidor está rodando.');
      } else {
        setError('Erro ao fazer login. Tente novamente mais tarde.');
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

            <h2 className="text-3xl font-bold text-center mb-8">Login</h2>

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded-md text-sm">
                {success}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail ou CPF</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...register('email')}
                  disabled={isLoading}
                  className="h-12"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="••••••••"
                  {...register('senha')}
                  disabled={isLoading}
                  className="h-12"
                />
                {errors.senha && (
                  <p className="text-sm text-red-500">{errors.senha.message}</p>
                )}
              </div>

              {/* Remember Me e Esqueceu Senha */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Lembrar Login
                  </Label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Esqueceu sua senha?
                </Link>
              </div>

              {/* Botão Login */}
              <Button
                type="submit"
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Login'}
              </Button>

              {/* Link para Cadastro */}
              <div className="text-center text-sm text-gray-600 mt-4">
                Não tem uma conta?{' '}
                <Link
                  href="/register"
                  className="text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Criar conta
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
