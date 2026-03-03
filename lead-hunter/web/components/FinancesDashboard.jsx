'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Plus, X, DollarSign, Wallet, Download } from 'lucide-react';

const categoryLabels = {
  // Income
  project_payment: 'Pago de proyecto', retainer: 'Retainer', bonus: 'Bonus', refund: 'Reembolso',
  // Expenses
  software: 'Software', hardware: 'Hardware', hosting: 'Hosting', domain: 'Dominio',
  ai_tools: 'Herramientas IA', marketing: 'Marketing', education: 'Formación',
  taxes: 'Impuestos', accountant: 'Contable', office: 'Oficina', travel: 'Viajes',
  platform_credits: 'Créditos plataforma', other: 'Otros',
};

export default function FinancesDashboard({ initialFinances, summary }) {
  const [finances, setFinances] = useState(initialFinances?.finances || []);
  const [pagination, setPagination] = useState(initialFinances?.pagination);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('income');
  const [form, setForm] = useState({ type: 'income', category: 'project_payment', amount: '', description: '', date: new Date().toISOString().split('T')[0], tax_deductible: false });

  const income = summary?.income || 0;
  const expenses = summary?.expenses || 0;
  const balance = income - expenses;

  async function fetchData(params = {}) {
    try {
      const query = new URLSearchParams({ limit: '30', ...params });
      const res = await fetch(`/api/freelance/finances?${query}`);
      const data = await res.json();
      setFinances(data.finances || []);
      setPagination(data.pagination);
    } catch {}
  }

  async function createFinance(e) {
    e.preventDefault();
    if (!form.amount) return;

    await fetch('/api/freelance/finances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    setShowForm(false);
    setForm({ type: 'income', category: 'project_payment', amount: '', description: '', date: new Date().toISOString().split('T')[0], tax_deductible: false });
    fetchData();
  }

  async function deleteFinance(id) {
    if (!confirm('¿Eliminar este registro?')) return;
    await fetch(`/api/freelance/finances`, {
      method: 'POST', // Workaround: DELETE via body
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _method: 'DELETE', id }),
    });
    fetchData();
  }

  const incomeCategories = ['project_payment', 'retainer', 'bonus', 'refund'];
  const expenseCategories = ['software', 'hardware', 'hosting', 'domain', 'ai_tools', 'marketing', 'education', 'taxes', 'accountant', 'office', 'travel', 'platform_credits', 'other'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Finanzas</h1>
        <div className="flex gap-2">
          <a href="/api/freelance/finances/export" download className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 border border-gray-700">
            <Download size={16} /> CSV
          </a>
          <button onClick={() => { setFormType('income'); setForm(f => ({ ...f, type: 'income', category: 'project_payment' })); setShowForm(true); }} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500">
            <Plus size={16} /> Ingreso
          </button>
          <button onClick={() => { setFormType('expense'); setForm(f => ({ ...f, type: 'expense', category: 'software' })); setShowForm(true); }} className="flex items-center gap-2 px-3 py-2 bg-red-600/80 text-white rounded-lg text-sm hover:bg-red-500">
            <Plus size={16} /> Gasto
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <TrendingUp size={18} />
            <span className="text-sm text-gray-400">Ingresos (mes)</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{income.toLocaleString('es-ES')}€</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <TrendingDown size={18} />
            <span className="text-sm text-gray-400">Gastos (mes)</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{expenses.toLocaleString('es-ES')}€</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={18} className={balance >= 0 ? 'text-emerald-400' : 'text-red-400'} />
            <span className="text-sm text-gray-400">Balance</span>
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {balance >= 0 ? '+' : ''}{balance.toLocaleString('es-ES')}€
          </p>
        </div>
      </div>

      {/* Desglose por categoría */}
      {summary?.byCategory?.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">Desglose por categoría</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {summary.byCategory.map(({ category, type, total }) => (
              <div key={`${type}-${category}`} className="flex justify-between items-center px-3 py-2 bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-400">{categoryLabels[category] || category}</span>
                <span className={`text-sm font-medium ${type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {type === 'income' ? '+' : '-'}{total.toLocaleString('es-ES')}€
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={createFinance} className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">
                {form.type === 'income' ? 'Nuevo ingreso' : 'Nuevo gasto'}
              </h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div>
              <label className="text-sm text-gray-400">Categoría</label>
              <select className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 mt-1 border border-gray-700 text-sm" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {(form.type === 'income' ? incomeCategories : expenseCategories).map(c => (
                  <option key={c} value={c}>{categoryLabels[c] || c}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400">Cantidad (€) *</label>
                <input type="number" step="0.01" className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 mt-1 border border-gray-700 text-sm" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div>
                <label className="text-sm text-gray-400">Fecha *</label>
                <input type="date" className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 mt-1 border border-gray-700 text-sm" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400">Descripción</label>
              <input className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 mt-1 border border-gray-700 text-sm" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            {form.type === 'expense' && (
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input type="checkbox" checked={form.tax_deductible} onChange={e => setForm(f => ({ ...f, tax_deductible: e.target.checked }))} className="rounded border-gray-700" />
                Deducible fiscalmente
              </label>
            )}
            <button type="submit" className={`w-full text-white rounded-lg py-2 text-sm ${form.type === 'income' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}>
              Registrar {form.type === 'income' ? 'ingreso' : 'gasto'}
            </button>
          </form>
        </div>
      )}

      {/* Tabla de movimientos */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">Últimos movimientos</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-left">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3 text-right">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {finances.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-500">Sin movimientos. Registra tu primer ingreso o gasto.</td></tr>
            ) : finances.map(f => (
              <tr key={f.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 text-gray-400 text-xs">{f.date}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${f.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {f.type === 'income' ? 'Ingreso' : 'Gasto'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{categoryLabels[f.category] || f.category}</td>
                <td className="px-4 py-3 text-gray-300 text-xs">{f.description || '—'}</td>
                <td className={`px-4 py-3 text-right font-medium ${f.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {f.type === 'income' ? '+' : '-'}{f.amount.toLocaleString('es-ES')}€
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
