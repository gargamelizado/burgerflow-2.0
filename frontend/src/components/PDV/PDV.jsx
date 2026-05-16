// colocar icone nos botaoes
import { useEffect, useMemo, useState } from 'react';
import { listarProdutos } from '../../services/productService';
import './PDV.css';

export default function PDV({ caixaAberto, onVendaFinalizada }) {
  const [produtos, setProdutos] = useState([]);
  const [itensPedido, setItensPedido] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const carregarProdutos = async () => {
    try {
      setCarregando(true);

      const data = await listarProdutos();

      const produtosAtivos = data.filter((produto) => Boolean(produto.ativo));

      setProdutos(produtosAtivos);
      setErro('');
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

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

  const produtosFiltrados = useMemo(() => {
    if (categoriaAtiva === 'todos') {
      return produtos;
    }

    return produtos.filter(
      (produto) =>
        produto.categoria?.trim().toLowerCase() === categoriaAtiva
    );
  }, [produtos, categoriaAtiva]);

  const getPrecoProduto = (produto) => {
    return Number(produto.preco || 0);
  };

  const adicionarItem = (produto) => {
    const preco = getPrecoProduto(produto);

    const itemExiste = itensPedido.find((item) => item.id === produto.id);

    if (itemExiste) {
      const itensAtualizados = itensPedido.map((item) =>
        item.id === produto.id
          ? {
              ...item,
              quantidade: item.quantidade + 1,
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
        categoria: produto.categoria,
        quantidade: 1,
      },
    ]);
  };

  const adicionarQuantidadePersonalizada = (produto) => {
    const quantidadeDigitada = window.prompt(
      `Informe a quantidade de ${produto.nome}:`
    );

    if (quantidadeDigitada === null) {
      return;
    }

    const quantidade = Number(quantidadeDigitada);

    if (!quantidade || quantidade <= 0) {
      alert('Informe uma quantidade válida.');
      return;
    }

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
        categoria: produto.categoria,
        quantidade,
      },
    ]);
  };

  const editarItem = (produto) => {
    alert(`Edição/customização de ${produto.nome} será feita no próximo passo.`);
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
    const confirmar = window.confirm('Deseja limpar o pedido atual?');

    if (!confirmar) {
      return;
    }

    setItensPedido([]);
  };

  const totalPedido = itensPedido.reduce((total, item) => {
    return total + item.preco * item.quantidade;
  }, 0);

  const finalizarPedido = async () => {
    if (!caixaAberto) {
      alert('Abra o caixa antes de finalizar um pedido.');
      return;
    }

    if (itensPedido.length === 0) {
      alert('Adicione pelo menos um item ao pedido.');
      return;
    }

    const confirmar = window.confirm(
      `Deseja finalizar o pedido no valor de R$ ${totalPedido.toFixed(2)}?`
    );

    if (!confirmar) {
      return;
    }

    alert('Pedido finalizado com sucesso.');

    setItensPedido([]);

    if (onVendaFinalizada) {
      await onVendaFinalizada();
    }
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
                    {produto.categoria || 'Sem categoria'}
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
    </div>
  );
}