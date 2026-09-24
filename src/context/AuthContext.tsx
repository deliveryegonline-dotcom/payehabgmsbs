import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from '../lib/firebaseClient.ts';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  role: 'admin' | 'merchant' | 'guest';
  merchantId: string;
  merchantName: string;
  merchantEmail: string;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const ADMIN_EMAILS = [
  'deliveryegonline@gmail.com',
  'ehabgm200@gmail.com',
];

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  role: 'guest',
  merchantId: 'm_ehabgm_001',
  merchantName: 'متجر إيهاب الرئيسي (تجريبي)',
  merchantEmail: 'deliveryegonline@gmail.com',
  authError: null,
  signInWithGoogle: async () => {},
  logout: async () => {},
  clearError: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email
    ? ADMIN_EMAILS.some((adm) => adm.toLowerCase() === user.email?.toLowerCase())
    : false;

  const role: 'admin' | 'merchant' | 'guest' = user
    ? isAdmin
      ? 'admin'
      : 'merchant'
    : 'guest';

  // Scoped merchant ID based on authenticated email/uid
  let merchantId = 'm_ehabgm_001';
  let merchantName = 'متجر إيهاب الرئيسي';
  let merchantEmail = 'deliveryegonline@gmail.com';

  if (user) {
    merchantEmail = user.email || 'user@ehabgm.eg';
    merchantName = user.displayName || user.email?.split('@')[0] || 'حساب التاجر';
    
    if (user.email?.toLowerCase() === 'deliveryegonline@gmail.com') {
      merchantId = 'm_ehabgm_001';
      merchantName = 'متجر إيهاب الرئيسي (المدير العام)';
    } else if (user.email?.toLowerCase() === 'ehabgm200@gmail.com') {
      merchantId = 'm_admin_root';
      merchantName = 'حساب الإدارة والرقابة المركزية';
    } else {
      merchantId = `m_${user.uid.slice(0, 8)}`;
    }
  }

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error('Google Sign In Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل الدخول بحساب Google';
      if (errorMessage.includes('popup-closed-by-user')) {
        setAuthError('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.');
      } else {
        setAuthError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setAuthError(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        role,
        merchantId,
        merchantName,
        merchantEmail,
        authError,
        signInWithGoogle,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
