import { useEffect, useState } from 'react';
import {
  listarEstoque,
  movimentarEstoque,
  listarHistoricoEstoque,
} from '../../services/stockService';
import './Estoque.css';

const Estoque = () => {
  const [produtos, setProdutos] = useState([]);
  const [erro, setErro] = useState('');
  const [movimentos, setMovimentos] = useState({});
  const [historico, setHistorico] = useState([]);

  const carregarEstoque = async () => {
    try {
      const data = await listarEstoque();
      setProdutos(data);
      setErro('');
    } catch (error) {
      setErro(error.message);
    }
  };
  const carregarHistorico = async () => {
    try {
      const data = await listarHistoricoEstoque();
      setHistorico(data);
    } catch (error) {
      setErro(error.message);
    }
  };
  useEffect(() => {
    let ignorarResposta = false;

    listarEstoque()
      .then((data) => {
        if (!ignorarResposta) {
          setProdutos(data);
          setErro('');
        }
      })
      .catch((error) => {
        if (!ignorarResposta) {
          setErro(error.message);
        }
      });

    listarHistoricoEstoque()
      .then((data) => {
        if (!ignorarResposta) {
          setHistorico(data);
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

  const handleMovimentoChange = (id, valor) => {
    setMovimentos({
      ...movimentos,
      [id]: valor,
    });
  };

  const handleMovimentarEstoque = async (produto, tipoMovimento) => {
    const quantidadeMovimento = Number(movimentos[produto.id] || 0);

    if (quantidadeMovimento <= 0) {
      alert('Informe uma quantidade maior que zero.');
      return;
    }

    try {
      await movimentarEstoque({
        produto_id: produto.id,
        tipo: tipoMovimento,
        quantidade: quantidadeMovimento,
        motivo:
          tipoMovimento === 'entrada'
            ? 'Entrada manual pelo sistema'
            : 'Saída manual pelo sistema',
      });

      setMovimentos({
        ...movimentos,
        [produto.id]: '',
      });

      await carregarEstoque();
      await carregarHistorico();

      alert(
        tipoMovimento === 'entrada'
          ? 'Entrada registrada com sucesso.'
          : 'Saída registrada com sucesso.'
      );
    } catch (error) {
      setErro(error.message);
    }
  };

  return (
    <div className="estoquePage">
      <header className="estoqueHeader">
        <h1>Estoque</h1>
        <p>Registre entradas e saídas de produtos.</p>
      </header>

      {erro && <p className="estoqueError">{erro}</p>}

      <section className="estoqueSection">
        <h2>Produtos em estoque</h2>

        {produtos.length === 0 ? (
          <p>Nenhum produto cadastrado.</p>
        ) : (
          <table className="estoqueTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>Produto</th>
                <th>Custo</th>
                <th>Quantidade atual</th>
                <th>Unidade</th>
                <th>Quantidade movimento</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {produtos.map((produto) => (
                <tr key={produto.id}>
                  <td>{produto.id}</td>
                  <td>{produto.nome}</td>
                  <td>R$ {produto.custo}</td>
                  <td>{produto.quantidade_estoque}</td>
                  <td>{produto.unidade}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={movimentos[produto.id] || ''}
                      onChange={(event) =>
                        handleMovimentoChange(produto.id, event.target.value)
                      }
                      placeholder="Qtd"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btnEntradaEstoque"
                      onClick={() =>
                        handleMovimentarEstoque(produto, 'entrada')
                      }
                    >
                      Entrada
                    </button>

                    <button
                      type="button"
                      className="btnSaidaEstoque"
                      onClick={() => handleMovimentarEstoque(produto, 'saida')}
                    >
                      Saída
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="estoqueSection historicoSection">
        <h2>Histórico de movimentações</h2>

        {historico.length === 0 ? (
          <p>Nenhuma movimentação registrada.</p>
        ) : (
          <table className="estoqueTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Anterior</th>
                <th>Nova</th>
                <th>Motivo</th>
                <th>Data</th>
              </tr>
            </thead>

            <tbody>
              {historico.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.produto_nome}</td>
                  <td>{item.tipo}</td>
                  <td>{item.quantidade}</td>
                  <td>{item.quantidade_anterior}</td>
                  <td>{item.quantidade_nova}</td>
                  <td>{item.motivo}</td>
                  <td>{new Date(item.criado_em).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default Estoque;
