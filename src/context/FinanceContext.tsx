import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, where, or } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  type: TransactionType;
  userId: string;
  groupId: string;
  monthYear: string;
  createdAt?: string;
}

export interface BudgetCategory {
  name: string;
  planned: number;
  type: TransactionType;
}

export interface Budget {
  id: string;
  monthYear: string;
  initialBalance: number;
  categories: BudgetCategory[];
  userId: string;
  groupId: string;
}

export interface SupermarketItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  date: string;
  userId: string;
  groupId: string;
  monthYear: string;
  createdAt?: string;
}

interface FinanceContextType {
  user: any;
  login: () => void;
  logout: () => void;
  
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;

  transactions: Transaction[];
  budgets: Budget[];
  supermarketItems: SupermarketItem[];
  
  addTransaction: (tx: Omit<Transaction, 'id' | 'userId' | 'groupId' | 'monthYear'>) => Promise<void>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  addSupermarketItem: (item: Omit<SupermarketItem, 'id' | 'userId' | 'groupId' | 'monthYear'>) => Promise<void>;
  updateSupermarketItem: (id: string, item: Partial<SupermarketItem>) => Promise<void>;
  deleteSupermarketItem: (id: string) => Promise<void>;
  
  addBudget: (budget: Omit<Budget, 'id' | 'userId' | 'groupId'>) => Promise<void>;
  updateBudget: (id: string, budget: Partial<Budget>) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('organizae_dark_mode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('organizae_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);
  
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [supermarketItems, setSupermarketItems] = useState<SupermarketItem[]>([]);

  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      console.error("Redirect login result error:", err);
    });
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login popup failed:", error);
      if (error?.code === 'auth/unauthorized-domain') {
        alert(`Domínio não autorizado no Firebase Console: ${window.location.hostname}\nAdicione este domínio em Firebase Console > Authentication > Settings > Authorized domains.`);
        return;
      }
      try {
        await signInWithRedirect(auth, provider);
      } catch (redirectErr) {
        console.error("Login redirect failed:", redirectErr);
        alert(`Erro ao fazer login: ${error?.message || String(error)}`);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const getGroupId = (email: string | null, uid: string) => {
    if (email === 'cassianomenezes1@gmail.com' || email === 'diovanamon@gmail.com') {
      return 'shared_cassiano_diovana';
    }
    return uid;
  };

  useEffect(() => {
    if (!isAuthReady || !user) {
      setTransactions([]);
      setBudgets([]);
      setSupermarketItems([]);
      return;
    }

    const groupId = getGroupId(user.email, user.uid);
    const isShared = groupId !== user.uid;

    const qTx = isShared 
      ? query(collection(db, 'transactions'), or(where('groupId', '==', groupId), where('userId', '==', user.uid)))
      : query(collection(db, 'transactions'), where('groupId', '==', groupId));

    const unsubTx = onSnapshot(qTx, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
    }, (error) => { handleFirestoreError(error, OperationType.LIST, 'transactions'); });

    const qBudget = isShared
      ? query(collection(db, 'budgets'), or(where('groupId', '==', groupId), where('userId', '==', user.uid)))
      : query(collection(db, 'budgets'), where('groupId', '==', groupId));

    const unsubBudget = onSnapshot(qBudget, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget));
      setBudgets(data);
    }, (error) => { handleFirestoreError(error, OperationType.LIST, 'budgets'); });

    const qItems = isShared
      ? query(collection(db, 'supermarketItems'), or(where('groupId', '==', groupId), where('userId', '==', user.uid)))
      : query(collection(db, 'supermarketItems'), where('groupId', '==', groupId));

    const unsubItems = onSnapshot(qItems, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupermarketItem));
      setSupermarketItems(data);
    }, (error) => { handleFirestoreError(error, OperationType.LIST, 'supermarketItems'); });

    return () => {
      unsubTx();
      unsubBudget();
      unsubItems();
    };
  }, [user, isAuthReady]);

  const getMonthYear = (dateString: string) => {
    if (!dateString) return new Date().toISOString().substring(0, 7);
    const parts = dateString.split('-');
    if (parts.length >= 2) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      return `${year}-${month}`;
    }
    return dateString.substring(0, 7);
  };

  const addTransaction = async (tx: Omit<Transaction, 'id' | 'userId' | 'groupId' | 'monthYear'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'transactions'), {
        ...tx,
        userId: user.uid,
        groupId: getGroupId(user.email, user.uid),
        monthYear: getMonthYear(tx.date),
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    }
  };

  const updateTransaction = async (id: string, tx: Partial<Transaction>) => {
    if (!user) return;
    try {
      const dataToUpdate = { ...tx };
      if (tx.date) {
        dataToUpdate.monthYear = getMonthYear(tx.date);
      }
      dataToUpdate.groupId = getGroupId(user.email, user.uid);
      await updateDoc(doc(db, 'transactions', id), dataToUpdate);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${id}`);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  const addSupermarketItem = async (item: Omit<SupermarketItem, 'id' | 'userId' | 'groupId' | 'monthYear'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'supermarketItems'), {
        ...item,
        userId: user.uid,
        groupId: getGroupId(user.email, user.uid),
        monthYear: getMonthYear(item.date),
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'supermarketItems');
    }
  };

  const updateSupermarketItem = async (id: string, item: Partial<SupermarketItem>) => {
    if (!user) return;
    try {
      const dataToUpdate = { ...item };
      if (item.date) {
        dataToUpdate.monthYear = getMonthYear(item.date);
      }
      dataToUpdate.groupId = getGroupId(user.email, user.uid);
      await updateDoc(doc(db, 'supermarketItems', id), dataToUpdate);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `supermarketItems/${id}`);
    }
  };

  const deleteSupermarketItem = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'supermarketItems', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `supermarketItems/${id}`);
    }
  };

  const addBudget = async (budget: Omit<Budget, 'id' | 'userId' | 'groupId'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'budgets'), {
        ...budget,
        userId: user.uid,
        groupId: getGroupId(user.email, user.uid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'budgets');
    }
  };

  const updateBudget = async (id: string, budget: Partial<Budget>) => {
    if (!user) return;
    try {
      const dataToUpdate = { ...budget };
      dataToUpdate.groupId = getGroupId(user.email, user.uid);
      await updateDoc(doc(db, 'budgets', id), dataToUpdate);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `budgets/${id}`);
    }
  };

  return (
    <FinanceContext.Provider value={{
      user,
      login,
      logout,
      isDarkMode,
      toggleDarkMode,
      selectedPeriod,
      setSelectedPeriod,
      transactions,
      budgets,
      supermarketItems,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addSupermarketItem,
      updateSupermarketItem,
      deleteSupermarketItem,
      addBudget,
      updateBudget
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
