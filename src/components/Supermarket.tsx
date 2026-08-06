import React, { useState, useRef } from 'react';
import { useFinance, SupermarketItem } from '../context/FinanceContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Plus, Pencil, Trash2, X, Upload, Loader2, Key } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export const Supermarket: React.FC = () => {
  const { supermarketItems, selectedPeriod, addSupermarketItem, updateSupermarketItem, deleteSupermarketItem, addTransaction, transactions, deleteTransaction } = useFinance();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteBlockConfirmDate, setDeleteBlockConfirmDate] = useState<string | null>(null);
  const [editBlockDate, setEditBlockDate] = useState<string | null>(null);
  const [newBlockDate, setNewBlockDate] = useState<string>('');

  const [newItem, setNewItem] = useState<Partial<SupermarketItem>>({
    name: '',
    category: '',
    quantity: 1,
    unitPrice: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const filterByPeriod = (item: SupermarketItem) => {
    if (selectedPeriod === 'all') return true;
    
    const [year, part] = selectedPeriod.split('-');
    const itemYear = item.date.substring(0, 4);
    const itemMonth = parseInt(item.date.substring(5, 7), 10);
    
    if (itemYear !== year) return false;
    
    if (part.startsWith('Q')) {
      const quarter = parseInt(part.substring(1), 10);
      return Math.ceil(itemMonth / 3) === quarter;
    } else if (part.startsWith('S')) {
      const semester = parseInt(part.substring(1), 10);
      return Math.ceil(itemMonth / 6) === semester;
    } else {
      return item.date.substring(5, 7) === part;
    }
  };

  const filteredItems = supermarketItems.filter(filterByPeriod).sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime();
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime();
    return dateB - dateA;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = [];
    }
    acc[item.date].push(item);
    return acc;
  }, {} as Record<string, SupermarketItem[]>);

  const sortedDates = Object.keys(groupedItems).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const totalQuantity = Math.round(filteredItems.reduce((sum, item) => sum + item.quantity, 0));
  const totalAmount = filteredItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const categoryTotals = filteredItems.reduce((acc, item) => {
    const total = item.quantity * item.unitPrice;
    if (!acc[item.category]) {
      acc[item.category] = 0;
    }
    acc[item.category] += total;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value: value as number
  })).sort((a, b) => b.value - a.value);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.name && newItem.category && newItem.quantity !== undefined && !isNaN(newItem.quantity) && newItem.unitPrice !== undefined && !isNaN(newItem.unitPrice) && newItem.date) {
      if (editingId) {
        await updateSupermarketItem(editingId, {
          name: newItem.name,
          category: newItem.category,
          quantity: Number(newItem.quantity),
          unitPrice: Number(newItem.unitPrice),
          date: newItem.date
        });
        setSuccessMessage('Item atualizado com sucesso!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        await addSupermarketItem({
          name: newItem.name,
          category: newItem.category,
          quantity: Number(newItem.quantity),
          unitPrice: Number(newItem.unitPrice),
          date: newItem.date
        });
        
        // Add transaction for the manually added item
        await addTransaction({
          date: newItem.date,
          amount: Number(newItem.quantity) * Number(newItem.unitPrice),
          description: 'Mercado',
          category: 'Mercado',
          type: 'expense'
        });
      }
      resetForm();
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setNewItem({
      name: '',
      category: '',
      quantity: 1,
      unitPrice: 0,
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleEdit = (item: SupermarketItem) => {
    setNewItem(item);
    setEditingId(item.id);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      await deleteSupermarketItem(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleDeleteBlock = (date: string) => {
    setDeleteBlockConfirmDate(date);
  };

  const confirmDeleteBlock = async () => {
    if (deleteBlockConfirmDate) {
      const itemsToDelete = supermarketItems.filter(item => item.date === deleteBlockConfirmDate);
      for (const item of itemsToDelete) {
        await deleteSupermarketItem(item.id);
      }
      
      const txToDelete = transactions.filter(tx => 
        tx.date === deleteBlockConfirmDate && 
        tx.category === 'Mercado' && 
        tx.description === 'Mercado'
      );
      for (const tx of txToDelete) {
        await deleteTransaction(tx.id);
      }
      
      setDeleteBlockConfirmDate(null);
    }
  };

  const handleEditBlock = (date: string) => {
    setEditBlockDate(date);
    setNewBlockDate(date);
  };

  const confirmEditBlock = async () => {
    if (editBlockDate && newBlockDate) {
      const itemsToUpdate = supermarketItems.filter(item => item.date === editBlockDate);
      for (const item of itemsToUpdate) {
        await updateSupermarketItem(item.id, { date: newBlockDate });
      }
      setEditBlockDate(null);
      setNewBlockDate('');
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
        executeSupermarketOCR(fileToProcess, keyToSave);
      }
    }
  };

  const executeSupermarketOCR = async (file: File, apiKey: string) => {
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = (reader.result as string).split(',')[1];
          const ai = new GoogleGenAI({ apiKey: apiKey });
          const modelsToTry = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];
          let response: any = null;
          let lastError: any = null;

          for (const modelName of modelsToTry) {
            try {
              response = await ai.models.generateContent({
                model: modelName,
                contents: [
                  {
                    inlineData: {
                      data: base64String,
                      mimeType: file.type || 'image/jpeg'
                    },
                  },
                  {
                    text: `Analise esta nota fiscal de supermercado e extraia os itens comprados.
                    Retorne APENAS um JSON com o seguinte formato, sem formatação markdown ou texto adicional:
                    {
                      "items": [
                        {
                          "name": "Nome do item",
                          "category": "Categoria (ex: lanche, cb, Proteína, Higiene, Limpeza, Bebida, Besteira)",
                          "quantity": 1,
                          "unitPrice": 10.50
                        }
                      ]
                    }
                    Regras:
                    1. Se for um item pesado (ex: 0,632 kg), defina quantity como 1 e unitPrice como o valor TOTAL pago pelo item.`
                  },
                ],
              });
              if (response && response.text) break;
            } catch (modelErr: any) {
              lastError = modelErr;
              console.warn(`Modelo ${modelName} indisponível ou falhou, tentando modelo alternativo...`);
              continue;
            }
          }

          if (!response && lastError) {
            throw lastError;
          }

          const text = response?.text || '{}';
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            const items = data.items || [];
            const date = new Date().toISOString().split('T')[0];
            
            let totalAmount = 0;
            for (const item of items) {
              let qty = Number(item.quantity) || 1;
              let price = Number(item.unitPrice) || 0;
              
              if (qty % 1 !== 0) {
                price = qty * price;
                qty = 1;
              }

              totalAmount += qty * price;
              
              await addSupermarketItem({
                name: item.name,
                category: item.category || 'Outros',
                quantity: qty,
                unitPrice: price,
                date: date
              });
            }
            
            if (totalAmount > 0) {
              await addTransaction({
                date: date,
                amount: totalAmount,
                description: 'Mercado',
                category: 'Mercado',
                type: 'expense'
              });
            }
            
            setAlertMessage('Itens adicionados com sucesso!');
          } else {
            setAlertMessage('Não foi possível extrair itens da nota.');
          }
        } catch (error: any) {
          console.error("Supermarket OCR error:", error);
          const errMsg = error?.message || String(error);
          if (errMsg.includes('RESOURCE_EXHAUSTED') || error?.status === 429) {
            localStorage.removeItem('organizae_gemini_api_key');
            setCustomApiKeyInput('');
            setShowApiKeyModal(true);
            setAlertMessage('A sua chave API atingiu o limite de cota gratuita do Google (limit: 0). Por favor, gere uma nova chave gratuita no Google AI Studio e informe abaixo.');
          } else if (errMsg.includes('API_KEY_SERVICE_BLOCKED') || errMsg.includes('PERMISSION_DENIED') || error?.status === 403) {
            localStorage.removeItem('organizae_gemini_api_key');
            setCustomApiKeyInput('');
            setShowApiKeyModal(true);
            setAlertMessage('A chave API do Gemini informada está bloqueada ou sem permissão para o serviço Generative Language API. Por favor, crie uma nova chave gratuita no Google AI Studio e informe abaixo.');
          } else if (errMsg.includes('API key') || error?.status === 400) {
            localStorage.removeItem('organizae_gemini_api_key');
            setCustomApiKeyInput('');
            setShowApiKeyModal(true);
            setAlertMessage('Chave API inválida. Por favor, insira uma nova chave válida.');
          } else {
            setAlertMessage(`Erro ao analisar nota fiscal: ${errMsg}`);
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

    await executeSupermarketOCR(file, apiKey);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Mercado</h2>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          <input 
            type="file" 
            accept="image/*,.pdf" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="flex items-center justify-center space-x-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 w-full sm:w-auto"
          >
            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            <span>Ler Nota Fiscal</span>
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
            <span>{showAddForm && !editingId ? 'Cancelar' : 'Novo Item'}</span>
          </button>
        </div>
      </div>

      <div className="bg-amber-400 dark:bg-amber-500 text-slate-900 rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center font-semibold text-lg shadow-sm gap-4">
        <div className="w-full md:w-auto">
          {selectedPeriod === 'all' ? 'Todo o período' : selectedPeriod}
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-8 w-full md:w-auto">
          <div className="flex justify-between sm:block">
            <span className="font-normal mr-2">Quantidade</span>
            <span>{totalQuantity}</span>
          </div>
          <div className="flex justify-between sm:block">
            <span className="font-normal mr-2">Total</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2 animate-in fade-in slide-in-from-top-4">
          <span>{successMessage}</span>
        </div>
      )}

      {showAddForm && !editingId && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-8 relative">
          <button onClick={resetForm} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
          <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">Adicionar Item</h3>
          <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
              <input 
                type="date" 
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2"
                value={newItem.date}
                onChange={e => setNewItem({...newItem, date: e.target.value})}
                required
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Item</label>
              <input 
                type="text" 
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2"
                value={newItem.name}
                onChange={e => setNewItem({...newItem, name: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
              <input 
                type="text" 
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2"
                value={newItem.category}
                onChange={e => setNewItem({...newItem, category: e.target.value})}
                placeholder="Ex: lanche, cb, Proteína"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantidade</label>
              <input 
                type="number" 
                min="1"
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2"
                value={newItem.quantity || ''}
                onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value, 10) || 1})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Preço Unitário</label>
              <input 
                type="number" 
                step="0.01"
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2"
                value={newItem.unitPrice || ''}
                onChange={e => setNewItem({...newItem, unitPrice: parseFloat(e.target.value) || 0})}
                required
              />
            </div>
            <div className="lg:col-span-6 flex justify-end mt-4">
              <button type="submit" className="bg-slate-900 dark:bg-slate-700 text-white px-6 py-2 rounded-md hover:bg-slate-800 dark:hover:bg-slate-600 w-full sm:w-auto">
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-xl max-w-2xl w-full relative border border-slate-200 dark:border-slate-800">
            <button onClick={resetForm} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Editar Item</h3>
            <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
                <input 
                  type="date" 
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2"
                  value={newItem.date}
                  onChange={e => setNewItem({...newItem, date: e.target.value})}
                  required
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Item</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2"
                  value={newItem.name}
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2"
                  value={newItem.category}
                  onChange={e => setNewItem({...newItem, category: e.target.value})}
                  placeholder="Ex: lanche, cb, Proteína"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantidade</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2"
                  value={newItem.quantity || ''}
                  onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value, 10) || 1})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Preço Unitário</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2"
                  value={newItem.unitPrice || ''}
                  onChange={e => setNewItem({...newItem, unitPrice: parseFloat(e.target.value) || 0})}
                  required
                />
              </div>
              <div className="lg:col-span-6 flex justify-end gap-3 mt-6">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
                  Atualizar Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-4 self-start">Distribuição</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-slate-400 flex-1 flex items-center justify-center">Nenhum dado para exibir</div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {sortedDates.map(date => {
            const items = groupedItems[date];
            const blockTotalQuantity = Math.round(items.reduce((sum, item) => sum + item.quantity, 0));
            const blockTotalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
            
            return (
              <div key={date} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Compra de {date.split('-').reverse().join('/')}</h3>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-sm text-slate-500 dark:text-slate-400 block">Total ({blockTotalQuantity} itens)</span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(blockTotalAmount)}</span>
                    </div>
                    <div className="flex space-x-2 border-l pl-4 border-slate-300 dark:border-slate-700">
                      <button onClick={() => handleEditBlock(date)} className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg transition-colors" title="Editar data do bloco">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => handleDeleteBlock(date)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-2 bg-red-50 dark:bg-red-950/40 rounded-lg transition-colors" title="Excluir bloco inteiro">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-[600px]">
                    <thead className="bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
                      <tr>
                        <th className="py-3 px-6 font-semibold">Item</th>
                        <th className="py-3 px-6 font-semibold">Categoria</th>
                        <th className="text-right py-3 px-6 font-semibold">Qtd</th>
                        <th className="text-right py-3 px-6 font-semibold">Preço Un.</th>
                        <th className="text-right py-3 px-6 font-semibold">Total</th>
                        <th className="text-right py-3 px-6 font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                          <td className="py-2 px-6 text-slate-800 dark:text-slate-200">{item.name}</td>
                          <td className="py-2 px-6 text-slate-600 dark:text-slate-400">{item.category}</td>
                          <td className="py-2 px-6 text-right text-slate-800 dark:text-slate-200">{item.quantity}</td>
                          <td className="py-2 px-6 text-right text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-2 px-6 text-right font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{formatCurrency(item.quantity * item.unitPrice)}</td>
                          <td className="py-2 px-6 text-right opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            <button onClick={() => handleEdit(item)} className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 mr-2 p-1">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          
          {sortedDates.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
              Nenhum item encontrado para este período.
            </div>
          )}
          
          {sortedDates.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex justify-between items-center">
              <span className="text-lg font-bold text-slate-600 dark:text-slate-300">Total Geral do Período</span>
              <div className="text-right">
                <span className="text-sm text-slate-500 dark:text-slate-400 block">{totalQuantity} itens</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

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

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-xl max-w-sm w-full border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Confirmar Exclusão</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">Tem certeza que deseja excluir este item?</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)} 
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete} 
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Delete Confirmation Modal */}
      {deleteBlockConfirmDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-xl max-w-sm w-full border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Excluir Bloco de Compra</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">Tem certeza que deseja excluir TODOS os itens da compra do dia {deleteBlockConfirmDate.split('-').reverse().join('/')}?</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteBlockConfirmDate(null)} 
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteBlock} 
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Excluir Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Edit Modal */}
      {editBlockDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-xl max-w-sm w-full border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Editar Data da Compra</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">Alterar a data de todos os itens deste bloco.</p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nova Data</label>
              <input 
                type="date" 
                value={newBlockDate}
                onChange={(e) => setNewBlockDate(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setEditBlockDate(null)} 
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmEditBlock} 
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                disabled={!newBlockDate}
              >
                Salvar
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
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Lendo Nota Fiscal</h3>
            <p className="text-slate-600 dark:text-slate-300 text-center">Por favor, aguarde enquanto a inteligência artificial extrai os itens da sua nota fiscal...</p>
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
              Para ler notas fiscais de mercado com IA, insira sua chave da API do Google Gemini. Você pode gerar uma gratuitamente no{' '}
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
