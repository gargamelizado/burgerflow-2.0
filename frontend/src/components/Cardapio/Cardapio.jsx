import { useEffect, useMemo, useState } from 'react';
import {
  listarItens,
  buscarItem,
  cadastrarItem,
  editarItem,
  desativarItem,
} from '../../services/productService';
import './Cardapio.css';

const categorias = [
  'hambúrguer',
  'vegano',
  'acompanhamento',
  'sobremesa',
  'fritas',
  'bebida',
  'combo',
  'promoção',
  'ingrediente',
];

const tipos = ['INGREDIENTE', 'PRODUTO', 'COMBO', 'PROMOCAO'];
const unidades = ['gr', 'kg', 'ml', 'li'];

const criarFormInicial = () => ({
  nome: '',
  tipo: 'INGREDIENTE',
  categoria: 'ingrediente',
  preco_venda: '',
  ativo: true,
  aparece_cardapio: false,
  tipo_entrada: 'medida',
  quantidade_entrada: '',
  pacotes_por_caixa: '',
  quantidade_por_pacote: '',
  unidade_medida: 'gr',
  ingredientes: [
    {
      ingrediente_id: '',
      quantidade_usada: '',
      unidade_usada: 'gr',
    },
  ],
  combo_itens: [
    {
      produto_id: '',
      quantidade: 1,
    },
  ],
  item_original_id: '',
  preco_promocional: '',
  data_inicio: '',
  data_fim: '',
});

const getCategoriaPadrao = (tipo) => {
  if (tipo === 'INGREDIENTE') {
    return 'ingrediente';
  }

  if (tipo === 'COMBO') {
    return 'combo';
  }

  if (tipo === 'PROMOCAO') {
    return 'promoção';
  }

  return 'hambúrguer';
};

