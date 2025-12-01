'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  activePage?: 'estoque' | 'cadastrar-condicional' | 'preparar-venda' | 'meu-condicional' | 'cadastrar-item' | 'visualizar-item';
}

export function Header({ activePage = 'estoque' }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();

  const avatarStorageKey = user ? `profileAvatar:${user.id}` : null;
  const avatarUrl =
    avatarStorageKey && typeof window !== 'undefined'
      ? localStorage.getItem(avatarStorageKey)
      : null;

  const displayName = user?.nome ?? 'Usuário';
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    displayName
  )}&background=10B981&color=FFFFFF&size=128`;

  return (
    <header className="bg-gray-800 text-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-3 rounded-md bg-transparent text-white transition hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-white rounded-full"
                  style={{ height: `${12 + i * 3}px` }}
                />
              ))}
            </div>
            <span className="text-xl font-serif">Dressify</span>
          </button>

          {/* Navigation */}
          <nav className="flex gap-6">
            <button 
              onClick={() => router.push('/dashboard')}
              className={`transition ${
                activePage === 'estoque' 
                  ? 'text-white border-b-2 border-emerald-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Meu Estoque
            </button>
            <button 
              onClick={() => router.push('/cadastrar-condicional')}
              className={`transition ${
                activePage === 'cadastrar-condicional' 
                  ? 'text-white border-b-2 border-emerald-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Cadastrar Condicional
            </button>
            <button 
              onClick={() => router.push('/preparar-venda')}
              className={`transition ${
                activePage === 'preparar-venda' 
                  ? 'text-white border-b-2 border-emerald-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Preparar Venda
            </button>
            <button 
              onClick={() => router.push('/meu-condicional')}
              className={`transition ${
                activePage === 'meu-condicional' 
                  ? 'text-white border-b-2 border-emerald-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Meu Condicional
            </button>
            <button 
              onClick={() => router.push('/cadastrar-item')}
              className={`transition ${
                activePage === 'cadastrar-item' 
                  ? 'text-white border-b-2 border-emerald-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Cadastrar Item
            </button>
          </nav>

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/meu-perfil')}
              className="flex items-center gap-3 rounded-full bg-transparent text-white/80 transition hover:text-white"
            >
              <img
                src={avatarUrl ?? fallbackAvatar}
                alt={displayName}
                className="h-10 w-10 rounded-full border border-white/30 object-cover"
              />
              <span className="hidden text-sm sm:inline">
                {displayName.split(' ')[0] ?? 'Meu Perfil'}
              </span>
            </button>
            <button
              onClick={logout}
              className="rounded-full border border-white/20 px-3 py-1 text-sm text-gray-200 transition hover:border-white/40 hover:text-white"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

