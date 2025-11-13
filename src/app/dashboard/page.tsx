'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-emerald-500 rounded-full"
                  style={{ height: `${20 + i * 4}px` }}
                />
              ))}
            </div>
            <h1 className="text-2xl font-serif text-emerald-600">Dressify</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-gray-700">Olá, {user?.nome}</span>
            <Button 
              variant="outline" 
              onClick={logout}
              className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
          <p className="text-gray-600">
            Bem-vindo ao sistema de gerenciamento de estoque Dressify!
          </p>
          <p className="text-gray-600 mt-2">
            Em breve você terá acesso a todas as funcionalidades do sistema.
          </p>
        </div>
      </main>
    </div>
  );
}
