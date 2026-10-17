import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserPermissions } from '../types';
import { loadDatabase, saveDatabase } from '../services/storage';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (identifier: string, pass: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: keyof UserPermissions) => boolean;
  isAdmin: boolean;
  isCollector: boolean;
  switchUserSimulated: (userId: string) => void;
  usersList: User[];
  reloadUsers: () => void;
  updateMyPassword: (currentPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  adminSetUserPassword: (userEmail: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  verifyCurrentUserPassword: (pass: string) => boolean;
  getUserPassword: (userEmail: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_SESSION_KEY = 'cobrosapp_active_session_v2';
const AUTH_REMEMBER_KEY = 'cobrosapp_remember_session_v2';
const PASSWORDS_STORAGE_KEY = 'cobrosapp_user_passwords_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);

  const reloadUsers = () => {
    const db = loadDatabase();
    setUsersList(db.users);
    if (currentUser) {
      const refreshed = db.users.find(u => u.id === currentUser.id);
      if (refreshed) setCurrentUser(refreshed);
    }
  };

  useEffect(() => {
    const db = loadDatabase();
    setUsersList(db.users);

    // Initialize password storage if empty
    let passwords: Record<string, string> = {};
    try {
      passwords = JSON.parse(localStorage.getItem(PASSWORDS_STORAGE_KEY) || '{}');
    } catch {
      passwords = {};
    }

    if (!passwords['am0360136@gmail.com']) {
      passwords['am0360136@gmail.com'] = 'Admin2026*';
    }
    if (!passwords['carlos.cobrador@financieraaaron.com']) {
      passwords['carlos.cobrador@financieraaaron.com'] = 'Cobrador123*';
    }
    if (!passwords['luis.cobrador@financieraaaron.com']) {
      passwords['luis.cobrador@financieraaaron.com'] = 'Cobrador123*';
    }

    // Sync with any user entity password in db
    db.users.forEach(u => {
      const email = u.email.toLowerCase();
      if (u.password && !passwords[email]) {
        passwords[email] = u.password;
      }
    });

    localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(passwords));

    // Check active session in sessionStorage
    let sessionRestored = false;
    try {
      const savedSession = sessionStorage.getItem(AUTH_SESSION_KEY);
      if (savedSession) {
        const user = JSON.parse(savedSession) as User;
        const liveUser = db.users.find(u => u.id === user.id);
        if (liveUser && liveUser.active) {
          setCurrentUser(liveUser);
          sessionRestored = true;
        } else {
          sessionStorage.removeItem(AUTH_SESSION_KEY);
        }
      }
    } catch {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    }

    // If not in sessionStorage, check persistent 'Remember Me' token in localStorage
    if (!sessionRestored) {
      try {
        const rememberedStr = localStorage.getItem(AUTH_REMEMBER_KEY);
        if (rememberedStr) {
          const rememberData = JSON.parse(rememberedStr);
          const isExpired = rememberData.expiresAt && new Date(rememberData.expiresAt) <= new Date();
          if (!isExpired && rememberData.userId) {
            const liveUser = db.users.find(u => u.id === rememberData.userId);
            if (liveUser && liveUser.active) {
              setCurrentUser(liveUser);
              sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(liveUser));
              sessionRestored = true;
            } else {
              localStorage.removeItem(AUTH_REMEMBER_KEY);
            }
          } else {
            localStorage.removeItem(AUTH_REMEMBER_KEY);
          }
        }
      } catch {
        localStorage.removeItem(AUTH_REMEMBER_KEY);
      }
    }
  }, []);

  const login = async (
    identifier: string,
    pass: string,
    rememberMe = false
  ): Promise<{ success: boolean; error?: string }> => {
    const db = loadDatabase();
    const clean = identifier.trim();
    if (!clean || !pass) {
      return { success: false, error: 'Usuario o contraseña incorrectos' };
    }

    const lower = clean.toLowerCase();

    // 1. Search by username first (prioritize username)
    let user = db.users.find(u => {
      if (u.username && u.username.trim().toLowerCase() === lower) return true;
      if (u.name.trim().toLowerCase() === lower) return true;
      const prefix = u.email.split('@')[0].toLowerCase();
      if (prefix === lower) return true;
      return false;
    });

    // 2. If not found by username, search by email
    if (!user) {
      user = db.users.find(u => u.email.trim().toLowerCase() === lower);
    }

    // Generic error message: do not reveal if user exists or not
    if (!user) {
      return { success: false, error: 'Usuario o contraseña incorrectos' };
    }

    if (!user.active) {
      return { success: false, error: 'Esta cuenta ha sido desactivada por el administrador.' };
    }

    const passwords = JSON.parse(localStorage.getItem(PASSWORDS_STORAGE_KEY) || '{}');
    const storedPass = passwords[user.email.toLowerCase()] || user.password;

    // If no password set yet for an invited user, set this as their initial password
    if (!storedPass) {
      if (pass.length < 6) {
        return { success: false, error: 'Usuario o contraseña incorrectos' };
      }
      passwords[user.email.toLowerCase()] = pass;
      localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(passwords));
    } else if (storedPass !== pass) {
      // Generic error message
      return { success: false, error: 'Usuario o contraseña incorrectos' };
    }

    // Log in user
    setCurrentUser(user);
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));

    if (rememberMe) {
      const token = `tok_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const rememberData = {
        userId: user.id,
        token,
        rememberedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      localStorage.setItem(AUTH_REMEMBER_KEY, JSON.stringify(rememberData));
    } else {
      localStorage.removeItem(AUTH_REMEMBER_KEY);
    }

    // Update last login
    user.lastLoginAt = new Date().toISOString();
    saveDatabase(db);

    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_REMEMBER_KEY);
  };

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return !!currentUser.permissions[permission];
  };

  const switchUserSimulated = (userId: string) => {
    const db = loadDatabase();
    const target = db.users.find(u => u.id === userId);
    if (target) {
      setCurrentUser(target);
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(target));
    }
  };

  const verifyCurrentUserPassword = (pass: string): boolean => {
    if (!currentUser) return false;
    const cleanEmail = currentUser.email.trim().toLowerCase();
    const passwords = JSON.parse(localStorage.getItem(PASSWORDS_STORAGE_KEY) || '{}');
    const storedPass = passwords[cleanEmail] || currentUser.password;
    if (!storedPass) {
      // If none set yet, fallback default or min 6 chars
      return pass === 'Admin2026*' || pass.length >= 6;
    }
    return storedPass === pass;
  };

  const getUserPassword = (userEmail: string): string => {
    const cleanEmail = userEmail.trim().toLowerCase();
    const passwords = JSON.parse(localStorage.getItem(PASSWORDS_STORAGE_KEY) || '{}');
    if (passwords[cleanEmail]) return passwords[cleanEmail];
    const db = loadDatabase();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    return user?.password || '';
  };

  const updateMyPassword = async (
    currentPass: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'No hay una sesión activa.' };
    }

    if (!verifyCurrentUserPassword(currentPass)) {
      return { success: false, error: 'La contraseña actual ingresada es incorrecta.' };
    }

    if (newPass.length < 6) {
      return { success: false, error: 'La nueva contraseña debe tener un mínimo de 6 caracteres.' };
    }

    const cleanEmail = currentUser.email.trim().toLowerCase();
    const passwords = JSON.parse(localStorage.getItem(PASSWORDS_STORAGE_KEY) || '{}');
    passwords[cleanEmail] = newPass;
    localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(passwords));

    // Also update in db.users so it survives export/backup
    const db = loadDatabase();
    const targetUser = db.users.find(u => u.id === currentUser.id);
    if (targetUser) {
      targetUser.password = newPass;
      saveDatabase(db);
      setCurrentUser({ ...targetUser });
    }

    return { success: true };
  };

  const adminSetUserPassword = async (
    userEmail: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Solo el administrador puede asignar contraseñas a otros usuarios.' };
    }

    if (newPass.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    const cleanEmail = userEmail.trim().toLowerCase();
    const passwords = JSON.parse(localStorage.getItem(PASSWORDS_STORAGE_KEY) || '{}');
    passwords[cleanEmail] = newPass;
    localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(passwords));

    const db = loadDatabase();
    const targetUser = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (targetUser) {
      targetUser.password = newPass;
      saveDatabase(db);
      reloadUsers();
    }

    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        logout,
        hasPermission,
        isAdmin: currentUser?.role === 'admin',
        isCollector: currentUser?.role === 'collector',
        switchUserSimulated,
        usersList,
        reloadUsers,
        updateMyPassword,
        adminSetUserPassword,
        verifyCurrentUserPassword,
        getUserPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
