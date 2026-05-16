import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboardPage">
      <header className="dashboardHeader">
        <div>
          <h1>Dashboard</h1>
          <p>Bem-vindo ao painel do Burger Flow.</p>
        </div>
      </header>

      <section className="cardsContainer">
        <div className="card cardPedidos">
          <h3>Pedidos de hoje</h3>
          <strong>0</strong>
        </div>

        <div className="card cardVendas">
          <h3>Vendas de hoje</h3>
          <strong>R$ 0,00</strong>
        </div>

        <div className="card cardItens">
          <h3>Itens no cardápio</h3>
          <strong>0</strong>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
