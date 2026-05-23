import { useEffect, useMemo, useState } from 'react';
import {
  listarPedidosCozinha,
  atualizarStatusPedidoCozinha,
} from '../../services/kitchenService';
import './Cozinha.css';

const colunasStatus = [
  { id: 'novo', titulo: 'Novo / Recebido' },
  { id: 'em_preparo', titulo: 'Em preparo' },
  { id: 'pronto', titulo: 'Pronto' },
  { id: 'entregue', titulo: 'Entregue' },
];

const formatarDataHora = (valor) => {
  if (!valor) {
    return '-';
  }

  return new Date(valor).toLocaleString('pt-BR');
};

const getTempoInfo = (tempoMinutos) => {
  const minutos = Math.max(0, Number(tempoMinutos || 0));

  if (minutos > 10) {
    return {
      classe: 'tempoAtrasado',
      texto: `${minutos} min`,
    };
  }

  if (minutos > 5) {
    return {
      classe: 'tempoAtencao',
      texto: `${minutos} min`,
    };
  }

  return {
    classe: 'tempoNormal',
    texto: `${minutos} min`,
  };
};

const getProximaAcao = (status) => {
  if (status === 'novo') {
    return {
      proximoStatus: 'em_preparo',
      texto: 'Iniciar preparo',
      classe: 'btnPreparo',
    };
  }

  if (status === 'em_preparo') {
    return {
      proximoStatus: 'pronto',
      texto: 'Marcar pronto',
      classe: 'btnPronto',
    };
  }

  if (status === 'pronto') {
    return {
      proximoStatus: 'entregue',
      texto: 'Entregar',
      classe: 'btnEntregue',
    };
  }

  return null;
};

