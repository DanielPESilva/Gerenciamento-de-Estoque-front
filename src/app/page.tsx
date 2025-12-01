'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-2 bg-emerald-500 rounded-full animate-pulse"
              style={{ height: `${32 + i * 6}px` }}
            />
          ))}
        </div>
        <h1 className="text-4xl font-serif text-emerald-600">Dressify</h1>
        <p className="text-gray-500 mt-2">Carregando...</p>
      </div>
    </div>
  );
}
