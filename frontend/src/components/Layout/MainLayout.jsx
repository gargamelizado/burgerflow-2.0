import React from 'react';
import { Link } from 'react-router';
import './MainLayout.css';

const MainLayout = ({ children, onLogout }) => {
  return (
    <div className="mainLayout">
      <aside className="sidebar">
        <h2>Burger Flow</h2>

        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/pedidos">Pedidos</Link>
          <Link to="/cardapio">Cardápio</Link>
          <Link to="/estoque">Estoque</Link>
          <Link to="/caixa">Caixa</Link>
        </nav>

        <button onClick={onLogout}>Sair</button>
      </aside>

      <main className="mainContent">{children}</main>
    </div>
  );
};

export default MainLayout;
