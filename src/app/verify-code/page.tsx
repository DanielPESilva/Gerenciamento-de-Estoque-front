'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

const verifyCodeSchema = z.object({
  code: z.string().min(4, 'Código deve ter pelo menos 4 caracteres'),
});

type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;

export default function VerifyCodePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    // Recupera o email do sessionStorage
    const storedEmail = sessionStorage.getItem('resetEmail');
    if (!storedEmail) {
      // Se não houver email, redireciona para a página de forgot-password
      router.push('/forgot-password');
    } else {
      setEmail(storedEmail);
    }
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
  });

  const onSubmit = async (data: VerifyCodeFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Armazena o código no sessionStorage para usar na próxima etapa
      sessionStorage.setItem('resetCode', data.code);
      // Redireciona para a página de redefinição de senha
      router.push('/reset-password');
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        'Erro ao verificar código. Tente novamente.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) {
    return null; // Ou um loading spinner
  }

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
                Insira o código
              </h2>
              <p className="text-gray-600 text-sm">
                Insira o código que foi enviado no seu e-mail
              </p>
              {email && (
                <p className="text-emerald-600 text-sm mt-1 font-medium">
                  {email}
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-gray-700">
                  Código
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Insira o código que foi enviado no seu e-mail"
                  className={`h-12 ${errors.code ? 'border-red-500' : ''}`}
                  {...register('code')}
                  disabled={isLoading}
                />
                {errors.code && (
                  <p className="text-sm text-red-600">{errors.code.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'Verificando...' : 'Confirmar'}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <Link
                href="/forgot-password"
                className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline block"
              >
                Reenviar código
              </Link>
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-gray-700 hover:underline block"
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
