import { useState } from 'react';
import { NavLink } from 'react-router';
import './MainLayout.css';
import Logo from '../../imgs/Burger Flow.png';
import menuOpen from '../../assets/icon/arrow_forward.png';
import menuCloser from '../../assets/icon/arrow_back.png';
import cozinha from '../../assets/icon/cozinha.png';
import home from '../../assets/icon/home.png';
import estoque from '../../assets/icon/inventory.png';
import loginOut from '../../assets/icon/login_24dp.png';
import menu from '../../assets/icon/menu_24dp.png';
import pagamento from '../../assets/icon/payments.png';
import ordersIcon from '../../assets/icon/orders.svg';
import cardapioIcon from '../../assets/icon/menu-board.svg';
import gerencialIcon from '../../assets/icon/manager-shield.svg';

const MainLayout = ({ children, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const usuario = (() => {
    try {
      return JSON.parse(localStorage.getItem('usuario') || '{}');
    } catch {
      return {};
    }
  })();
  const podeVerGerencial = ['admin', 'gerente'].includes(
    String(usuario?.nivel_acesso || '').toLowerCase()
  );
  const menuItems = [
    { to: '/dashboard', label: 'Dashboard', icon: home },
    { to: '/pedidos', label: 'Pedidos', icon: ordersIcon },
    { to: '/cardapio', label: 'Cardápio', icon: cardapioIcon },
    { to: '/estoque', label: 'Estoque', icon: estoque },
    { to: '/caixa', label: 'Caixa', icon: pagamento },
    { to: '/cozinha', label: 'Cozinha', icon: cozinha },
    ...(podeVerGerencial
      ? [{ to: '/gerencial', label: 'Gerencial', icon: gerencialIcon }]
      : []),
  ];

  const toggleSidebar = () => {
    setIsCollapsed((current) => !current);
  };

  const closeSidebar = () => {
    setIsCollapsed(true);
  };

  return (
    <div className={`mainLayout ${isCollapsed ? 'sidebarCollapsed' : ''}`}>
      <button
        type="button"
        className="layoutScrim"
        aria-label="Fechar menu"
        onClick={closeSidebar}
      />

      <aside className="sidebar">
        <div className="sidebarTop">
          <div className="brandBlock">
            <img src={Logo} alt="Burger Flow" className="brandLogo" />
            <div className="brandText">
              <strong>Burger Flow 2.0</strong>
              <span>Operação</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebarToggle"
            aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!isCollapsed}
            onClick={toggleSidebar}
          >
            <img
              src={isCollapsed ? menuOpen : menuCloser}
              alt=""
              aria-hidden="true"
            />
          </button>
        </div>

        <nav className="sidebarNav" aria-label="Menu principal">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) =>
                `sidebarLink ${isActive ? 'active' : ''}`
              }
              onClick={closeSidebar}
            >
              <span className="sidebarIcon" aria-hidden="true">
                <img src={item.icon} alt="" />
              </span>
              <span className="sidebarLabel">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button type="button" className="logoutButton" onClick={onLogout}>
          <span className="sidebarIcon" aria-hidden="true">
            <img src={loginOut} alt="" />
          </span>
          <span className="logoutText">Sair</span>
        </button>
      </aside>

      <main className="mainContent">
        <div className="mobileTopbar">
          <button
            type="button"
            className="mobileMenuButton"
            aria-label="Abrir menu"
            onClick={toggleSidebar}
          >
            <img src={menu} alt="" aria-hidden="true" />
          </button>
          <strong>Burger Flow</strong>
        </div>

        <div className="contentShell">{children}</div>
      </main>
    </div>
  );
};

export default MainLayout;