const Cozinha = () => {
  const [pedidos, setPedidos] = useState([]);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [atualizando, setAtualizando] = useState(false);
  const [popup, setPopup] = useState(null);

  const abrirPopup = ({
    tipo = 'info',
    titulo = 'Mensagem',
    mensagens = [],
    textoConfirmar = 'OK',
    textoCancelar = '',
    onConfirm = null,
  }) => {
    setPopup({
      tipo,
      titulo,
      mensagens: Array.isArray(mensagens) ? mensagens : [mensagens],
      textoConfirmar,
      textoCancelar,
      onConfirm,
    });
  };

  const fecharPopup = () => {
    setPopup(null);
  };

  const confirmarPopup = async () => {
    const callback = popup?.onConfirm;
    fecharPopup();

    if (callback) {
      await callback();
    }
  };

  const carregarPedidos = async () => {
    try {
      setAtualizando(true);
      const data = await listarPedidosCozinha();
      setPedidos(Array.isArray(data) ? data : []);
      setErro('');
    } catch (error) {
      setErro(error.message);
    } finally {
      setAtualizando(false);
    }
  };

  useEffect(() => {
    let ignorarResposta = false;

    listarPedidosCozinha()
      .then((data) => {
        if (!ignorarResposta) {
          setPedidos(Array.isArray(data) ? data : []);
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

  const pedidosFiltrados = useMemo(() => {
    if (filtro === 'todos') {
      return pedidos;
    }

    return pedidos.filter((pedido) => pedido.status === filtro);
  }, [pedidos, filtro]);

  const contarPorStatus = (status) => {
    return pedidosFiltrados.filter((pedido) => pedido.status === status).length;
  };

  const handleStatus = async (pedido, status) => {
    try {
      await atualizarStatusPedidoCozinha(pedido.id, status);
      await carregarPedidos();

      const mensagem =
        status === 'em_preparo'
          ? 'Pedido movido para Em preparo.'
          : status === 'pronto'
            ? 'Pedido movido para Pronto.'
            : status === 'entregue'
              ? 'Pedido marcado como Entregue.'
              : 'Status atualizado.';

      abrirPopup({
        tipo: 'sucesso',
        titulo: 'Status atualizado',
        mensagens: mensagem,
      });
    } catch (error) {
      setErro(error.message);
      abrirPopup({
        tipo: 'erro',
        titulo: 'Erro ao atualizar pedido',
        mensagens: error.message,
      });
    }
  };

  return (
    <div className="cozinhaPage">
      <header className="cozinhaHeader">
        <h1>Cozinha</h1>
        <p>Visual KDS para acompanhar e avançar os pedidos.</p>
      </header>

      {erro && <p className="cozinhaError">{erro}</p>}

      <section className="cozinhaToolbar">
        <div className="cozinhaFiltros">
          <button
            type="button"
            className={`btnFiltro ${filtro === 'todos' ? 'isActive' : ''}`}
            onClick={() => setFiltro('todos')}
          >
            Todos
          </button>
          <button
            type="button"
            className={`btnFiltro ${filtro === 'novo' ? 'isActive' : ''}`}
            onClick={() => setFiltro('novo')}
          >
            Novos
          </button>
          <button
            type="button"
            className={`btnFiltro ${filtro === 'em_preparo' ? 'isActive' : ''}`}
            onClick={() => setFiltro('em_preparo')}
          >
            Em preparo
          </button>
          <button
            type="button"
            className={`btnFiltro ${filtro === 'pronto' ? 'isActive' : ''}`}
            onClick={() => setFiltro('pronto')}
          >
            Prontos
          </button>
            <button
            type="button"
            className={`btnFiltro ${filtro === 'entregue' ? 'isActive' : ''}`}
            onClick={() => setFiltro('entregue')}
          >
            entregue
          </button>
        </div>

        <button
          type="button"
          className="btnAtualizarPedidos"
          onClick={carregarPedidos}
          disabled={atualizando}
        >
          {atualizando ? 'Atualizando...' : 'Atualizar pedidos'}
        </button>
      </section>

      <section className="cozinhaBoard">
        {colunasStatus.map((coluna) => {
          const pedidosColuna = pedidosFiltrados.filter(
            (pedido) => pedido.status === coluna.id
          );

          return (
            <article key={coluna.id} className="cozinhaColuna">
              <header className="cozinhaColunaHeader">
                <h2>{coluna.titulo}</h2>
                <span>{contarPorStatus(coluna.id)}</span>
              </header>

              <div className="cozinhaColunaBody">
                {pedidosColuna.length === 0 ? (
                  <p className="cozinhaColunaEmpty">Sem pedidos nesta coluna.</p>
                ) : (
                  pedidosColuna.map((pedido) => {
                    const tempoInfo = getTempoInfo(pedido.tempo_minutos);
                    const proximaAcao = getProximaAcao(pedido.status);

                    return (
                      <div key={pedido.id} className="pedidoCard">
                        <div className="pedidoCardHeader">
                          <strong>Pedido #{pedido.numero}</strong>
                          <span className={`pedidoTempo ${tempoInfo.classe}`}>
                            {tempoInfo.texto}
                          </span>
                        </div>

                        <div className="pedidoMeta">
                          <p>
                            <strong>Cliente:</strong> {pedido.cliente_nome || 'Cliente'}
                          </p>
                          <p>
                            <strong>Canal:</strong> {pedido.tipo || '-'}
                          </p>
                          <p>
                            <strong>Criado em:</strong> {formatarDataHora(pedido.criado_em)}
                          </p>
                          <p>
                            <strong>Status:</strong> {String(pedido.status || '').replace('_', ' ')}
                          </p>
                        </div>

                        <div className="pedidoItens">
                          <strong>Itens</strong>
                          <ul>
                            {(pedido.itens || []).map((item, index) => (
                              <li key={`${pedido.id}-${item.item_nome}-${index}`}>
                                <span>{item.item_nome}</span>
                                <strong>x{Number(item.quantidade || 0)}</strong>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <p className="pedidoObservacao">
                          <strong>Observação:</strong> {pedido.observacao || '-'}
                        </p>

                        {proximaAcao && (
                          <button
                            type="button"
                            className={`btnCozinha ${proximaAcao.classe}`}
                            onClick={() =>
                              handleStatus(pedido, proximaAcao.proximoStatus)
                            }
                          >
                            {proximaAcao.texto}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </article>
          );
        })}
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
              {popup.textoCancelar && (
                <button
                  type="button"
                  className="appPopupCancel"
                  onClick={fecharPopup}
                >
                  {popup.textoCancelar}
                </button>
              )}

              <button
                type="button"
                className="appPopupConfirm"
                onClick={confirmarPopup}
              >
                {popup.textoConfirmar}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cozinha;
