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
import { Card, CardContent } from '@/components/ui/card';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.forgotPassword(data.email);
      setSuccess(true);
      // Armazena o email no sessionStorage para usar nas próximas etapas
      sessionStorage.setItem('resetEmail', data.email);
      // Redireciona para a página de verificação de código após 2 segundos
      setTimeout(() => {
        router.push('/verify-code');
      }, 2000);
    } catch (err: any) {
      // Tratamento de erros específicos
      const statusCode = err?.response?.status;
      const message = err?.response?.data?.message;
      const errors = err?.response?.data?.errors;

      if (statusCode === 404) {
        // Email não encontrado
        setError('Este email não está cadastrado no sistema. Verifique o email ou crie uma nova conta.');
      } else if (message) {
        // Outras mensagens do servidor
        if (message.includes('not found') || message.includes('não encontrado')) {
          setError('Este email não está cadastrado no sistema. Verifique o email ou crie uma nova conta.');
        } else if (message.includes('User not found') || message.includes('Usuário não encontrado')) {
          setError('Este email não está cadastrado no sistema. Verifique o email ou crie uma nova conta.');
        } else {
          setError(message);
        }
      } else if (errors) {
        // Array de erros
        if (Array.isArray(errors)) {
          const errorMsg = errors.map((e: any) => e.message || e).join(', ');
          if (errorMsg.includes('not found') || errorMsg.includes('não encontrado')) {
            setError('Este email não está cadastrado no sistema. Verifique o email ou crie uma nova conta.');
          } else {
            setError(errorMsg);
          }
        } else {
          setError(String(errors));
        }
      } else {
        setError('Erro ao enviar código. Verifique o email e tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Lado esquerdo - Logo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-500 to-emerald-600 items-center justify-center p-12">
        <div className="border-4 border-white/30 rounded-2xl p-16 backdrop-blur-sm">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 bg-white rounded-full ${
                      i === 2 ? 'h-16' : i === 1 || i === 3 ? 'h-12' : 'h-8'
                    }`}
                  />
                ))}
              </div>
            </div>
            <h1 className="text-5xl font-serif text-white">Dressify</h1>
          </div>
        </div>
      </div>

      {/* Lado direito - Formulário */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="pt-8 pb-8 px-8">
            {/* Logo mobile */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 bg-emerald-500 rounded-full ${
                        i === 2 ? 'h-12' : i === 1 || i === 3 ? 'h-8' : 'h-6'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <h1 className="text-3xl font-serif text-gray-800">Dressify</h1>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                Recupere sua senha
              </h2>
              <p className="text-gray-600 text-sm">
                Insira seu e-mail para receber o código de recuperação
              </p>
            </div>

            {success ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg mb-6">
                <p className="text-sm">
                  Código enviado com sucesso! Verifique seu e-mail.
                </p>
                <p className="text-xs mt-1 text-emerald-600">
                  Redirecionando...
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700">
                      E-mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Insira seu e-mail para receber o código"
                      className={`h-12 ${errors.email ? 'border-red-500' : ''}`}
                      {...register('email')}
                      disabled={isLoading}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Enviando...' : 'Confirmar'}
                  </Button>
                </form>
              </>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                Voltar para o login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
