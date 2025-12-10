import React, { useState } from 'react';
import { Lock, User, Key, Info } from 'lucide-react';
import { Button } from './ui/Button';

interface AdminLoginProps {
  onLogin: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'passroot') {
      onLogin();
    } else {
      setError('Credenciais inválidas. Tente novamente.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in-up">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 max-w-md w-full">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4 text-indigo-600">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Acesso Administrativo</h2>
          <p className="text-slate-500 text-sm mt-1 text-center">
            Esta área é restrita para gerenciamento de configurações e banco de dados.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6 text-sm text-blue-800 flex items-start gap-2">
           <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
           <div>
             <strong>Credenciais Padrão:</strong><br/>
             Usuário: <code className="bg-blue-100 px-1 rounded">admin</code><br/>
             Senha: <code className="bg-blue-100 px-1 rounded">passroot</code>
           </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuário</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                placeholder="Digite seu usuário"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                placeholder="Digite sua senha"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100 text-center">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full justify-center mt-2">
            Entrar no Painel
          </Button>
        </form>
      </div>
    </div>
  );
};