import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Writing } from './components/Writing';
import { History } from './components/History';
import { Exercises } from './components/Exercises';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminThemes } from './components/AdminThemes';
import { AdminExercises } from './components/AdminExercises';
import { AdminMaterials } from './components/AdminMaterials';
import { StudyPlan } from './components/StudyPlan';
import { Reinforcement } from './components/Reinforcement';
import { User } from './types';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('redup_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setCurrentPage(parsedUser.role === 'admin' ? 'admin-dashboard' : 'dashboard');
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('redup_user', JSON.stringify(userData));
    setCurrentPage(userData.role === 'admin' ? 'admin-dashboard' : 'dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('redup_user');
    setCurrentPage('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  if (user.role === 'student' && user.status === 'pending') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-zinc-100 shadow-xl text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Cadastro em Análise</h1>
          <p className="text-zinc-500 mb-8">
            Olá, {user.name}! Seu cadastro foi recebido e está aguardando a aprovação de um administrador. 
            Você receberá acesso assim que seu perfil for validado.
          </p>
          <button 
            onClick={handleLogout}
            className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  if (user.role === 'student' && user.status === 'denied') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-zinc-100 shadow-xl text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Acesso Negado</h1>
          <p className="text-zinc-500 mb-8">
            Infelizmente seu cadastro não foi aprovado pelos administradores. 
            Entre em contato com o suporte para mais informações.
          </p>
          <button 
            onClick={handleLogout}
            className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    // Admin Guard
    if (currentPage.startsWith('admin-') && (user.role !== 'admin' || user.admin_master !== 1)) {
      return <Dashboard user={user} onNavigate={setCurrentPage} />;
    }

    switch (currentPage) {
      // Student Pages
      case 'dashboard':
        return <Dashboard user={user} onNavigate={setCurrentPage} />;
      case 'writing':
        return <Writing user={user} onBack={() => setCurrentPage('dashboard')} onComplete={() => setCurrentPage('history')} />;
      case 'history':
        return <History user={user} />;
      case 'exercises':
        return <Exercises />;
      case 'study-plan':
        return <StudyPlan user={user} />;
      case 'reinforcement':
        return <Reinforcement user={user} />;
      case 'themes':
        return <AdminThemes />; // Students can also view themes
      
      // Admin Pages
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'admin-students':
        return <AdminDashboard />; // Reuse for now or create specific
      case 'admin-themes':
        return <AdminThemes />;
      case 'admin-exercises':
        return <AdminExercises />;
      case 'admin-materials':
        return <AdminMaterials />;
      
      default:
        return <Dashboard user={user} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      currentPage={currentPage} 
      setCurrentPage={setCurrentPage}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
