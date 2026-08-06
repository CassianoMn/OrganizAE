import React, { useState, useMemo } from 'react';
import { useFinance, Budget, BudgetCategory } from '../context/FinanceContext';
import { Card, CardContent } from './ui/card';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Plus, Save, X } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { transactions, budgets, selectedPeriod, addBudget, updateBudget, isDarkMode } = useFinance();
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [editingInitialBalance, setEditingInitialBalance] = useState(0);
  const [editingCategories, setEditingCategories] = useState<BudgetCategory[]>([]);
  
  const [promptData, setPromptData] = useState<{isOpen: boolean, type: 'expense' | 'income', value: string}>({
    isOpen: false,
    type: 'expense',
    value: ''
  });
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Filter transactions by period
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (selectedPeriod === 'all') return true;
      const [year, part] = selectedPeriod.split('-');
      const tYear = t.date.substring(0, 4);
      const tMonth = parseInt(t.date.substring(5, 7), 10);
      
      if (tYear !== year) return false;
      
      if (part.startsWith('Q')) {
        const quarter = parseInt(part.substring(1), 10);
        return Math.ceil(tMonth / 3) === quarter;
      } else if (part.startsWith('S')) {
        const semester = parseInt(part.substring(1), 10);
        return Math.ceil(tMonth / 6) === semester;
      } else {
        return t.date.substring(5, 7) === part;
      }
    });
  }, [transactions, selectedPeriod]);

  // Filter budgets by period
  const filteredBudgets = useMemo(() => {
    return budgets.filter(b => {
      if (selectedPeriod === 'all') return true;
      const [year, part] = selectedPeriod.split('-');
      const [bYear, bMonthStr] = b.monthYear.split('-');
      const bMonth = parseInt(bMonthStr, 10);
      
      if (bYear !== year) return false;
      
      if (part.startsWith('Q')) {
        const quarter = parseInt(part.substring(1), 10);
        return Math.ceil(bMonth / 3) === quarter;
      } else if (part.startsWith('S')) {
        const semester = parseInt(part.substring(1), 10);
        return Math.ceil(bMonth / 6) === semester;
      } else {
        return bMonthStr === part;
      }
    });
  }, [budgets, selectedPeriod]);

  // Aggregate budget data
  const initialBalance = filteredBudgets.reduce((sum, b) => sum + b.initialBalance, 0);
  
  const aggregatedCategories = useMemo(() => {
    const cats: Record<string, BudgetCategory> = {};
    filteredBudgets.forEach(b => {
      b.categories.forEach(c => {
        if (!cats[c.name]) {
          cats[c.name] = { name: c.name, planned: 0, type: c.type };
        }
        cats[c.name].planned += c.planned;
      });
    });
    return Object.values(cats);
  }, [filteredBudgets]);

  // Calculate totals
  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const finalBalance = initialBalance + totalIncome - totalExpenses;
  const savings = totalIncome - totalExpenses;

  // Calculate category totals
  const expenseCategories = aggregatedCategories.filter(c => c.type === 'expense');
  const incomeCategories = aggregatedCategories.filter(c => c.type === 'income');

  const getCategoryReal = (categoryName: string, type: 'expense' | 'income') => {
    return filteredTransactions
      .filter(t => t.type === type && t.category === categoryName)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const expenseData = expenseCategories.map(c => {
    const real = getCategoryReal(c.name, 'expense');
    return {
      name: c.name,
      planned: c.planned,
      real: real,
      diff: c.planned - real
    };
  });

  const incomeData = incomeCategories.map(c => {
    const real = getCategoryReal(c.name, 'income');
    return {
      name: c.name,
      planned: c.planned,
      real: real,
      diff: real - c.planned
    };
  });

  const totalPlannedExpenses = expenseCategories.reduce((sum, c) => sum + c.planned, 0);
  const totalPlannedIncome = incomeCategories.reduce((sum, c) => sum + c.planned, 0);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const balanceData = [
    { name: 'SALDO INICIAL', value: initialBalance, fill: '#334155' },
    { name: 'SALDO FINAL', value: finalBalance, fill: '#f97316' }
  ];

  const isSpecificMonth = selectedPeriod !== 'all' && !selectedPeriod.includes('Q') && !selectedPeriod.includes('S');
  const currentBudget = isSpecificMonth ? budgets.find(b => b.monthYear === selectedPeriod) : null;

  const handleEditBudget = () => {
    if (!isSpecificMonth) {
      setAlertMessage('Selecione um mês específico para editar o orçamento.');
      return;
    }
    
    if (currentBudget) {
      setEditingInitialBalance(currentBudget.initialBalance);
      setEditingCategories([...currentBudget.categories]);
    } else {
      setEditingInitialBalance(0);
      setEditingCategories([
        { name: 'Moradia', planned: 0, type: 'expense' },
        { name: 'Alimentação', planned: 0, type: 'expense' },
        { name: 'Transporte', planned: 0, type: 'expense' },
        { name: 'Salário', planned: 0, type: 'income' }
      ]);
    }
    setIsEditingBudget(true);
  };

  const handleSaveBudget = async () => {
    if (!isSpecificMonth) return;

    if (currentBudget) {
      await updateBudget(currentBudget.id, {
        initialBalance: editingInitialBalance,
        categories: editingCategories
      });
    } else {
      await addBudget({
        monthYear: selectedPeriod,
        initialBalance: editingInitialBalance,
        categories: editingCategories
      });
    }
    setIsEditingBudget(false);
  };

  const handleAddCategory = (type: 'expense' | 'income') => {
    setPromptData({ isOpen: true, type, value: '' });
  };

  const confirmAddCategory = () => {
    if (promptData.value.trim()) {
      setEditingCategories([...editingCategories, { name: promptData.value.trim(), planned: 0, type: promptData.type }]);
    }
    setPromptData({ isOpen: false, type: 'expense', value: '' });
  };

  const handleUpdateCategory = (index: number, planned: number) => {
    const newCats = [...editingCategories];
    newCats[index].planned = planned;
    setEditingCategories(newCats);
  };

  const handleRemoveCategory = (index: number) => {
    const newCats = [...editingCategories];
    newCats.splice(index, 1);
    setEditingCategories(newCats);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-orange-600 dark:text-orange-500">Visão Geral</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {selectedPeriod === 'all' ? 'Todo o período' : selectedPeriod}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center space-x-2 text-sm w-full sm:w-auto justify-between sm:justify-start">
            <span className="font-medium text-slate-600 dark:text-slate-400">Saldo inicial:</span>
            <span className="bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 px-3 py-1 rounded font-semibold">{formatCurrency(initialBalance)}</span>
          </div>
          {isSpecificMonth && (
            <button 
              onClick={isEditingBudget ? handleSaveBudget : handleEditBudget}
              className="flex items-center justify-center space-x-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
            >
              {isEditingBudget ? <Save size={18} /> : <Plus size={18} />}
              <span>{isEditingBudget ? 'Salvar Orçamento' : (currentBudget ? 'Editar Orçamento' : 'Criar Orçamento')}</span>
            </button>
          )}
        </div>
      </div>

      {isEditingBudget ? (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Editar Orçamento: {selectedPeriod}</h3>
            <button onClick={() => setIsEditingBudget(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={24} />
            </button>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Saldo Inicial</label>
            <input 
              type="number" 
              step="0.01"
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2 w-full sm:max-w-xs"
              value={editingInitialBalance}
              onChange={e => setEditingInitialBalance(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-orange-600 dark:text-orange-400">Categorias de Despesa</h4>
                <button onClick={() => handleAddCategory('expense')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                  <Plus size={14} className="mr-1" /> Adicionar
                </button>
              </div>
              <div className="space-y-3">
                {editingCategories.map((cat, idx) => cat.type === 'expense' && (
                  <div key={idx} className="flex items-center space-x-2">
                    <span className="w-24 sm:w-32 truncate text-sm sm:text-base text-slate-700 dark:text-slate-300">{cat.name}</span>
                    <input 
                      type="number" 
                      step="0.01"
                      className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-1 flex-1 w-full"
                      value={cat.planned || ''}
                      onChange={e => handleUpdateCategory(idx, parseFloat(e.target.value) || 0)}
                    />
                    <button onClick={() => handleRemoveCategory(idx)} className="text-red-500 hover:text-red-700 p-2">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-emerald-600 dark:text-emerald-400">Categorias de Renda</h4>
                <button onClick={() => handleAddCategory('income')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                  <Plus size={14} className="mr-1" /> Adicionar
                </button>
              </div>
              <div className="space-y-3">
                {editingCategories.map((cat, idx) => cat.type === 'income' && (
                  <div key={idx} className="flex items-center space-x-2">
                    <span className="w-24 sm:w-32 truncate text-sm sm:text-base text-slate-700 dark:text-slate-300">{cat.name}</span>
                    <input 
                      type="number" 
                      step="0.01"
                      className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-1 flex-1 w-full"
                      value={cat.planned || ''}
                      onChange={e => handleUpdateCategory(idx, parseFloat(e.target.value) || 0)}
                    />
                    <button onClick={() => handleRemoveCategory(idx)} className="text-red-500 hover:text-red-700 p-2">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-none shadow-none bg-transparent dark:bg-transparent">
              <CardContent className="h-64 pt-6 px-0 sm:px-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={balanceData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94a3b8' : '#475569', fontWeight: 600, fontSize: 10 }} />
                    <Tooltip cursor={{fill: 'transparent'}} formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                      {balanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex justify-around mt-2 text-xs sm:text-sm font-medium">
                  <span className="text-slate-500 dark:text-slate-400">{formatCurrency(initialBalance)}</span>
                  <span className="text-orange-500">{formatCurrency(finalBalance)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-100 dark:bg-slate-900 border-none flex flex-col justify-center items-center text-center p-6 sm:p-8">
              <div className="space-y-2 mt-6">
                <div className={`text-3xl sm:text-4xl font-light ${savings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(savings)}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 italic">Economia no período</div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 mt-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Despesas</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="w-20 sm:w-24 text-xs sm:text-sm text-slate-600 dark:text-slate-400">Planejado</span>
                  <span className="w-24 sm:w-28 text-xs sm:text-sm font-medium">{formatCurrency(totalPlannedExpenses)}</span>
                  <div className="flex-1 h-4 sm:h-6 bg-slate-200 dark:bg-slate-800 rounded overflow-hidden">
                    <div className="h-full bg-slate-400 dark:bg-slate-600" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="w-20 sm:w-24 text-xs sm:text-sm text-slate-600 dark:text-slate-400">Real</span>
                  <span className="w-24 sm:w-28 text-xs sm:text-sm font-medium">{formatCurrency(totalExpenses)}</span>
                  <div className="flex-1 h-4 sm:h-6 bg-slate-200 dark:bg-slate-800 rounded overflow-hidden">
                    <div className={`h-full ${totalExpenses > totalPlannedExpenses ? 'bg-red-500' : 'bg-slate-700 dark:bg-slate-400'}`} style={{ width: `${Math.min(100, totalPlannedExpenses ? (totalExpenses / totalPlannedExpenses) * 100 : 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Renda</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="w-20 sm:w-24 text-xs sm:text-sm text-slate-600 dark:text-slate-400">Planejado</span>
                  <span className="w-24 sm:w-28 text-xs sm:text-sm font-medium">{formatCurrency(totalPlannedIncome)}</span>
                  <div className="flex-1 h-4 sm:h-6 bg-slate-200 dark:bg-slate-800 rounded overflow-hidden">
                    <div className="h-full bg-slate-400 dark:bg-slate-600" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="w-20 sm:w-24 text-xs sm:text-sm text-slate-600 dark:text-slate-400">Real</span>
                  <span className="w-24 sm:w-28 text-xs sm:text-sm font-medium">{formatCurrency(totalIncome)}</span>
                  <div className="flex-1 h-4 sm:h-6 bg-slate-200 dark:bg-slate-800 rounded overflow-hidden">
                    <div className={`h-full ${totalIncome < totalPlannedIncome ? 'bg-red-500' : 'bg-emerald-600 dark:bg-emerald-500'}`} style={{ width: `${Math.min(100, totalPlannedIncome ? (totalIncome / totalPlannedIncome) * 100 : 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 pt-8">
            <div>
              <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-500 mb-4">Despesas</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm min-w-[300px]">
                  <thead>
                    <tr className="border-b-2 border-slate-300 dark:border-slate-700">
                      <th className="text-left py-2 font-medium text-slate-600 dark:text-slate-400">Categoria</th>
                      <th className="text-right py-2 font-medium text-slate-600 dark:text-slate-400">Planejado</th>
                      <th className="text-right py-2 font-medium text-slate-600 dark:text-slate-400">Real</th>
                      <th className="text-right py-2 font-medium text-slate-600 dark:text-slate-400">Diferença</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-semibold">
                      <td className="py-2 text-slate-800 dark:text-slate-200">Totais</td>
                      <td className="text-right text-orange-500">{formatCurrency(totalPlannedExpenses)}</td>
                      <td className="text-right text-slate-700 dark:text-slate-300">{formatCurrency(totalExpenses)}</td>
                      <td className={`text-right ${totalPlannedExpenses - totalExpenses < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {formatCurrency(totalPlannedExpenses - totalExpenses)}
                      </td>
                    </tr>
                    {expenseData.map((row, i) => (
                      <tr key={row.name} className={`border-b border-slate-100 dark:border-slate-800 ${i % 2 === 0 ? 'bg-orange-50/30 dark:bg-orange-950/20' : ''}`}>
                        <td className="py-2 font-medium text-slate-700 dark:text-slate-300">{row.name}</td>
                        <td className="text-right text-slate-500 dark:text-slate-400">{formatCurrency(row.planned)}</td>
                        <td className="text-right text-slate-700 dark:text-slate-300">{formatCurrency(row.real)}</td>
                        <td className={`text-right ${row.diff < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {row.diff < 0 ? '-' : ''}{formatCurrency(Math.abs(row.diff))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 mb-4">Renda</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm min-w-[300px]">
                  <thead>
                    <tr className="border-b-2 border-slate-300 dark:border-slate-700">
                      <th className="text-left py-2 font-medium text-slate-600 dark:text-slate-400">Categoria</th>
                      <th className="text-right py-2 font-medium text-slate-600 dark:text-slate-400">Planejado</th>
                      <th className="text-right py-2 font-medium text-slate-600 dark:text-slate-400">Real</th>
                      <th className="text-right py-2 font-medium text-slate-600 dark:text-slate-400">Diferença</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-semibold">
                      <td className="py-2 text-slate-800 dark:text-slate-200">Totais</td>
                      <td className="text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPlannedIncome)}</td>
                      <td className="text-right text-slate-700 dark:text-slate-300">{formatCurrency(totalIncome)}</td>
                      <td className={`text-right ${totalIncome - totalPlannedIncome < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {formatCurrency(totalIncome - totalPlannedIncome)}
                      </td>
                    </tr>
                    {incomeData.map((row, i) => (
                      <tr key={row.name} className={`border-b border-slate-100 dark:border-slate-800 ${i % 2 === 0 ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''}`}>
                        <td className="py-2 font-medium text-slate-700 dark:text-slate-300">{row.name}</td>
                        <td className="text-right text-slate-500 dark:text-slate-400">{formatCurrency(row.planned)}</td>
                        <td className="text-right text-slate-700 dark:text-slate-300">{formatCurrency(row.real)}</td>
                        <td className={`text-right ${row.diff < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {row.diff < 0 ? '-' : ''}{formatCurrency(Math.abs(row.diff))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-xl max-w-sm w-full border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Aviso</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">{alertMessage}</p>
            <div className="flex justify-end">
              <button 
                onClick={() => setAlertMessage(null)} 
                className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Prompt Modal */}
      {promptData.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-xl max-w-sm w-full border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              Nova Categoria de {promptData.type === 'expense' ? 'Despesa' : 'Renda'}
            </h3>
            <input
              type="text"
              autoFocus
              placeholder="Nome da categoria"
              value={promptData.value}
              onChange={(e) => setPromptData({ ...promptData, value: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && confirmAddCategory()}
              className="w-full p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mb-6"
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setPromptData({ isOpen: false, type: 'expense', value: '' })} 
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmAddCategory} 
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
