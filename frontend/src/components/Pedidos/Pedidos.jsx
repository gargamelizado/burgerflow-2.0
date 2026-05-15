import React, { useEffect, useState } from 'react';
import {
  listarPedidos,
  criarPedido,
  atualizarStatusPedido,
} from '../../services/orderService';
import './Pedidos.css'
const Pedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [erro, setErro] = useState('');

  const [form, setForm] = useState({
    cliente_nome: '',
    tipo: 'balcao',
    total: '',
    observacao: '',
  });

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
    carregarPedidos();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm({
      ...form,
      [name]: value,
    });
  };

  const limparFormulario = () => {
    setForm({
      cliente_nome: '',
      tipo: 'balcao',
      total: '',
      observacao: '',
    });
  };

  const handleCriarPedido = async (event) => {
    event.preventDefault();

    try {
      await criarPedido({
        cliente_nome: form.cliente_nome || 'Cliente',
        tipo: form.tipo,
        total: Number(form.total || 0),
        observacao: form.observacao,
      });

      limparFormulario();
      await carregarPedidos();

      alert('Pedido criado com sucesso.');
    } catch (error) {
      setErro(error.message);
    }
  };

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
      <p>Crie pedidos e acompanhe o status.</p>
    </header>

    {erro && <p className="pedidosError">{erro}</p>}

    <section className="pedidosSection">
      <h2>Novo pedido</h2>

      <form className="pedidosForm" onSubmit={handleCriarPedido}>
        <input
          type="text"
          name="cliente_nome"
          placeholder="Nome do cliente"
          value={form.cliente_nome}
          onChange={handleChange}
        />

        <select name="tipo" value={form.tipo} onChange={handleChange}>
          <option value="balcao">Balcão</option>
          <option value="mesa">Mesa</option>
          <option value="delivery">Delivery</option>
        </select>

        <input
          type="number"
          name="total"
          placeholder="Total do pedido"
          value={form.total}
          onChange={handleChange}
        />

        <input
          type="text"
          name="observacao"
          placeholder="Observação"
          value={form.observacao}
          onChange={handleChange}
        />

        <button type="submit" className="btnCriarPedido">
          Criar pedido
        </button>
      </form>
    </section>

    <section className="pedidosSection">
      <h2>Pedidos cadastrados</h2>

      {pedidos.length === 0 ? (
        <p>Nenhum pedido cadastrado.</p>
      ) : (
        <table className="pedidosTable">
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
                <td>{pedido.observacao}</td>
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