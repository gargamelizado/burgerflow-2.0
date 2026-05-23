import { useState } from 'react';
import { useNavigate } from 'react-router';
import { API_URL } from '../../config/api';
import './Login.css';
import Logo from '../../imgs/Burger Flow.png';
export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (email.trim() === '') {
      setError('Digite o email');
      return;
    }

    if (password.trim() === '') {
      setError('Digite a senha');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          senha: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Erro ao fazer login');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      localStorage.setItem('isLoggedIn', 'true');

      setError('');
      onLogin();
      navigate('/dashboard');
    } catch (error) {
      console.error('Login fetch error:', error);
      setError('Erro ao conectar com o servidor. Verifique se a API está rodando.');
    }
  };
  return (
    <>
      <div className="LoginPage">
        <div className="wrapperLoginPage">
          <img src={Logo} alt="Logo Burger Flow" className="logo" />
          <h1>Burger Flow</h1>
          <form className="loginform" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />{' '}
            {error && <p className="messagemError">{error}</p>}
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    </>
  );
}
