'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';

type SaleHistoryDetail = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type SaleHistoryEntry = {
  timestamp: string;
  items: number;
  amount: number;
  method: string;
  details: SaleHistoryDetail[];
};

type FilterRange = 'all' | 'day' | 'week' | 'month' | 'year';

const FILTER_OPTIONS: { value: FilterRange; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'day', label: 'Hoje' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'year', label: 'Ano' }
];

const STORAGE_KEY = 'dressfy-sales-history';

const getRangeStart = (filter: FilterRange): Date | null => {
  const now = new Date();
  now.setSeconds(0, 0);

  switch (filter) {
    case 'day': {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    case 'week': {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case 'month': {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    case 'year': {
      return new Date(now.getFullYear(), 0, 1);
    }
    case 'all':
    default:
      return null;
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));

const getEntryItems = (entry: SaleHistoryEntry) =>
  entry.details.length
    ? entry.details.reduce((total, detail) => total + detail.quantity, 0)
    : entry.items;

const getEntryAmount = (entry: SaleHistoryEntry) =>
  entry.details.length
    ? entry.details.reduce((total, detail) => total + detail.subtotal, 0)
    : entry.amount;

export default function HistoricoVendasPage() {
  const [history, setHistory] = useState<SaleHistoryEntry[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterRange>('month');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadHistory = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setHistory([]);
        return;
      }

      try {
        const parsed: SaleHistoryEntry[] = JSON.parse(stored).map(
          (entry: Partial<SaleHistoryEntry>): SaleHistoryEntry => ({
            timestamp: entry.timestamp ?? new Date().toISOString(),
            items: entry.items ?? 0,
            amount: entry.amount ?? 0,
            method: entry.method ?? 'Desconhecido',
            details:
              entry.details?.map((detail) => ({
                id: detail?.id ?? 0,
                name: detail?.name ?? 'Item',
                quantity: detail?.quantity ?? 0,
                unitPrice: detail?.unitPrice ?? 0,
                subtotal: detail?.subtotal ?? 0
              })) ?? []
          })
        );
        parsed.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() -
            new Date(a.timestamp).getTime()
        );
        setHistory(parsed);
      } catch (error) {
        console.error('Erro ao carregar histórico de vendas:', error);
      }
    };

    loadHistory();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        loadHistory();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const filteredHistory = useMemo(() => {
    if (!history.length) {
      return [];
    }

    if (selectedFilter === 'custom') {
      if (!customRange) {
        return history;
      }
      return history.filter((entry) => {
        const timestamp = new Date(entry.timestamp).getTime();
        return (
          timestamp >= customRange.start.getTime() &&
          timestamp <= customRange.end.getTime()
        );
      });
    }

    const rangeStart = getRangeStart(selectedFilter);

    if (!rangeStart) {
      return history;
    }

    return history.filter(
      (entry) => new Date(entry.timestamp).getTime() >= rangeStart.getTime()
    );
  }, [history, selectedFilter, customRange]);

  const totalAmount = useMemo(
    () => filteredHistory.reduce((total, entry) => total + getEntryAmount(entry), 0),
    [filteredHistory]
  );

  const totalItems = useMemo(
    () => filteredHistory.reduce((total, entry) => total + getEntryItems(entry), 0),
    [filteredHistory]
  );

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activePage="preparar-venda" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Histórico de vendas</h1>
            <p className="mt-1 text-sm text-gray-500">
              Consulte todas as vendas registradas e filtre por período.
            </p>
          </div>
          <Link
            href="/preparar-venda"
            className="rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-600 transition hover:bg-emerald-50"
          >
            Voltar para Preparar Venda
          </Link>
        </div>

        <section className="mb-6 rounded-lg border border-emerald-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Filtrar por:</span>
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={selectedFilter === option.value ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedFilter(option.value);
                    if (option.value !== 'custom') {
                      setCustomRange(null);
                    }
                  }}
                  className={
                    selectedFilter === option.value
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
            <div className="flex flex-col">
              <label htmlFor="custom-start" className="text-xs font-medium text-gray-600">
                Início do período
              </label>
              <input
                id="custom-start"
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className="mt-1 rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                max={customEnd || undefined}
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="custom-end" className="text-xs font-medium text-gray-600">
                Final do período
              </label>
              <input
                id="custom-end"
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="mt-1 rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                min={customStart || undefined}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
                onClick={() => {
                  if (!customStart || !customEnd) {
                    return;
                  }
                  const start = new Date(customStart);
                  start.setHours(0, 0, 0, 0);
                  const end = new Date(customEnd);
                  end.setHours(23, 59, 59, 999);
                  setCustomRange({ start, end });
                  setSelectedFilter('custom');
                }}
                disabled={!customStart || !customEnd}
              >
                Aplicar intervalo
              </Button>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-emerald-100 bg-white p-4 text-center shadow-sm">
            <div className="text-sm text-emerald-700">Vendas no período</div>
            <div className="text-2xl font-semibold text-emerald-600">
              {filteredHistory.length}
            </div>
          </div>
          <div className="rounded-lg border border-blue-100 bg-white p-4 text-center shadow-sm">
            <div className="text-sm text-blue-700">Itens vendidos</div>
            <div className="text-2xl font-semibold text-blue-600">
              {totalItems}
            </div>
          </div>
          <div className="rounded-lg border border-purple-100 bg-white p-4 text-center shadow-sm">
            <div className="text-sm text-purple-700">Total arrecadado</div>
            <div className="text-2xl font-semibold text-purple-600">
              {formatCurrency(totalAmount)}
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-white shadow">
          {filteredHistory.length === 0 ? (
            <div className="px-6 py-20 text-center text-gray-500">
              Nenhuma venda registrada para o período selecionado.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Data e hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Itens
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Método
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                      Detalhes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredHistory.map((sale, index) => {
                    const isExpanded = expandedIndex === index;
                    return (
                      <Fragment key={`${sale.timestamp}-${index}`}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-800">
                            {formatDateTime(sale.timestamp)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {getEntryItems(sale)}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                            {formatCurrency(getEntryAmount(sale))}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{sale.method}</td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setExpandedIndex(isExpanded ? null : index)}
                              className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                            >
                              {isExpanded ? 'Ocultar' : 'Ver detalhes'}
                            </Button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan={5} className="px-6 py-4">
                              {sale.details.length === 0 ? (
                                <div className="rounded-lg border border-gray-200 bg-white px-4 py-4 text-sm text-gray-500">
                                  Esta venda não possui detalhes registrados.
                                </div>
                              ) : (
                                <div className="overflow-hidden rounded-lg border border-emerald-100 bg-white">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-emerald-50/60">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-emerald-700">
                                          Item
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-emerald-700">
                                          Quantidade
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-emerald-700">
                                          Valor unitário
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-emerald-700">
                                          Subtotal
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {sale.details.map((detail) => (
                                        <tr key={`${sale.timestamp}-${detail.id}-${detail.name}`}>
                                          <td className="px-4 py-2 text-sm font-medium text-gray-800">
                                            {detail.name}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-gray-600">
                                            {detail.quantity}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-gray-600">
                                            {formatCurrency(detail.unitPrice)}
                                          </td>
                                          <td className="px-4 py-2 text-sm font-semibold text-gray-800">
                                            {formatCurrency(detail.subtotal)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

