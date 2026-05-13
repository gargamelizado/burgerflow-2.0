import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <>
      <h1>Dashboard</h1>
      <p>Bem-vindo ao painel do Burger Flow.</p>

      <section className="cardsContainer">
        <div className="card">
          <h3>Pedidos de hoje</h3>
          <strong>0</strong>
        </div>

        <div className="card">
          <h3>Vendas de hoje</h3>
          <strong>R$ 0,00</strong>
        </div>

        <div className="card">
          <h3>Itens no cardápio</h3>
          <strong>0</strong>
        </div>
      </section>
    </>
  );
};

export default Dashboard;
