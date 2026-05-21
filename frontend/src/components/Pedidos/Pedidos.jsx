import { useEffect, useState } from 'react';
import { listarPedidos, atualizarStatusPedido } from '../../services/orderService';
import './Pedidos.css';

const Pedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [erro, setErro] = useState('');

  const carregarPedidos = async () => {
    try {
      const data = await listarPedidos();
      setPedidos(data);
      setErro('');
    } catch (error) {
      setErro(error.message);
    }
  };

  useEffect(() => {
    let ignorarResposta = false;

    listarPedidos()
      .then((data) => {
        if (!ignorarResposta) {
          setPedidos(data);
          setErro('');
        }
      })
      .catch((error) => {
        if (!ignorarResposta) {
          setErro(error.message);
        }
      });

    return () => {
      ignorarResposta = true;
    };
  }, []);

  const handleAtualizarStatus = async (pedido, novoStatus) => {
    try {
      await atualizarStatusPedido(pedido.id, novoStatus);
      await carregarPedidos();
    } catch (error) {
      setErro(error.message);
    }
  };

  return (
    <div className="pedidosPage">
      <header className="pedidosHeader">
        <h1>Pedidos</h1>
        <p>Acompanhe os pedidos gerados pelo caixa.</p>
      </header>

      {erro && <p className="pedidosError">{erro}</p>}

      <section className="pedidosSection">
        <h2>Pedidos registrados</h2>

        {pedidos.length === 0 ? (
          <p>Nenhum pedido cadastrado.</p>
        ) : (
          <table className="pedidosTable">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Itens</th>
                <th>Status</th>
                <th>Total</th>
                <th>Pagamento</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {pedidos.map((pedido) => (
                <tr key={pedido.id}>
                  <td>{pedido.numero}</td>
                  <td>{pedido.cliente_nome}</td>
                  <td>
                    {(pedido.itens || [])
                      .map(
                        (item) =>
                          `${Number(item.quantidade).toLocaleString('pt-BR')}x ${item.item_nome}`
                      )
                      .join(', ') || '-'}
                  </td>
                  <td>
                    <span
                      className={`statusBadge ${
                        pedido.status === 'novo'
                          ? 'statusNovo'
                          : pedido.status === 'em_preparo'
                            ? 'statusEmPreparo'
                            : pedido.status === 'pronto'
                              ? 'statusPronto'
                              : pedido.status === 'entregue'
                                ? 'statusEntregue'
                                : 'statusCancelado'
                      }`}
                    >
                      {pedido.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>R$ {pedido.total}</td>
                  <td>{pedido.forma_pagamento || '-'}</td>
                  <td>{new Date(pedido.criado_em).toLocaleString('pt-BR')}</td>
                  <td>
                    <select
                      className="statusSelect"
                      value={pedido.status}
                      onChange={(event) =>
                        handleAtualizarStatus(pedido, event.target.value)
                      }
                    >
                      <option value="novo">Novo</option>
                      <option value="em_preparo">Em preparo</option>
                      <option value="pronto">Pronto</option>
                      <option value="entregue">Entregue</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
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

export default Pedidos;
