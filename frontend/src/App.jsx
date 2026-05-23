import { useState } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';

import Login from './components/Login/Login';
import Dashboard from './components/Dashboard/Dashboard';
import MainLayout from './components/Layout/MainLayout';

import Pedidos from './components/Pedidos/Pedidos';
import Cardapio from './components/Cardapio/Cardapio';
import Estoque from './components/Estoque/Estoque';
import Caixa from './components/Caixa/Caixa';
import Cozinha from './components/Cozinha/Cozinha';
import Gerencial from './components/Gerencial/Gerencial';
const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const logged = localStorage.getItem('isLoggedIn');
    return logged === 'true';
  });

  const handleLogin = () => {
    localStorage.setItem('isLoggedIn', 'true');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setIsLoggedIn(false);
  };

  const protectedPage = (component) => {
    return isLoggedIn ? (
      <MainLayout onLogout={handleLogout}>{component}</MainLayout>
    ) : (
      <Navigate to="/login" />
    );
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to="/dashboard" />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />

        <Route path="/dashboard" element={protectedPage(<Dashboard />)} />
        <Route path="/pedidos" element={protectedPage(<Pedidos />)} />
        <Route path="/cardapio" element={protectedPage(<Cardapio />)} />
        <Route path="/estoque" element={protectedPage(<Estoque />)} />
        <Route path="/caixa" element={protectedPage(<Caixa />)} />
        <Route path="/cozinha" element={protectedPage(<Cozinha />)} />
        <Route path="/gerencial" element={protectedPage(<Gerencial />)} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
