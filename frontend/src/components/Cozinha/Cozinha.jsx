import React, { useEffect, useState } from 'react';
import {
  listarPedidosCozinha,
  atualizarStatusPedidoCozinha,
} from '../../services/kitchenService';
import './Cozinha.css';
const Cozinha = () => {
  const [pedidos, setPedidos] = useState([]);
  const [erro, setErro] = useState('');

  const carregarPedidos = async () => {
    try {
      const data = await listarPedidosCozinha();
      setPedidos(data);
      setErro('');
    } catch (error) {
      setErro(error.message);
    }
  };

  useEffect(() => {
    carregarPedidos();
  }, []);

  const handleStatus = async (pedido, status) => {
    try {
      await atualizarStatusPedidoCozinha(pedido.id, status);
      await carregarPedidos();
    } catch (error) {
      setErro(error.message);
    }
  };

 return (
  <div className="cozinhaPage">
    <header className="cozinhaHeader">
      <h1>Cozinha</h1>
      <p>Acompanhe os pedidos em preparo.</p>
    </header>

    {erro && <p className="cozinhaError">{erro}</p>}

    <section className="cozinhaSection">
      <h2>Pedidos pendentes</h2>

      {pedidos.length === 0 ? (
        <p>Nenhum pedido pendente para cozinha.</p>
      ) : (
        <table className="cozinhaTable">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Total</th>
              <th>Observação</th>
              <th>Criado em</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {pedidos.map((pedido) => (
              <tr key={pedido.id}>
                <td>{pedido.numero}</td>
                <td>{pedido.cliente_nome}</td>
                <td>{pedido.tipo}</td>
                <td>
                  <span
                    className={`statusBadge ${
                      pedido.status === 'novo'
                        ? 'statusNovo'
                        : pedido.status === 'em_preparo'
                          ? 'statusEmPreparo'
                          : 'statusPronto'
                    }`}
                  >
                    {pedido.status.replace('_', ' ')}
                  </span>
                </td>
                <td>R$ {pedido.total}</td>
                <td>{pedido.observacao}</td>
                <td>{new Date(pedido.criado_em).toLocaleString('pt-BR')}</td>
                <td>
                  <button
                    type="button"
                    className="btnCozinha btnPreparo"
                    onClick={() => handleStatus(pedido, 'em_preparo')}
                  >
                    Em preparo
                  </button>

                  <button
                    type="button"
                    className="btnCozinha btnPronto"
                    onClick={() => handleStatus(pedido, 'pronto')}
                  >
                    Pronto
                  </button>

                  <button
                    type="button"
                    className="btnCozinha btnEntregue"
                    onClick={() => handleStatus(pedido, 'entregue')}
                  >
                    Entregue
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  </div>
);
};

export default Cozinha;

