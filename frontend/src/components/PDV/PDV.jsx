// colocar icone nos botaoes
import { useEffect, useMemo, useState } from 'react';
import { listarCardapio } from '../../services/productService';
import { criarPedido } from '../../services/orderService';
import { autorizarAcaoGerencial } from '../../services/cashService';
import './PDV.css';


export default function PDV({ caixaAberto, onVendaFinalizada }) {
  const [produtos, setProdutos] = useState([]);
  const [itensPedido, setItensPedido] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos');
  const [formaPagamento, setFormaPagamento] = useState('dinheiro');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [popup, setPopup] = useState(null);
  const [popupQuantidade, setPopupQuantidade] = useState(null);
  const [popupGerencial, setPopupGerencial] = useState(null);

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

  useEffect(() => {
    let ignorarResposta = false;

    listarCardapio({ categoria: categoriaAtiva })
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
      })
      .finally(() => {
        if (!ignorarResposta) {
          setCarregando(false);
        }
      });

    return () => {
      ignorarResposta = true;
    };
  }, [categoriaAtiva]);

  const categorias = useMemo(() => {
    const categoriasBase = [
      'todos',
      'hambúrguer',
      'vegano',
      'acompanhamento',
      'sobremesa',
      'fritas',
      'bebida',
      'combo',
      'promoção',
    ];

    const categoriasBanco = produtos
      .map((produto) => produto.categoria?.trim().toLowerCase())
      .filter(Boolean);

    return Array.from(new Set([...categoriasBase, ...categoriasBanco]));
  }, [produtos]);

  const produtosFiltrados = useMemo(() => produtos, [produtos]);

  const getPrecoProduto = (produto) => {
    return Number(produto.preco || produto.preco_venda || 0);
  };

  const adicionarProdutoComQuantidade = (produto, quantidade) => {
    const preco = getPrecoProduto(produto);

    const itemExiste = itensPedido.find((item) => item.id === produto.id);

    if (itemExiste) {
      const itensAtualizados = itensPedido.map((item) =>
        item.id === produto.id
          ? {
              ...item,
              quantidade: item.quantidade + quantidade,
            }
          : item
      );

      setItensPedido(itensAtualizados);
      return;
    }

    setItensPedido([
      ...itensPedido,
      {
        id: produto.id,
        nome: produto.nome,
        preco,
        tipo: produto.tipo,
        categoria: produto.categoria,
        quantidade,
      },
    ]);
  };

  const adicionarItem = (produto) => {
    adicionarProdutoComQuantidade(produto, 1);
  };

  const adicionarQuantidadePersonalizada = (produto) => {
    setPopupQuantidade({
      produto,
      quantidade: '',
    });
  };

  const confirmarQuantidadePersonalizada = () => {
    const quantidade = Number(popupQuantidade?.quantidade || 0);

    if (!quantidade || quantidade <= 0) {
      setPopupQuantidade(null);
      abrirPopup({
        tipo: 'erro',
        titulo: 'Quantidade inválida',
        mensagens: 'Informe uma quantidade maior que zero.',
      });
      return;
    }

    adicionarProdutoComQuantidade(popupQuantidade.produto, quantidade);
    setPopupQuantidade(null);
  };

  const abrirPopupGerencial = () => {
    setPopupGerencial({ identificador: '', senha: '' });
  };

  const fecharPopupGerencial = () => setPopupGerencial(null);

  const confirmarAutorizacaoGerencial = async () => {
    if (!popupGerencial) return;

    try {
      const auth = await autorizarAcaoGerencial({
        acao: 'estoque.override',
        identificador: popupGerencial.identificador,
        senha: popupGerencial.senha,
        motivo: 'Override estoque PDV',
        entidade: 'pedidos',
      });

      const token = auth?.autorizacao?.token;

      if (!token) {
        throw new Error('Falha ao obter token gerencial.');
      }

      // Reenviar pedido com token gerencial
      const resultado = await criarPedido({
        caixa_id: caixaAberto.id,
        cliente_nome: 'Cliente',
        tipo: 'balcao',
        forma_pagamento: formaPagamento,
        status_pagamento: 'pago',
        itens: itensPedido.map((item) => ({
          item_id: item.id,
          quantidade: item.quantidade,
        })),
        gerencialToken: token,
      });

      const avisos = resultado.avisos_estoque || [];
      const mensagens = [resultado.message || 'Pedido finalizado com sucesso.'];

      if (avisos.length > 0) {
        mensagens.push(...avisos.map((aviso) => aviso.message));
      }

      fecharPopupGerencial();
      abrirPopup({
        tipo: avisos.length > 0 ? 'aviso' : 'sucesso',
        titulo: avisos.length > 0 ? 'Venda finalizada com aviso' : 'Venda finalizada',
        mensagens,
      });
      setItensPedido([]);
      setErro('');

      if (onVendaFinalizada) {
        await onVendaFinalizada();
      }
    } catch (error) {
      fecharPopupGerencial();
      setErro(error.message);
      abrirPopup({ tipo: 'erro', titulo: 'Autorização falhou', mensagens: error.message });
    }
  };

  const editarItem = (produto) => {
    abrirPopup({
      tipo: 'info',
      titulo: 'Edição do item',
      mensagens: `Edição/customização de ${produto.nome} será feita no próximo passo.`,
    });
  };

  const removerItem = (produtoId) => {
    const itensAtualizados = itensPedido.filter((item) => item.id !== produtoId);
    setItensPedido(itensAtualizados);
  };

  const alterarQuantidade = (produtoId, novaQuantidade) => {
    const quantidade = Number(novaQuantidade);

    if (quantidade <= 0) {
      removerItem(produtoId);
      return;
    }

    const itensAtualizados = itensPedido.map((item) =>
      item.id === produtoId
        ? {
            ...item,
            quantidade,
          }
        : item
    );

    setItensPedido(itensAtualizados);
  };

  const limparPedido = () => {
    abrirPopup({
      tipo: 'confirmacao',
      titulo: 'Limpar pedido',
      mensagens: 'Deseja limpar o pedido atual?',
      textoConfirmar: 'Limpar',
      textoCancelar: 'Cancelar',
      onConfirm: () => setItensPedido([]),
    });
  };

  const totalPedido = itensPedido.reduce((total, item) => {
    return total + item.preco * item.quantidade;
  }, 0);

  const processarFinalizacao = async () => {
    try {
      const resultado = await criarPedido({
        caixa_id: caixaAberto.id,
        cliente_nome: 'Cliente',
        tipo: 'balcao',
        forma_pagamento: formaPagamento,
        status_pagamento: 'pago',
        itens: itensPedido.map((item) => ({
          item_id: item.id,
          quantidade: item.quantidade,
        })),
      });

      const avisos = resultado.avisos_estoque || [];
      const mensagens = [resultado.message || 'Pedido finalizado com sucesso.'];

      if (avisos.length > 0) {
        mensagens.push(...avisos.map((aviso) => aviso.message));
      }

      abrirPopup({
        tipo: avisos.length > 0 ? 'aviso' : 'sucesso',
        titulo: avisos.length > 0 ? 'Venda finalizada com aviso' : 'Venda finalizada',
        mensagens,
      });
      setItensPedido([]);
      setErro('');

      if (onVendaFinalizada) {
        await onVendaFinalizada();
      }
    } catch (error) {
      // Se API pedir autorização gerencial para override de estoque, abrir modal
      if (String(error.message || '').includes('Solicitar autorização gerencial')) {
        abrirPopupGerencial();
        return;
      }

      setErro(error.message);
      abrirPopup({
        tipo: 'erro',
        titulo: 'Erro ao finalizar',
        mensagens: error.message,
      });
    }
  };

  const finalizarPedido = async () => {
    if (!caixaAberto) {
      abrirPopup({
        tipo: 'erro',
        titulo: 'Caixa fechado',
        mensagens: 'Abra o caixa antes de finalizar um pedido.',
      });
      return;
    }

    if (itensPedido.length === 0) {
      abrirPopup({
        tipo: 'aviso',
        titulo: 'Pedido vazio',
        mensagens: 'Adicione pelo menos um item ao pedido.',
      });
      return;
    }

    abrirPopup({
      tipo: 'confirmacao',
      titulo: 'Finalizar pedido',
      mensagens: `Deseja finalizar o pedido no valor de R$ ${totalPedido.toFixed(2)}?`,
      textoConfirmar: 'Finalizar',
      textoCancelar: 'Cancelar',
      onConfirm: processarFinalizacao,
    });
  };

  return (
    <div className="pdvPage">
      {erro && <p className="pdvError">{erro}</p>}

      <div className="pesquisa">
        <div className="pesquisaWrapper">
          {categorias.map((categoria) => (
            <button
              key={categoria}
              type="button"
              className={
                categoriaAtiva === categoria ? 'categoriaAtiva' : ''
              }
              onClick={() => setCategoriaAtiva(categoria)}
            >
              {categoria}
            </button>
          ))}
        </div>
      </div>

      <div className="pdvLayout">
        <section className="pdvProdutos">
          <h2>Produtos</h2>

          {carregando ? (
            <p>Carregando produtos...</p>
          ) : produtosFiltrados.length === 0 ? (
            <p>Nenhum produto encontrado nesta categoria.</p>
          ) : (
            <div className="items">
              {produtosFiltrados.map((produto) => (
                <div className="item" key={produto.id}>
                  <h2>{produto.nome}</h2>

                  <span className="itemCategoria">
                    {produto.tipo} · {produto.categoria || 'Sem categoria'}
                  </span>

                  <p>R$ {getPrecoProduto(produto).toFixed(2)}</p>

                  <div className="itemActions">
                    <button
                      type="button"
                      onClick={() => editarItem(produto)}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        adicionarQuantidadePersonalizada(produto)
                      }
                    >
                      Qtd
                    </button>

                    <button
                      type="button"
                      onClick={() => adicionarItem(produto)}
                    >
                      +1
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="pdvPedido">
          <h2>Pedido atual</h2>

          {itensPedido.length === 0 ? (
            <p>Nenhum item selecionado.</p>
          ) : (
            <>
              <table className="pedidoTable">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Qtd</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {itensPedido.map((item) => (
                    <tr key={item.id}>
                      <td>{item.nome}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={(event) =>
                            alterarQuantidade(item.id, event.target.value)
                          }
                        />
                      </td>
                      <td>
                        R$ {(item.preco * item.quantidade).toFixed(2)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btnRemoverItem"
                          onClick={() => removerItem(item.id)}
                        >
                          X
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pedidoTotal">
                <div className="finalizarTexto">
                  <span>Total</span>
                  <strong>R$ {totalPedido.toFixed(2)}</strong>
                </div>

                <div className="finalizar">
                  <select
                    value={formaPagamento}
                    onChange={(event) => setFormaPagamento(event.target.value)}
                    placeholder="Forma de pagamento"
                  >
                    <option value="">Formar de Pagamento</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">Pix</option>
                    <option value="cartao_credito">Cartão crédito</option>
                    <option value="cartao_debito">Cartão débito</option>
                  </select>

                  <button type="button" onClick={finalizarPedido}>
                    Finalizar pedido
                  </button>
                </div>

                <button
                  type="button"
                  className="btnLimparPedido"
                  onClick={limparPedido}
                >
                  Limpar pedido
                </button>
              </div>
            </>
          )}
        </aside>
      </div>

      {popup && (
        <div className="pdvPopupOverlay" role="dialog" aria-modal="true">
          <div className={`pdvPopup pdvPopup-${popup.tipo}`}>
            <h3>{popup.titulo}</h3>

            <div className="pdvPopupMessages">
              {popup.mensagens.map((mensagem, index) => (
                <p key={`${popup.titulo}-${index}`}>{mensagem}</p>
              ))}
            </div>

            <div className="pdvPopupActions">
              {popup.textoCancelar && (
                <button
                  type="button"
                  className="pdvPopupCancel"
                  onClick={fecharPopup}
                >
                  {popup.textoCancelar}
                </button>
              )}

              <button
                type="button"
                className="pdvPopupConfirm"
                onClick={confirmarPopup}
              >
                {popup.textoConfirmar}
              </button>
            </div>
          </div>
        </div>
      )}

      {popupQuantidade && (
        <div className="pdvPopupOverlay" role="dialog" aria-modal="true">
          <div className="pdvPopup pdvPopup-confirmacao">
            <h3>Quantidade</h3>

            <div className="pdvPopupMessages">
              <p>{popupQuantidade.produto.nome}</p>
            </div>

            <input
              className="pdvPopupInput"
              type="number"
              min="1"
              step="1"
              placeholder="Quantidade"
              value={popupQuantidade.quantidade}
              onChange={(event) =>
                setPopupQuantidade((current) => ({
                  ...current,
                  quantidade: event.target.value,
                }))
              }
              autoFocus
            />

            <div className="pdvPopupActions">
              <button
                type="button"
                className="pdvPopupCancel"
                onClick={() => setPopupQuantidade(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="pdvPopupConfirm"
                onClick={confirmarQuantidadePersonalizada}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {popupGerencial && (
        <div className="pdvPopupOverlay" role="dialog" aria-modal="true">
          <div className={`pdvPopup pdvPopup-confirmacao`}>
            <h3>Autorização Gerencial</h3>

            <div className="pdvPopupMessages">
              <p>Informe credenciais gerenciais para autorizar venda sem estoque.</p>
            </div>

            <input
              className="pdvPopupInput"
              type="text"
              placeholder="Gerente (email ou nome)"
              value={popupGerencial.identificador}
              onChange={(e) =>
                setPopupGerencial((c) => ({ ...c, identificador: e.target.value }))
              }
              autoFocus
            />

            <input
              className="pdvPopupInput"
              type="password"
              placeholder="Senha gerencial"
              value={popupGerencial.senha}
              onChange={(e) =>
                setPopupGerencial((c) => ({ ...c, senha: e.target.value }))
              }
            />

            <div className="pdvPopupActions">
              <button
                type="button"
                className="pdvPopupCancel"
                onClick={fecharPopupGerencial}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="pdvPopupConfirm"
                onClick={confirmarAutorizacaoGerencial}
              >
                Autorizar e Reenviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
