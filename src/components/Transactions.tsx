import React, { useState, useRef, useMemo } from 'react';
import { useFinance, Transaction } from '../context/FinanceContext';
import { Plus, Pencil, Trash2, X, Upload, Loader2, Key } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

export const Transactions: React.FC = () => {
  const { transactions, budgets, selectedPeriod, addTransaction, updateTransaction, deleteTransaction } = useFinance();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const [newTx, setNewTx] = useState<Partial<Transaction>>({
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
    category: ''
  });

  const filteredBudgets = useMemo(() => {
    if (selectedPeriod === 'all') return budgets;
    return budgets.filter(b => b.monthYear === selectedPeriod);
  }, [budgets, selectedPeriod]);

  const aggregatedCategories = useMemo(() => {
    const cats: Record<string, { name: string, type: 'expense' | 'income' }> = {};
    filteredBudgets.forEach(b => {
      b.categories.forEach(c => {
        if (!cats[c.name]) {
          cats[c.name] = { name: c.name, type: c.type };
        }
      });
    });
    return Object.values(cats);
  }, [filteredBudgets]);

  const dynamicExpenseCategories = aggregatedCategories.filter(c => c.type === 'expense').map(c => c.name);
  const dynamicIncomeCategories = aggregatedCategories.filter(c => c.type === 'income').map(c => c.name);

  const expenseCategories = dynamicExpenseCategories.length > 0 ? dynamicExpenseCategories : ['Alimentação', 'Presentes', 'Saúde', 'Moradia', 'Transporte', 'Cassiano', 'Água', 'Luz', 'Lazer', 'Crédito', 'Outros', 'Moto', 'Internet', 'Diovana', 'Mercado'];
  const incomeCategories = dynamicIncomeCategories.length > 0 ? dynamicIncomeCategories : ['Poupança', 'Pagamento', 'Bônus', 'Juros', 'Outros', 'Categoria personalizada'];

  const filterByPeriod = (tx: Transaction) => {
    if (selectedPeriod === 'all') return true;

    const [year, part] = selectedPeriod.split('-');
    const txYear = tx.date.substring(0, 4);
    const txMonth = parseInt(tx.date.substring(5, 7), 10);

    if (txYear !== year) return false;

    if (part.startsWith('Q')) {
      const quarter = parseInt(part.substring(1), 10);
      return Math.ceil(txMonth / 3) === quarter;
    } else if (part.startsWith('S')) {
      const semester = parseInt(part.substring(1), 10);
      return Math.ceil(txMonth / 6) === semester;
    } else {
      // Specific month
      return tx.date.substring(5, 7) === part;
    }
  };

  const filteredTransactions = transactions.filter(filterByPeriod);
  const expenses = filteredTransactions.filter(t => t.type === 'expense').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const incomes = filteredTransactions.filter(t => t.type === 'income').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (value: number) => {
    return `R$${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTx.amount !== undefined && !isNaN(newTx.amount) && newTx.description && newTx.category && newTx.date && newTx.type) {
      if (editingId) {
        await updateTransaction(editingId, {
          amount: Number(newTx.amount),
          description: newTx.description,
          category: newTx.category,
          date: newTx.date,
          type: newTx.type as 'expense' | 'income'
        });
      } else {
        await addTransaction({
          amount: Number(newTx.amount),
          description: newTx.description,
          category: newTx.category,
          date: newTx.date,
          type: newTx.type as 'expense' | 'income'
        });
      }
      resetForm();
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setNewTx({
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      description: '',
      category: ''
    });
  };

  const handleEdit = (tx: Transaction) => {
    setNewTx(tx);
    setEditingId(tx.id);
    setShowAddForm(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteTransaction(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [customApiKeyInput, setCustomApiKeyInput] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const getGeminiApiKey = (): string | null => {
    const envKey = (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')
      ? process.env.GEMINI_API_KEY
      : (process.env.VITE_GEMINI_API_KEY || process.env.CUSTOM_API_KEY || process.env.API_KEY);

    if (envKey && envKey.trim().length > 0) return envKey.trim();

    const storedKey = localStorage.getItem('organizae_gemini_api_key');
    if (storedKey && storedKey.trim().length > 0) return storedKey.trim();

    return null;
  };

  const handleSaveApiKey = () => {
    if (customApiKeyInput.trim()) {
      const keyToSave = customApiKeyInput.trim();
      localStorage.setItem('organizae_gemini_api_key', keyToSave);
      setShowApiKeyModal(false);
      if (pendingFile) {
        const fileToProcess = pendingFile;
        setPendingFile(null);
        executeFileAnalysis(fileToProcess, keyToSave);
      }
    }
  };

  const executeFileAnalysis = async (file: File, apiKey: string) => {
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const ai = new GoogleGenAI({ apiKey: apiKey });

          const prompt = `Analise esta nota fiscal ou extrato bancário e extraia as transações.
          O período atual selecionado pelo usuário é ${selectedPeriod !== 'all' ? selectedPeriod : 'o mês atual'}.
          A data da transação deve ser a data atual (hoje) para cada nota lida, a menos que o extrato tenha datas específicas para cada transação.
          Retorne APENAS um JSON com o seguinte formato, sem formatação markdown ou texto adicional:
          {
            "transactions": [
              {
                "description": "Nome do estabelecimento ou descrição da transação",
                "amount": 150.50,
                "type": "expense" ou "income",
                "category": "Escolha a categoria que melhor se encaixa. Para despesas: ${expenseCategories.join(', ')}. Para rendas: ${incomeCategories.join(', ')}",
                "date": "YYYY-MM-DD"
              }
            ]
          }`;


          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
              parts: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType: file.type || 'image/jpeg'
                  }
                },
                { text: prompt }
              ]
            }
          });


          const text = response?.text;
          if (text) {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const data = JSON.parse(jsonMatch[0]);
              if (data.transactions && Array.isArray(data.transactions)) {
                for (const tx of data.transactions) {
                  await addTransaction({
                    description: tx.description,
                    amount: Number(tx.amount) || 0,
                    type: tx.type === 'income' ? 'income' : 'expense',
                    category: tx.category || 'Outros',
                    date: tx.date || new Date().toISOString().split('T')[0]
                  });
                }
                setAlertMessage(`${data.transactions.length} transações adicionadas com sucesso!`);
              } else {
                setAlertMessage('Formato de dados inválido retornado pela IA.');
              }
            } else {
              setAlertMessage('Não foi possível extrair as transações da imagem.');
            }
          }
        } catch (err: any) {
          console.error("Gemini OCR error:", err);
          const errMsg = err?.message || String(err);
          if (errMsg.includes('RESOURCE_EXHAUSTED') || err?.status === 429) {
            localStorage.removeItem('organizae_gemini_api_key');
            setCustomApiKeyInput('');
            setShowApiKeyModal(true);
            setAlertMessage('A sua chave API atingiu o limite de cota gratuita do Google (limit: 0). Por favor, gere uma nova chave gratuita no Google AI Studio e informe abaixo.');
          } else if (errMsg.includes('API_KEY_SERVICE_BLOCKED') || errMsg.includes('PERMISSION_DENIED') || err?.status === 403) {
            localStorage.removeItem('organizae_gemini_api_key');
            setCustomApiKeyInput('');
            setShowApiKeyModal(true);
            setAlertMessage('A chave API do Gemini informada está bloqueada ou sem permissão para o serviço Generative Language API. Por favor, crie uma nova chave gratuita no Google AI Studio e informe abaixo.');
          } else if (errMsg.includes('API key') || err?.status === 400) {
            localStorage.removeItem('organizae_gemini_api_key');
            setCustomApiKeyInput('');
            setShowApiKeyModal(true);
            setAlertMessage('Chave API inválida. Por favor, insira uma nova chave válida.');
          } else {
            setAlertMessage(`Erro ao analisar arquivo: ${errMsg}`);
          }
        } finally {
          setIsAnalyzing(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsAnalyzing(false);
      setAlertMessage('Erro ao ler o arquivo.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      setPendingFile(file);
      setCustomApiKeyInput('');
      setShowApiKeyModal(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    await executeFileAnalysis(file, apiKey);
  };

  const renderTable = (data: Transaction[], type: 'expense' | 'income') => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-slate-300 dark:border-slate-700">
            <th className="text-left py-2 font-medium text-slate-600 dark:text-slate-400 w-24">Data</th>
            <th className="text-left py-2 font-medium text-slate-600 dark:text-slate-400 w-24">Valor</th>
            <th className="text-left py-2 font-medium text-slate-600 dark:text-slate-400">Descrição</th>
            <th className="text-left py-2 font-medium text-slate-600 dark:text-slate-400 w-32">Categoria</th>
            <th className="text-right py-2 font-medium text-slate-600 dark:text-slate-400 w-20">Ações</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-4 text-center text-slate-500 dark:text-slate-400">Nenhuma transação encontrada.</td>
            </tr>
          ) : data.map((tx) => (
            <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800 border-dotted group hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <td className="py-2 text-slate-500 dark:text-slate-400">{formatDate(tx.date)}</td>
              <td className="py-2 text-slate-700 dark:text-slate-200 font-medium">{formatCurrency(tx.amount)}</td>
              <td className="py-2 text-slate-700 dark:text-slate-200">{tx.description}</td>
              <td className="py-2 text-slate-500 dark:text-slate-400">{tx.category}</td>
              <td className="py-2 text-right opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(tx)} className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 mr-2 p-2">
                  <Pencil size={16} />
                </button>
                <button onClick={() => setDeleteConfirmId(tx.id)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-2">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Transações</h2>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          <input
            type="file"
            accept="image/*,.pdf,.csv,.txt"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="flex items-center justify-center space-x-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg transition-colors w-full sm:w-auto disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            <span>{isAnalyzing ? 'Analisando...' : 'Importar Extrato/Nota'}</span>
          </button>
          <button
            onClick={() => {
              setCustomApiKeyInput(localStorage.getItem('organizae_gemini_api_key') || '');
              setShowApiKeyModal(true);
            }}
            className="flex items-center justify-center space-x-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg transition-colors"
            title="Configurar Chave API do Gemini"
          >
            <Key size={18} />
          </button>
          <button
            onClick={() => {
              if (showAddForm && !editingId) {
                resetForm();
              } else {
                resetForm();
                setShowAddForm(true);
              }
            }}
            className="flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
          >
            {showAddForm && !editingId ? <X size={18} /> : <Plus size={18} />}
            <span>{showAddForm && !editingId ? 'Cancelar' : 'Nova Transação'}</span>
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-8 relative">
          {editingId && (
            <button onClick={resetForm} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={20} />
            </button>
          )}
          <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">{editingId ? 'Editar Transação' : 'Adicionar Transação'}</h3>
          <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
              <select
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2"
                value={newTx.type}
                onChange={e => setNewTx({ ...newTx, type: e.target.value as 'expense' | 'income', category: '' })}
              >
                <option value="expense">Despesa</option>
                <option value="income">Renda</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
              <input
                type="date"
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2"
                value={newTx.date}
                onChange={e => setNewTx({ ...newTx, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor</label>
              <input
                type="number"
                step="0.01"
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2"
                value={newTx.amount || ''}
                onChange={e => setNewTx({ ...newTx, amount: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
              <input
                type="text"
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2"
                value={newTx.description}
                onChange={e => setNewTx({ ...newTx, description: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
              <select
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2"
                value={newTx.category}
                onChange={e => setNewTx({ ...newTx, category: e.target.value })}
                required
              >
                <option value="">Selecione...</option>
                {(newTx.type === 'expense' ? expenseCategories : incomeCategories).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-6 flex justify-end mt-4">
              <button type="submit" className="bg-slate-900 dark:bg-slate-700 text-white px-6 py-2 rounded-md hover:bg-slate-800 dark:hover:bg-slate-600 w-full sm:w-auto">
                {editingId ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-500 mb-6">Despesas</h3>
          {renderTable(expenses, 'expense')}
        </div>
        <div>
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 mb-6">Renda</h3>
          {renderTable(incomes, 'income')}
        </div>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-xl max-w-sm w-full border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Excluir Transação</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
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

      {/* Loading Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-xl flex flex-col items-center max-w-sm w-full border border-slate-200 dark:border-slate-800">
            <Loader2 size={48} className="text-slate-800 dark:text-slate-200 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Analisando Arquivo</h3>
            <p className="text-slate-600 dark:text-slate-300 text-center">Por favor, aguarde enquanto a inteligência artificial extrai as transações do seu arquivo...</p>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              🔑 Configurar Chave API do Gemini
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Para ler notas fiscais e extratos com IA, insira sua chave da API do Google Gemini. Você pode gerar uma gratuitamente no{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-orange-600 dark:text-orange-400 underline font-medium"
              >
                Google AI Studio
              </a>.
            </p>
            <input
              type="password"
              placeholder="Cole sua Gemini API Key (ex: AIzaSy...)"
              value={customApiKeyInput}
              onChange={(e) => setCustomApiKeyInput(e.target.value)}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 mb-6 text-sm"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowApiKeyModal(false); setPendingFile(null); }}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveApiKey}
                disabled={!customApiKeyInput.trim()}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Salvar e Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
