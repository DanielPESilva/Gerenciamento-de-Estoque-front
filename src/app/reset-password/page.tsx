'use client';

import { useState, useEffect } from 'react';
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

const resetPasswordSchema = z
  .object({
    senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirmSenha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  })
  .refine((data) => data.senha === data.confirmSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmSenha'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState<string>('');
  const [code, setCode] = useState<string>('');

  useEffect(() => {
    // Recupera o email e código do sessionStorage
    const storedEmail = sessionStorage.getItem('resetEmail');
    const storedCode = sessionStorage.getItem('resetCode');
    
    if (!storedEmail || !storedCode) {
      // Se não houver email ou código, redireciona para a página inicial
      router.push('/forgot-password');
    } else {
      setEmail(storedEmail);
      setCode(storedCode);
    }
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.resetPassword(email, code, data.senha);
      setSuccess(true);
      
      // Limpa os dados do sessionStorage
      sessionStorage.removeItem('resetEmail');
      sessionStorage.removeItem('resetCode');
      
      // Redireciona para o login após 2 segundos
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        'Erro ao redefinir senha. Tente novamente.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!email || !code) {
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
                Recupere sua senha
              </h2>
              <p className="text-gray-600 text-sm">
                Insira sua nova senha
              </p>
            </div>

            {success ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg mb-6">
                <p className="text-sm">
                  Senha redefinida com sucesso!
                </p>
                <p className="text-xs mt-1 text-emerald-600">
                  Redirecionando para o login...
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
                    <Label htmlFor="senha" className="text-gray-700">
                      Senha
                    </Label>
                    <Input
                      id="senha"
                      type="password"
                      placeholder="Digite sua nova senha"
                      className={`h-12 ${errors.senha ? 'border-red-500' : ''}`}
                      {...register('senha')}
                      disabled={isLoading}
                    />
                    {errors.senha && (
                      <p className="text-sm text-red-600">{errors.senha.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmSenha" className="text-gray-700">
                      Confirme a Senha
                    </Label>
                    <Input
                      id="confirmSenha"
                      type="password"
                      placeholder="Confirme sua nova senha"
                      className={`h-12 ${errors.confirmSenha ? 'border-red-500' : ''}`}
                      {...register('confirmSenha')}
                      disabled={isLoading}
                    />
                    {errors.confirmSenha && (
                      <p className="text-sm text-red-600">
                        {errors.confirmSenha.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Redefinindo...' : 'Nova senha'}
                  </Button>
                </form>
              </>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-gray-700 hover:underline"
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