const formatarMoeda = (valor) => {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const formatarDataInput = (valor) => {
  if (!valor) {
    return '';
  }

  if (typeof valor === 'string') {
    return valor.slice(0, 10);
  }

  return new Date(valor).toISOString().slice(0, 10);
};

const getNomePlaceholder = (tipo) => {
  const placeholders = {
    INGREDIENTE: 'Nome do ingrediente',
    PRODUTO: 'Nome do produto',
    COMBO: 'Nome do combo',
    PROMOCAO: 'Nome da promoção',
  };

  return placeholders[tipo] || 'Nome do item';
};

const formatarTipo = (tipo) => {
  if (tipo === 'PROMOCAO') {
    return 'PROMOÇÃO';
  }

  return tipo;
};

const getTipoClasse = (tipo) => {
  return `tipoBadge tipoBadge-${String(tipo || '').toLowerCase()}`;
};

const Cardapio = () => {
  const [itens, setItens] = useState([]);
  const [erro, setErro] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(criarFormInicial);
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

  const ingredientesDisponiveis = useMemo(
    () => itens.filter((item) => item.tipo === 'INGREDIENTE' && item.ativo),
    [itens]
  );

  const produtosDisponiveis = useMemo(
    () => itens.filter((item) => item.tipo === 'PRODUTO' && item.ativo),
    [itens]
  );

  const itensPromocionaveis = useMemo(
    () =>
      itens.filter(
        (item) =>
          ['PRODUTO', 'COMBO'].includes(item.tipo) &&
          item.ativo &&
          Number(item.id) !== Number(editandoId)
      ),
    [itens, editandoId]
  );

  const totalAtivos = useMemo(
    () => itens.filter((item) => item.ativo).length,
    [itens]
  );

  const totalCardapio = useMemo(
    () =>
      itens.filter(
        (item) =>
          item.ativo &&
          item.aparece_cardapio &&
          item.tipo !== 'INGREDIENTE'
      ).length,
    [itens]
  );

  const carregarItens = async () => {
    try {
      const data = await listarItens();
      setItens(data);
      setErro('');
    } catch (error) {
      setErro(error.message);
    }
  };

  useEffect(() => {
    let ignorarResposta = false;

    listarItens()
      .then((data) => {
        if (!ignorarResposta) {
          setItens(data);
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

  const limparFormulario = () => {
    setForm(criarFormInicial());
    setEditandoId(null);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleTipoChange = (event) => {
    const tipo = event.target.value;

    setForm((current) => ({
      ...criarFormInicial(),
      nome: current.nome,
      tipo,
      categoria: getCategoriaPadrao(tipo),
      ativo: current.ativo,
      aparece_cardapio: tipo !== 'INGREDIENTE',
    }));
  };

  const atualizarLinha = (campo, index, name, value) => {
    setForm((current) => {
      const linhas = current[campo].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [name]: value } : item
      );

      return {
        ...current,
        [campo]: linhas,
      };
    });
  };

  const adicionarLinha = (campo, linha) => {
    setForm((current) => ({
      ...current,
      [campo]: [...current[campo], linha],
    }));
  };

  const removerLinha = (campo, index) => {
    setForm((current) => ({
      ...current,
      [campo]: current[campo].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const montarPayload = () => {
    const base = {
      nome: form.nome,
      tipo: form.tipo,
      categoria: form.categoria,
      ativo: form.ativo,
      aparece_cardapio: form.tipo !== 'INGREDIENTE' && form.aparece_cardapio,
    };

    if (form.tipo === 'INGREDIENTE') {
      return {
        ...base,
        estoque: {
          tipo_entrada: form.tipo_entrada,
          quantidade_entrada: Number(form.quantidade_entrada),
          pacotes_por_caixa:
            form.tipo_entrada === 'cx'
              ? Number(form.pacotes_por_caixa)
              : null,
          quantidade_por_pacote:
            form.tipo_entrada !== 'medida'
              ? Number(form.quantidade_por_pacote)
              : null,
          unidade_medida: form.unidade_medida,
        },
      };
    }

    if (form.tipo === 'PRODUTO') {
      return {
        ...base,
        preco_venda: Number(form.preco_venda),
        ingredientes: form.ingredientes
          .filter((item) => item.ingrediente_id)
          .map((item) => ({
            ingrediente_id: Number(item.ingrediente_id),
            quantidade_usada: Number(item.quantidade_usada),
            unidade_usada: item.unidade_usada,
          })),
      };
    }

    if (form.tipo === 'COMBO') {
      return {
        ...base,
        preco_venda: Number(form.preco_venda),
        combo_itens: form.combo_itens
          .filter((item) => item.produto_id)
          .map((item) => ({
            produto_id: Number(item.produto_id),
            quantidade: Number(item.quantidade),
          })),
      };
    }

    return {
      ...base,
      preco_venda: Number(form.preco_promocional),
      promocao: {
        item_original_id: Number(form.item_original_id),
        preco_promocional: Number(form.preco_promocional),
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
        ativo: form.ativo,
      },
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const payload = montarPayload();

      if (editandoId) {
        await editarItem(editandoId, payload);
      } else {
        await cadastrarItem(payload);
      }

      limparFormulario();
      await carregarItens();
      abrirPopup({
        tipo: 'sucesso',
        titulo: editandoId ? 'Item atualizado' : 'Item cadastrado',
        mensagens: editandoId
          ? 'Item atualizado com sucesso.'
          : 'Item cadastrado com sucesso.',
      });
    } catch (error) {
      setErro(error.message);
      abrirPopup({
        tipo: 'erro',
        titulo: 'Erro no cadastro',
        mensagens: error.message,
      });
    }
  };

  const handleEditar = async (item) => {
    try {
      const detalhe = await buscarItem(item.id);

      setEditandoId(detalhe.id);
      setForm({
        ...criarFormInicial(),
        nome: detalhe.nome || '',
        tipo: detalhe.tipo,
        categoria: detalhe.categoria || getCategoriaPadrao(detalhe.tipo),
        preco_venda: detalhe.preco_venda || '',
        ativo: Boolean(detalhe.ativo),
        aparece_cardapio: Boolean(detalhe.aparece_cardapio),
        tipo_entrada: detalhe.tipo_entrada || 'medida',
        quantidade_entrada: detalhe.quantidade_entrada || '',
        pacotes_por_caixa: detalhe.pacotes_por_caixa || '',
        quantidade_por_pacote: detalhe.quantidade_por_pacote || '',
        unidade_medida: detalhe.unidade_medida || 'gr',
        ingredientes:
          detalhe.ingredientes?.length > 0
            ? detalhe.ingredientes.map((ingrediente) => ({
                ingrediente_id: String(ingrediente.ingrediente_id),
                quantidade_usada: ingrediente.quantidade_usada,
                unidade_usada: ingrediente.unidade_usada || 'gr',
              }))
            : criarFormInicial().ingredientes,
        combo_itens:
          detalhe.combo_itens?.length > 0
            ? detalhe.combo_itens.map((produto) => ({
                produto_id: String(produto.produto_id),
                quantidade: produto.quantidade,
              }))
            : criarFormInicial().combo_itens,
        item_original_id: detalhe.promocao?.item_original_id
          ? String(detalhe.promocao.item_original_id)
          : '',
        preco_promocional:
          detalhe.promocao?.preco_promocional || detalhe.preco_venda || '',
        data_inicio: formatarDataInput(detalhe.promocao?.data_inicio),
        data_fim: formatarDataInput(detalhe.promocao?.data_fim),
      });
    } catch (error) {
      setErro(error.message);
      abrirPopup({
        tipo: 'erro',
        titulo: 'Erro ao carregar item',
        mensagens: error.message,
      });
    }
  };

  const handleDesativar = async (id) => {
    abrirPopup({
      tipo: 'confirmacao',
      titulo: 'Desativar item',
      mensagens: 'Deseja desativar este item?',
      textoConfirmar: 'Desativar',
      textoCancelar: 'Cancelar',
      onConfirm: async () => {
        try {
          await desativarItem(id);
          await carregarItens();
          abrirPopup({
            tipo: 'sucesso',
            titulo: 'Item desativado',
            mensagens: 'Item desativado com sucesso.',
          });
        } catch (error) {
          setErro(error.message);
          abrirPopup({
            tipo: 'erro',
            titulo: 'Erro ao desativar',
            mensagens: error.message,
          });
        }
      },
    });
  };

  return (
    <div className="cardapioPage">
      <header className="cardapioHeader">
        <div>
          <span className="cardapioMode">
            {editandoId ? `Editando #${editandoId}` : 'Cadastro'}
          </span>
          <h1>Cadastrar Item</h1>
          <p>Cadastre ingredientes, produtos, combos e promoções.</p>
        </div>

        <div className="cardapioStats" aria-label="Resumo do cardápio">
          <span>
            <strong>{itens.length}</strong>
            Itens
          </span>
          <span>
            <strong>{totalAtivos}</strong>
            Ativos
          </span>
          <span>
            <strong>{totalCardapio}</strong>
            Cardápio
          </span>
        </div>
      </header>

      {erro && <p className="cardapioError">{erro}</p>}

      <form className="cardapioForm cadastroItemForm" onSubmit={handleSubmit}>
        <fieldset className="formBlock formBlockMain">
          <legend>Dados do item</legend>

          <label className="cardapioField">
            <span>Nome</span>
            <input
              type="text"
              name="nome"
              placeholder={getNomePlaceholder(form.tipo)}
              value={form.nome}
              onChange={handleChange}
              required
            />
          </label>

          <label className="cardapioField">
            <span>Tipo do item</span>
            <select
              name="tipo"
              value={form.tipo}
              onChange={handleTipoChange}
              aria-label="Tipo do item"
              title="Tipo do item"
            >
              {tipos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </label>

          <label className="cardapioField">
            <span>Categoria</span>
            <select
              name="categoria"
              value={form.categoria}
              onChange={handleChange}
              aria-label="Categoria do item"
              title="Categoria do item"
            >
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </label>

          {form.tipo !== 'INGREDIENTE' && (
            <label className="cardapioField">
              <span>
                {form.tipo === 'PROMOCAO'
                  ? 'Preço promocional'
                  : 'Preço de venda'}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                name={
                  form.tipo === 'PROMOCAO'
                    ? 'preco_promocional'
                    : 'preco_venda'
                }
                placeholder={
                  form.tipo === 'PROMOCAO'
                    ? 'Preço promocional'
                    : 'Preço de venda'
                }
                value={
                  form.tipo === 'PROMOCAO'
                    ? form.preco_promocional
                    : form.preco_venda
                }
                onChange={handleChange}
                required
              />
            </label>
          )}

          <div className="checkboxGroup">
            {form.tipo !== 'INGREDIENTE' && (
              <label className="cardapioCheckbox">
                <input
                  type="checkbox"
                  name="aparece_cardapio"
                  checked={form.aparece_cardapio}
                  onChange={handleChange}
                />
                Aparece no cardápio
              </label>
            )}

            <label className="cardapioCheckbox">
              <input
                type="checkbox"
                name="ativo"
                checked={form.ativo}
                onChange={handleChange}
              />
              Ativo
            </label>
          </div>
        </fieldset>

        {form.tipo === 'INGREDIENTE' && (
          <fieldset className="formBlock">
            <legend>Estoque do ingrediente</legend>

            <select
              name="tipo_entrada"
              value={form.tipo_entrada}
              onChange={handleChange}
              aria-label="Tipo de entrada do ingrediente"
              title="Tipo de entrada do ingrediente"
            >
              <option value="cx">Caixa</option>
              <option value="pacote">Pacote</option>
              <option value="medida">Medida direta</option>
            </select>

            <input
              type="number"
              min="0"
              step="0.001"
              name="quantidade_entrada"
              placeholder={
                form.tipo_entrada === 'cx'
                  ? 'Quantidade de caixas'
                  : form.tipo_entrada === 'pacote'
                    ? 'Quantidade de pacotes'
                    : 'Quantidade'
              }
              value={form.quantidade_entrada}
              onChange={handleChange}
              required
            />

            {form.tipo_entrada === 'cx' && (
              <input
                type="number"
                min="0"
                step="0.001"
                name="pacotes_por_caixa"
                placeholder="Pacotes por caixa"
                value={form.pacotes_por_caixa}
                onChange={handleChange}
                required
              />
            )}

            {form.tipo_entrada !== 'medida' && (
              <input
                type="number"
                min="0"
                step="0.001"
                name="quantidade_por_pacote"
                placeholder="Quantidade por pacote"
                value={form.quantidade_por_pacote}
                onChange={handleChange}
                required
              />
            )}

            <select
              name="unidade_medida"
              value={form.unidade_medida}
              onChange={handleChange}
              aria-label="Unidade de medida"
              title="Unidade de medida"
            >
              {unidades.map((unidade) => (
                <option key={unidade} value={unidade}>
                  {unidade}
                </option>
              ))}
            </select>
          </fieldset>
        )}

        {form.tipo === 'PRODUTO' && (
          <fieldset className="formBlock fullWidth">
            <legend>Ingredientes usados</legend>

            {form.ingredientes.map((ingrediente, index) => (
              <div className="compositionRow" key={`ingrediente-${index}`}>
                <select
                  value={ingrediente.ingrediente_id}
                  aria-label="Ingrediente usado"
                  title="Ingrediente usado"
                  onChange={(event) =>
                    atualizarLinha(
                      'ingredientes',
                      index,
                      'ingrediente_id',
                      event.target.value
                    )
                  }
                  required
                >
                  <option value="">Ingrediente</option>
                  {ingredientesDisponiveis.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome} ({item.unidade_base})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="Quantidade usada"
                  value={ingrediente.quantidade_usada}
                  onChange={(event) =>
                    atualizarLinha(
                      'ingredientes',
                      index,
                      'quantidade_usada',
                      event.target.value
                    )
                  }
                  required
                />

                <select
                  value={ingrediente.unidade_usada}
                  aria-label="Unidade usada"
                  title="Unidade usada"
                  onChange={(event) =>
                    atualizarLinha(
                      'ingredientes',
                      index,
                      'unidade_usada',
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

                <button
                  type="button"
                  className="btnRemoverLinha"
                  onClick={() => removerLinha('ingredientes', index)}
                >
                  Remover
                </button>
              </div>
            ))}

            <button
              type="button"
              className="btnAdicionarLinha"
              onClick={() =>
                adicionarLinha('ingredientes', {
                  ingrediente_id: '',
                  quantidade_usada: '',
                  unidade_usada: 'gr',
                })
              }
            >
              Adicionar ingrediente
            </button>
          </fieldset>
        )}

        {form.tipo === 'COMBO' && (
          <fieldset className="formBlock fullWidth">
            <legend>Produtos dentro do combo</legend>

            {form.combo_itens.map((produto, index) => (
              <div className="compositionRow" key={`produto-${index}`}>
                <select
                  value={produto.produto_id}
                  aria-label="Produto do combo"
                  title="Produto do combo"
                  onChange={(event) =>
                    atualizarLinha(
                      'combo_itens',
                      index,
                      'produto_id',
                      event.target.value
                    )
                  }
                  required
                >
                  <option value="">Produto</option>
                  {produtosDisponiveis.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Quantidade"
                  value={produto.quantidade}
                  onChange={(event) =>
                    atualizarLinha(
                      'combo_itens',
                      index,
                      'quantidade',
                      event.target.value
                    )
                  }
                  required
                />

                <button
                  type="button"
                  className="btnRemoverLinha"
                  onClick={() => removerLinha('combo_itens', index)}
                >
                  Remover
                </button>
              </div>
            ))}

            <button
              type="button"
              className="btnAdicionarLinha"
              onClick={() =>
                adicionarLinha('combo_itens', {
                  produto_id: '',
                  quantidade: 1,
                })
              }
            >
              Adicionar produto
            </button>
          </fieldset>
        )}

        {form.tipo === 'PROMOCAO' && (
          <fieldset className="formBlock fullWidth">
            <legend>Item original</legend>

            <select
              name="item_original_id"
              value={form.item_original_id}
              onChange={handleChange}
              aria-label="Produto ou combo original"
              title="Produto ou combo original"
              required
            >
              <option value="">Produto ou combo</option>
              {itensPromocionaveis.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome} ({item.tipo})
                </option>
              ))}
            </select>

            <input
              type="date"
              name="data_inicio"
              placeholder="Data de início"
              aria-label="Data de início"
              value={form.data_inicio}
              onChange={handleChange}
            />

            <input
              type="date"
              name="data_fim"
              placeholder="Data de fim"
              aria-label="Data de fim"
              value={form.data_fim}
              onChange={handleChange}
            />
          </fieldset>
        )}

        <div className="formActions">
          <button type="submit" className="btnSalvar">
            {editandoId ? 'Salvar item' : 'Cadastrar item'}
          </button>

          {editandoId && (
            <button
              type="button"
              className="btnCancelar"
              onClick={limparFormulario}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <section className="produtosSection">
        <div className="produtosSectionHeader">
          <div>
            <h2>Itens cadastrados</h2>
            <p>{itens.length} registros encontrados</p>
          </div>
        </div>

        {itens.length === 0 ? (
          <p className="produtosEmpty">Nenhum item cadastrado.</p>
        ) : (
          <table className="produtosTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Estoque base</th>
                <th>Cardápio</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>
                    <strong className="itemName">{item.nome}</strong>
                  </td>
                  <td>
                    <span className={getTipoClasse(item.tipo)}>
                      {formatarTipo(item.tipo)}
                    </span>
                  </td>
                  <td>
                    <span className="categoriaBadge">{item.categoria}</span>
                  </td>
                  <td>
                    {item.tipo === 'INGREDIENTE'
                      ? '-'
                      : formatarMoeda(item.preco)}
                  </td>
                  <td>
                    {item.tipo === 'INGREDIENTE'
                      ? `${item.quantidade_total_base || 0} ${item.unidade_base || ''}`
                      : '-'}
                  </td>
                  <td>
                    <span
                      className={
                        item.aparece_cardapio
                          ? 'cardapioBadge cardapioBadge-on'
                          : 'cardapioBadge cardapioBadge-off'
                      }
                    >
                      {item.aparece_cardapio ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={item.ativo ? 'produtoAtivo' : 'produtoInativo'}
                    >
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="tableActions">
                      <button
                        type="button"
                        className="btnEditar"
                        onClick={() => handleEditar(item)}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="btnDeletar"
                        onClick={() => handleDesativar(item.id)}
                      >
                        Desativar
                      </button>
                    </div>
                  </td>
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

export default Cardapio;
