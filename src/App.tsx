import React, { useState } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { Supermarket } from './components/Supermarket';
import { ErrorBoundary } from './components/ErrorBoundary';

/**
 * Main application component for OrganizAE
 */
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <ErrorBoundary>
      <FinanceProvider>
        <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'transactions' && <Transactions />}
          {activeTab === 'supermarket' && <Supermarket />}
        </Layout>
      </FinanceProvider>
    </ErrorBoundary>
  );
}

