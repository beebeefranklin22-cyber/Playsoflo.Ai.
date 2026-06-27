import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setIsLoadingAuth(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          await fetchUserProfile(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (authUser) => {
    try {
      setIsLoadingAuth(true);
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setUser({
        id: authUser.id,
        email: authUser.email,
        ...(profile || {}),
      });
      setIsAuthenticated(true);
    } catch (err) {
      setAuthError({ type: 'unknown', message: err.message });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async ({ email, password }) => {
    setIsLoadingAuth(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setIsLoadingAuth(false); throw error; }
    return data;
  };

  const register = async ({ email, password, full_name, username }) => {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name, username } },
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => { await supabase.auth.signOut(); };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await fetchUserProfile(session.user);
  };

  const navigateToLogin = () => { window.location.href = '/login'; };

  const updateProfile = async (updates) => {
    if (!user?.id) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    setUser((prev) => ({ ...prev, ...data }));
    return data;
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings,
      authError, login, register, logout, refreshUser,
      navigateToLogin, updateProfile, checkAppState: refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
