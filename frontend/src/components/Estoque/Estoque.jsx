import { useEffect, useState } from 'react';
import {
  listarEstoque,
  movimentarEstoque,
  listarHistoricoEstoque,
} from '../../services/stockService';
import './Estoque.css';

const unidades = ['gr', 'kg', 'ml', 'li'];

const Estoque = () => {
  const [ingredientes, setIngredientes] = useState([]);
  const [erro, setErro] = useState('');
  const [movimentos, setMovimentos] = useState({});
  const [historico, setHistorico] = useState([]);
  const [popup, setPopup] = useState(null);

  const abrirPopup = ({
    tipo = 'info',
    titulo = 'Mensagem',
    mensagens = [],
  }) => {
    setPopup({
      tipo,
      titulo,
      mensagens: Array.isArray(mensagens) ? mensagens : [mensagens],
    });
  };

  const fecharPopup = () => {
    setPopup(null);
  };

  const carregarEstoque = async () => {
    try {
      const data = await listarEstoque();
      setIngredientes(data);
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
          setIngredientes(data);
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

  const atualizarMovimento = (id, campo, valor) => {
    setMovimentos((current) => ({
      ...current,
      [id]: {
        quantidade: current[id]?.quantidade || '',
        unidade: current[id]?.unidade || 'gr',
        ...current[id],
        [campo]: valor,
      },
    }));
  };

  const handleMovimentarEstoque = async (ingrediente, tipoMovimento) => {
    const movimento = movimentos[ingrediente.id] || {};
    const quantidadeMovimento = Number(movimento.quantidade || 0);

    if (quantidadeMovimento <= 0) {
      abrirPopup({
        tipo: 'erro',
        titulo: 'Quantidade inválida',
        mensagens: 'Informe uma quantidade maior que zero.',
      });
      return;
    }

    try {
      await movimentarEstoque({
        ingrediente_id: ingrediente.id,
        tipo: tipoMovimento,
        quantidade: quantidadeMovimento,
        unidade: movimento.unidade || ingrediente.unidade_base,
        motivo:
          tipoMovimento === 'entrada'
            ? 'Entrada manual pelo sistema'
            : tipoMovimento === 'saida'
              ? 'Saída manual pelo sistema'
              : 'Ajuste manual pelo sistema',
      });

      setMovimentos((current) => ({
        ...current,
        [ingrediente.id]: {
          quantidade: '',
          unidade: movimento.unidade || ingrediente.unidade_base,
        },
      }));

      await carregarEstoque();
      await carregarHistorico();
      abrirPopup({
        tipo: 'sucesso',
        titulo: 'Estoque atualizado',
        mensagens:
          tipoMovimento === 'entrada'
            ? 'Entrada registrada com sucesso.'
            : tipoMovimento === 'saida'
              ? 'Saída registrada com sucesso.'
              : 'Ajuste registrado com sucesso.',
      });
    } catch (error) {
      setErro(error.message);
      abrirPopup({
        tipo: 'erro',
        titulo: 'Erro no estoque',
        mensagens: error.message,
      });
    }
  };

  return (
    <div className="estoquePage">
      <header className="estoqueHeader">
        <h1>Estoque</h1>
        <p>Controle a quantidade base dos ingredientes.</p>
      </header>

      {erro && <p className="estoqueError">{erro}</p>}

      <section className="estoqueSection">
        <h2>Ingredientes em estoque</h2>

        {ingredientes.length === 0 ? (
          <p>Nenhum ingrediente cadastrado.</p>
        ) : (
          <table className="estoqueTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>Ingrediente</th>
                <th>Categoria</th>
                <th>Entrada</th>
                <th>Quantidade base</th>
                <th>Movimento</th>
                <th>Unidade</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {ingredientes.map((ingrediente) => (
                <tr key={ingrediente.id}>
                  <td>{ingrediente.id}</td>
                  <td>{ingrediente.nome}</td>
                  <td>{ingrediente.categoria}</td>
                  <td>{ingrediente.tipo_entrada || '-'}</td>
                  <td>
                    {ingrediente.quantidade_total_base || 0}{' '}
                    {ingrediente.unidade_base || ''}
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={movimentos[ingrediente.id]?.quantidade || ''}
                      onChange={(event) =>
                        atualizarMovimento(
                          ingrediente.id,
                          'quantidade',
                          event.target.value
                        )
                      }
                      placeholder="Qtd"
                    />
                  </td>
                  <td>
                    <select
                      value={
                        movimentos[ingrediente.id]?.unidade ||
                        ingrediente.unidade_base ||
                        'gr'
                      }
                      onChange={(event) =>
                        atualizarMovimento(
                          ingrediente.id,
                          'unidade',
                          event.target.value
                        )
                      }
                    >
                      {unidades.map((unidade) => (
                        <option key={unidade} value={unidade}>
                          {unidade}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btnEntradaEstoque"
                      onClick={() =>
                        handleMovimentarEstoque(ingrediente, 'entrada')
                      }
                    >
                      Entrada
                    </button>

                    <button
                      type="button"
                      className="btnSaidaEstoque"
                      onClick={() =>
                        handleMovimentarEstoque(ingrediente, 'saida')
                      }
                    >
                      Saída
                    </button>

                    <button
                      type="button"
                      className="btnAjusteEstoque"
                      onClick={() =>
                        handleMovimentarEstoque(ingrediente, 'ajuste')
                      }
                    >
                      Ajuste
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
                <th>Ingrediente</th>
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
                  <td>{item.ingrediente_nome}</td>
                  <td>{item.tipo}</td>
                  <td>
                    {item.quantidade} {item.unidade_base}
                  </td>
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

      {popup && (
        <div className="appPopupOverlay" role="dialog" aria-modal="true">
          <div className={`appPopup appPopup-${popup.tipo}`}>
            <h3>{popup.titulo}</h3>

            <div className="appPopupMessages">
              {popup.mensagens.map((mensagem, index) => (
                <p key={`${popup.titulo}-${index}`}>{mensagem}</p>
              ))}
            </div>

            <div className="appPopupActions">
              <button
                type="button"
                className="appPopupConfirm"
                onClick={fecharPopup}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Estoque;
