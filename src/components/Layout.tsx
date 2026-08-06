import React, { useState } from 'react';
import { LayoutDashboard, Receipt, ShoppingCart, LogOut, LogIn, Menu, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, login, logout, selectedPeriod, setSelectedPeriod } = useFinance();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center z-50 relative shadow-md">
        <h1 className="text-xl font-bold tracking-tight">OrganizAE</h1>
        <button onClick={toggleMobileMenu} className="text-white focus:outline-none p-1 rounded-md hover:bg-slate-800 transition-colors">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={toggleMobileMenu} />
      )}

      {/* Sidebar */}
      <aside className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 fixed md:relative w-64 bg-slate-900 text-slate-300 flex-col z-50 h-full top-0 left-0 shadow-2xl md:shadow-none flex`}>
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">OrganizAE</h1>
          <button onClick={toggleMobileMenu} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        {user ? (
          <div className="flex flex-col h-full">
            <div className="px-6 mb-6 mt-4 md:mt-0">
              <div className="text-sm text-slate-400 mb-1">Período</div>
              <select 
                className="w-full bg-slate-800 text-white border-none rounded p-2 text-sm"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="all">Todo o período</option>
                <option value="2026-Q1">1º Trimestre 2026</option>
                <option value="2026-Q2">2º Trimestre 2026</option>
                <option value="2026-Q3">3º Trimestre 2026</option>
                <option value="2026-Q4">4º Trimestre 2026</option>
                <option value="2026-S1">1º Semestre 2026</option>
                <option value="2026-S2">2º Semestre 2026</option>
                <option value="2026-01">Janeiro 2026</option>
                <option value="2026-02">Fevereiro 2026</option>
                <option value="2026-03">Março 2026</option>
                <option value="2026-04">Abril 2026</option>
                <option value="2026-05">Maio 2026</option>
                <option value="2026-06">Junho 2026</option>
                <option value="2026-07">Julho 2026</option>
                <option value="2026-08">Agosto 2026</option>
                <option value="2026-09">Setembro 2026</option>
                <option value="2026-10">Outubro 2026</option>
                <option value="2026-11">Novembro 2026</option>
                <option value="2026-12">Dezembro 2026</option>
              </select>
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
            <div className="h-full flex flex-col items-center justify-center text-slate-500 mt-32">
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
