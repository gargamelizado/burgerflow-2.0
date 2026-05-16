import { useEffect, useState } from 'react';
import {
  listarProdutos,
  cadastrarProduto,
  editarProduto,
  deletarProduto,
} from '../../services/productService';
import './Cardapio.css';
const Cardapio = () => {
  const [produtos, setProdutos] = useState([]);
  const [erro, setErro] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    categoria: '',
    tipo: 'simples',
    preco: '',
    custo: '',
    quantidade_estoque: '',
    unidade: 'un',
    ativo: true,
  });

  const carregarProdutos = async () => {
    try {
      const data = await listarProdutos();
      setProdutos(data);
      setErro('');
    } catch (error) {
      setErro(error.message);
    }
  };

  useEffect(() => {
    let ignorarResposta = false;

    listarProdutos()
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

    return () => {
      ignorarResposta = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const limparFormulario = () => {
    setForm({
      nome: '',
      categoria: '',
      tipo: 'simples',
      preco: '',
      custo: '',
      quantidade_estoque: '',
      unidade: 'un',
      ativo: true,
    });

    setEditandoId(null);
    setModalEditarAberto(false);
  };
  const handleEditar = (produto) => {
    setEditandoId(produto.id);

    setForm({
      nome: produto.nome || '',
      categoria: produto.categoria || '',
      tipo: produto.tipo || 'simples',
      preco: produto.preco || '',
      custo: produto.custo || '',
      quantidade_estoque: produto.quantidade_estoque || '',
      unidade: produto.unidade || 'un',
      ativo: Boolean(produto.ativo),
    });

    setModalEditarAberto(true);
  };

  const handleDeletar = async (id) => {
    const confirmar = window.confirm('Deseja deletar este produto?');

    if (!confirmar) {
      return;
    }

    try {
      await deletarProduto(id);
      await carregarProdutos();
    } catch (error) {
      setErro(error.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const produto = {
        nome: form.nome,
        categoria: form.categoria,
        tipo: form.tipo,
        preco: Number(form.preco),
        custo: Number(form.custo),
        quantidade_estoque: Number(form.quantidade_estoque),
        unidade: form.unidade,
        ativo: form.ativo,
      };

      if (editandoId) {
        const confirmar = window.confirm(
          'Deseja salvar a edição deste produto?'
        );

        if (!confirmar) {
          return;
        }

        await editarProduto(editandoId, produto);
      } else {
        await cadastrarProduto(produto);
      }

      limparFormulario();
      await carregarProdutos();
    } catch (error) {
      setErro(error.message);
    }
  };

  return (
    <div className="cardapioPage">
      <header className="cardapioHeader">
        <h1>Cardápio</h1>
        <p>Cadastre e visualize os produtos do Burger Flow.</p>
      </header>

      {erro && <p className="cardapioError">{erro}</p>}

      <form className="cardapioForm" onSubmit={handleSubmit}>
        <input
          type="text"
          name="nome"
          placeholder="Nome do produto"
          value={form.nome}
          onChange={handleChange}
        />

        <input
          type="number"
          name="preco"
          placeholder="Preço"
          value={form.preco}
          onChange={handleChange}
        />

        <input
          type="number"
          name="custo"
          placeholder="Custo"
          value={form.custo}
          onChange={handleChange}
        />

        <input
          type="number"
          name="quantidade_estoque"
          placeholder="Quantidade em estoque"
          value={form.quantidade_estoque}
          onChange={handleChange}
        />

        <select name="unidade" value={form.unidade} onChange={handleChange}>
          <option value="">Tipo de unidade</option>
          <option value="un">Unidade</option>
          <option value="kg">Quilograma</option>
          <option value="g">Grama</option>
          <option value="l">Litro</option>
          <option value="ml">Mililitro</option>
          <option value="cx">Caixa</option>
        </select>

        <label className="cardapioCheckbox">
          <input
            type="checkbox"
            name="ativo"
            checked={form.ativo}
            onChange={handleChange}
          />
          Ativo
        </label>

        <button type="submit" className="btnSalvar">
          Cadastrar produto
        </button>
      </form>

      <section className="produtosSection">
        <h2>Produtos cadastrados</h2>

        {produtos.length === 0 ? (
          <p className="produtosEmpty">Nenhum produto cadastrado.</p>
        ) : (
          <table className="produtosTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Preço</th>
                <th>Custo</th>
                <th>Estoque</th>
                <th>Tipo de unidade</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {produtos.map((produto) => (
                <tr key={produto.id}>
                  <td>{produto.id}</td>
                  <td>{produto.nome}</td>
                  <td>{produto.categoria}</td>
                  <td>{produto.tipo}</td>
                  <td>R$ {produto.preco}</td>
                  <td>R$ {produto.custo}</td>
                  <td>{produto.quantidade_estoque}</td>
                  <td>{produto.unidade}</td>
                  <td>
                    <span
                      className={
                        produto.ativo ? 'produtoAtivo' : 'produtoInativo'
                      }
                    >
                      {produto.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btnEditar"
                      onClick={() => handleEditar(produto)}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="btnDeletar"
                      onClick={() => handleDeletar(produto.id)}
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {modalEditarAberto && (
        <div className="modalOverlay">
          <div className="modalCard">
            <h2>Editar produto</h2>

            <form className="modalForm" onSubmit={handleSubmit}>
              <legend>Nome</legend>
              <input
                type="text"
                name="nome"
                placeholder="Nome do produto"
                value={form.nome}
                onChange={handleChange}
              />
              <legend>Preço</legend>
              <input
                type="number"
                name="preco"
                placeholder="Preço"
                value={form.preco}
                onChange={handleChange}
              />

              <legend>Custo</legend>
              <input
                type="number"
                name="custo"
                placeholder="Custo"
                value={form.custo}
                onChange={handleChange}
              />

              <legend>Quantidade em estoque</legend>
              <input
                type="number"
                name="quantidade_estoque"
                placeholder="Quantidade em estoque"
                value={form.quantidade_estoque}
                onChange={handleChange}
              />

              <legend>Tipo de unidade</legend>
              <select
                name="unidade"
                value={form.unidade}
                onChange={handleChange}
              >
                <option value="">Tipo de unidade</option>
                <option value="un">Unidade</option>
                <option value="kg">Quilograma</option>
                <option value="g">Grama</option>
                <option value="l">Litro</option>
                <option value="ml">Mililitro</option>
                <option value="cx">Caixa</option>
              </select>

              <label className="cardapioCheckbox">
                <legend>Status</legend>
                <input
                  type="checkbox"
                  name="ativo"
                  checked={form.ativo}
                  onChange={handleChange}
                />
                Ativo
              </label>

              <div className="modalActions">
                <button type="submit" className="btnSalvar">
                  Salvar edição
                </button>

                <button
                  type="button"
                  className="btnCancelar"
                  onClick={limparFormulario}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cardapio;
