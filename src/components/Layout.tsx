import React, { useState, useMemo } from 'react';
import { LayoutDashboard, Receipt, ShoppingCart, LogOut, LogIn, Menu, X, Sun, Moon } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, login, logout, isDarkMode, toggleDarkMode, selectedPeriod, setSelectedPeriod } = useFinance();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Extract initial year from selectedPeriod or default to current year
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (selectedPeriod && selectedPeriod !== 'all') {
      const yearPart = parseInt(selectedPeriod.split('-')[0], 10);
      if (!isNaN(yearPart)) return yearPart;
    }
    return currentYear;
  });

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // Generate predefined period options specifically for the selected year
  const periodOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: 'all', label: 'Todo o período' },
      { value: `${selectedYear}`, label: `Ano completo (${selectedYear})` }
    ];

    // Months
    MONTH_NAMES.forEach((mName, idx) => {
      const mStr = String(idx + 1).padStart(2, '0');
      opts.push({
        value: `${selectedYear}-${mStr}`,
        label: `${mName} ${selectedYear}`
      });
    });

    // Quarters
    [1, 2, 3, 4].forEach(q => {
      opts.push({
        value: `${selectedYear}-Q${q}`,
        label: `${q}º Trimestre ${selectedYear}`
      });
    });

    // Semesters
    [1, 2].forEach(s => {
      opts.push({
        value: `${selectedYear}-S${s}`,
        label: `${s}º Semestre ${selectedYear}`
      });
    });

    return opts;
  }, [selectedYear]);

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    // Maintain current month/quarter format with the new year if active
    if (selectedPeriod !== 'all') {
      const parts = selectedPeriod.split('-');
      if (parts.length > 1) {
        setSelectedPeriod(`${newYear}-${parts[1]}`);
      } else {
        setSelectedPeriod(`${newYear}`);
      }
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex-col md:flex-row transition-colors duration-200">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center z-50 relative shadow-md">
        <h1 className="text-xl font-bold tracking-tight">OrganizAE</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Alternar Modo Escuro"
          >
            {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
          </button>
          <button onClick={toggleMobileMenu} className="text-white focus:outline-none p-1 rounded-md hover:bg-slate-800 transition-colors">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={toggleMobileMenu} />
      )}

      {/* Sidebar */}
      <aside className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 fixed md:relative w-64 bg-slate-900 text-slate-300 flex-col z-50 h-full top-0 left-0 shadow-2xl md:shadow-none flex`}>
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">OrganizAE</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Alternar Modo Escuro"
            >
              {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
            </button>
            <button onClick={toggleMobileMenu} className="md:hidden text-slate-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>
        
        {user ? (
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="px-6 mb-6 mt-4 md:mt-0 space-y-3">
              <div>
                <div className="text-xs text-slate-400 mb-1 font-medium">Ano</div>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={selectedYear}
                  onChange={(e) => handleYearChange(parseInt(e.target.value, 10) || currentYear)}
                  className="w-full bg-slate-800 text-white border border-slate-700 rounded p-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1 font-medium">Período</div>
                <select 
                  className="w-full bg-slate-800 text-white border border-slate-700 rounded p-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  {periodOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <nav className="flex-1 px-4 space-y-2">
              <button
                onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'dashboard' ? 'bg-orange-600 text-white' : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <LayoutDashboard size={20} />
                <span className="font-medium">Dashboard</span>
              </button>
              <button
                onClick={() => { setActiveTab('transactions'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'transactions' ? 'bg-orange-600 text-white' : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Receipt size={20} />
                <span className="font-medium">Transações</span>
              </button>
              <button
                onClick={() => { setActiveTab('supermarket'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'supermarket' ? 'bg-orange-600 text-white' : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ShoppingCart size={20} />
                <span className="font-medium">Mercado</span>
              </button>
            </nav>
            
            <div className="p-4 border-t border-slate-800 mt-auto">
              <div className="flex items-center space-x-3 mb-4 px-2">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} alt="Avatar" className="w-8 h-8 rounded-full" />
                <div className="text-sm truncate">{user.displayName || user.email}</div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <LogOut size={18} />
                <span>Sair</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <button
              onClick={login}
              className="w-full flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg transition-colors"
            >
              <LogIn size={20} />
              <span className="font-medium">Entrar com Google</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative z-0">
        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
          {user ? children : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 mt-32">
              <LayoutDashboard size={64} className="mb-4 opacity-20" />
              <h2 className="text-2xl font-semibold mb-2">Bem-vindo ao OrganizAE</h2>
              <p>Faça login para gerenciar suas finanças.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

