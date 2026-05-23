import { useEffect, useMemo, useState } from 'react';
import {
  buscarCaixaAberto,
  abrirCaixa,
  fecharCaixa,
  listarMovimentosCaixa,
} from '../../services/cashService';
import {
  listarPedidos,
  corrigirStatusPedidoGerencial,
} from '../../services/orderService';
import { buscarRelatorioProdutosVendidos } from '../../services/reportService';
import {
  listarUsuarios,
  criarUsuario,
  atualizarUsuario,
  alterarSenhaUsuario,
  desativarUsuario,
} from '../../services/userService';
import { alterarMinhaSenha } from '../../services/authService';
import {
  obterUsuarioLogado,
  usuarioPodeAcessarGerencial,
} from '../../utils/auth';
import './Gerencial.css';

const secoes = [
  {
    id: 'caixa',
    titulo: 'Caixa Gerencial',
    descricao: 'Abrir, fechar e conferir caixa.',
    acao: 'Gerenciar caixa',
  },
  {
    id: 'pedidos',
    titulo: 'Pedidos',
    descricao: 'Acompanhar e corrigir pedidos.',
    acao: 'Ver pedidos',
  },
  {
    id: 'reimpressao',
    titulo: 'Reimpressão',
    descricao: 'Reimprimir comprovante de pedido.',
    acao: 'Reimprimir',
  },
  {
    id: 'relatorios',
    titulo: 'Produtos vendidos',
    descricao: 'Relatório de itens vendidos por período.',
    acao: 'Ver relatório',
  },
  {
    id: 'usuarios',
    titulo: 'Usuários',
    descricao: 'Cadastrar, desativar e alterar usuários.',
    acao: 'Gerenciar usuários',
  },
  {
    id: 'senha',
    titulo: 'Alterar senha',
    descricao: 'Atualizar senha de acesso.',
    acao: 'Alterar senha',
  },
];

const statusPedido = ['novo', 'em_preparo', 'pronto', 'entregue', 'cancelado'];
const niveisAcesso = ['admin', 'gerente', 'vendedor', 'estoquista', 'cozinha'];

const formatarMoeda = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const formatarDataHora = (valor) => {
  if (!valor) {
    return '-';
  }

  return new Date(valor).toLocaleString('pt-BR');
};

const hojeIso = () => new Date().toISOString().slice(0, 10);
const seteDiasAtrasIso = () => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
};

const normalizarValor = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Number(parsed.toFixed(2));
};

const Gerencial = () => {
  const usuario = useMemo(() => obterUsuarioLogado(), []);
  const isAdmin = String(usuario?.nivel_acesso || '').toLowerCase() === 'admin';
  const podeAcessar = usuarioPodeAcessarGerencial(usuario);

  const [secaoAtiva, setSecaoAtiva] = useState('caixa');
  const [erroGeral, setErroGeral] = useState('');
  const [popup, setPopup] = useState(null);

  const [dadosCaixa, setDadosCaixa] = useState({
    aberto: false,
    caixa: null,
    resumo: null,
    movimentos: [],
  });
  const [valorInicial, setValorInicial] = useState('');
  const [obsAbertura, setObsAbertura] = useState('');
  const [valorFinal, setValorFinal] = useState('');
  const [obsFechamento, setObsFechamento] = useState('');

  const [pedidos, setPedidos] = useState([]);
  const [statusSelecionado, setStatusSelecionado] = useState({});
  const [pedidoSelecionadoReimpressao, setPedidoSelecionadoReimpressao] = useState('');

  const dataInicioPadrao = useMemo(() => seteDiasAtrasIso(), []);
  const dataFimPadrao = useMemo(() => hojeIso(), []);
  const [dataInicio, setDataInicio] = useState(dataInicioPadrao);
  const [dataFim, setDataFim] = useState(dataFimPadrao);
  const [relatorio, setRelatorio] = useState({
    itens: [],
    resumo: { quantidade_total_itens: 0, valor_total_vendido: 0 },
  });

  const [usuarios, setUsuarios] = useState([]);
  const [novoUsuario, setNovoUsuario] = useState({
    nome: '',
    email: '',
    senha: '',
    nivel_acesso: 'vendedor',
    ativo: true,
  });
  const [senhaPorUsuario, setSenhaPorUsuario] = useState({});
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');

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

  const fecharPopup = () => setPopup(null);

  const confirmarPopup = async () => {
    const callback = popup?.onConfirm;
    fecharPopup();
    if (callback) {
      await callback();
    }
  };

  const carregarCaixa = async () => {
    try {
      const [abertoData, movimentosData] = await Promise.all([
        buscarCaixaAberto(),
        listarMovimentosCaixa(),
      ]);

      setDadosCaixa({
        aberto: Boolean(abertoData?.aberto),
        caixa: abertoData?.caixa || null,
        resumo: abertoData?.resumo || movimentosData?.resumo || null,
        movimentos: movimentosData?.movimentos || abertoData?.movimentos || [],
      });
      setErroGeral('');
    } catch (error) {
      setErroGeral(error.message);
    }
  };

  const carregarPedidos = async () => {
    try {
      const data = await listarPedidos();
      setPedidos(Array.isArray(data) ? data : []);
      setStatusSelecionado((prev) => {
        const next = { ...prev };
        (Array.isArray(data) ? data : []).forEach((pedido) => {
          if (!next[pedido.id]) {
            next[pedido.id] = pedido.status;
          }
        });
        return next;
      });
      setErroGeral('');
    } catch (error) {
      setErroGeral(error.message);
    }
  };

  const carregarUsuarios = async () => {
    try {
      const data = await listarUsuarios();
      setUsuarios(Array.isArray(data) ? data : []);
      setErroGeral('');
    } catch (error) {
      setErroGeral(error.message);
    }
  };

  const carregarRelatorio = async () => {
    try {
      const data = await buscarRelatorioProdutosVendidos({
        data_inicio: dataInicio,
        data_fim: dataFim,
      });
      setRelatorio({
        itens: data?.itens || [],
        resumo: data?.resumo || {
          quantidade_total_itens: 0,
          valor_total_vendido: 0,
        },
      });
      setErroGeral('');
    } catch (error) {
      setErroGeral(error.message);
    }
  };

  useEffect(() => {
    if (!podeAcessar) {
      return;
    }

    let ignorarResposta = false;

    Promise.all([
      buscarCaixaAberto(),
      listarMovimentosCaixa(),
      listarPedidos(),
      buscarRelatorioProdutosVendidos({
        data_inicio: dataInicioPadrao,
        data_fim: dataFimPadrao,
      }),
      listarUsuarios(),
    ])
      .then(([abertoData, movimentosData, pedidosData, relatorioData, usuariosData]) => {
        if (ignorarResposta) {
          return;
        }

        const pedidosNormalizados = Array.isArray(pedidosData) ? pedidosData : [];

        setDadosCaixa({
          aberto: Boolean(abertoData?.aberto),
          caixa: abertoData?.caixa || null,
          resumo: abertoData?.resumo || movimentosData?.resumo || null,
          movimentos: movimentosData?.movimentos || abertoData?.movimentos || [],
        });
        setPedidos(pedidosNormalizados);
        setStatusSelecionado((prev) => {
          const next = { ...prev };
          pedidosNormalizados.forEach((pedido) => {
            if (!next[pedido.id]) {
              next[pedido.id] = pedido.status;
            }
          });
          return next;
        });
        setRelatorio({
          itens: relatorioData?.itens || [],
          resumo: relatorioData?.resumo || {
            quantidade_total_itens: 0,
            valor_total_vendido: 0,
          },
        });
        setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
        setErroGeral('');
      })
      .catch((error) => {
        if (!ignorarResposta) {
          setErroGeral(error.message);
        }
      });

    return () => {
      ignorarResposta = true;
    };
  }, [podeAcessar, dataInicioPadrao, dataFimPadrao]);

  const handleAbrirCaixa = async (event) => {
    event.preventDefault();
    const valor = normalizarValor(valorInicial);

    if (valor === null || valor < 0) {
      abrirPopup({
        tipo: 'erro',
        titulo: 'Valor inicial inválido',
        mensagens: 'Informe um valor inicial válido.',
      });
      return;
    }

    try {
      await abrirCaixa({
        valor_inicial: valor,
        observacao: obsAbertura,
      });
      setValorInicial('');
      setObsAbertura('');
      await carregarCaixa();
      abrirPopup({
        tipo: 'sucesso',
        titulo: 'Caixa aberto',
        mensagens: 'Caixa aberto com sucesso.',
      });
    } catch (error) {
      setErroGeral(error.message);
      abrirPopup({
        tipo: 'erro',
        titulo: 'Erro ao abrir caixa',
        mensagens: error.message,
      });
    }
  };

  const executarFecharCaixa = async () => {
    const valor = normalizarValor(valorFinal);

    if (valor === null || valor < 0) {
      abrirPopup({
        tipo: 'erro',
        titulo: 'Valor final inválido',
        mensagens: 'Informe um valor final válido.',
      });
      return;
    }

    try {
      const result = await fecharCaixa({
        valor_final: valor,
        observacao: obsFechamento,
      });
      setValorFinal('');
      setObsFechamento('');
      await carregarCaixa();
      abrirPopup({
        tipo: 'sucesso',
        titulo: 'Caixa fechado com sucesso',
        mensagens: [
          `Valor esperado: ${formatarMoeda(result?.resumo?.valor_esperado)}`,
          `Valor informado: ${formatarMoeda(result?.resumo?.valor_final)}`,
          `Diferença: ${formatarMoeda(result?.resumo?.diferenca)}`,
          result?.resultado?.mensagem || 'Fechamento concluído.',
        ],
      });
    } catch (error) {
      setErroGeral(error.message);
      abrirPopup({
        tipo: 'erro',
        titulo: 'Erro ao fechar caixa',
        mensagens: error.message,
      });
    }
  };

  const handleFecharCaixa = async (event) => {
    event.preventDefault();

    abrirPopup({
      tipo: 'confirmacao',
      titulo: 'Fechar caixa',
      mensagens: 'Deseja fechar o caixa com os valores informados?',
      textoConfirmar: 'Fechar caixa',
      textoCancelar: 'Cancelar',
      onConfirm: executarFecharCaixa,
    });
  };

  const handleCorrigirStatusPedido = async (pedido) => {
    const novoStatus = statusSelecionado[pedido.id] || pedido.status;

    try {
      await corrigirStatusPedidoGerencial(pedido.id, novoStatus);
      await carregarPedidos();
      abrirPopup({
        tipo: 'sucesso',
        titulo: 'Status corrigido',
        mensagens: `Pedido #${pedido.numero} atualizado para ${novoStatus.replace(
          '_',
          ' '
        )}.`,
      });
    } catch (error) {
      setErroGeral(error.message);
      abrirPopup({
        tipo: 'erro',
        titulo: 'Erro ao corrigir status',
        mensagens: error.message,
      });
    }
  };

  const handleCriarUsuario = async (event) => {
    event.preventDefault();

    try {
      await criarUsuario(novoUsuario);
      setNovoUsuario({
        nome: '',
        email: '',
        senha: '',
        nivel_acesso: 'vendedor',
        ativo: true,
      });
      await carregarUsuarios();
      abrirPopup({
        tipo: 'sucesso',
        titulo: 'Usuário criado',
        mensagens: 'Usuário cadastrado com sucesso.',
      });
    } catch (error) {
      setErroGeral(error.message);
      abrirPopup({
        tipo: 'erro',
        titulo: 'Erro ao criar usuário',
        mensagens: error.message,
      });
    }
  };

  const handleAtualizarUsuario = async (usuarioEditado) => {
    try {
      await atualizarUsuario(usuarioEditado.id, {
        nome: usuarioEditado.nome,
        email: usuarioEditado.email,
        nivel_acesso: usuarioEditado.nivel_acesso,
        ativo: usuarioEditado.ativo,
      });
      await carregarUsuarios();
      abrirPopup({
        tipo: 'sucesso',
        titulo: 'Usuário atualizado',
        mensagens: `Dados de ${usuarioEditado.nome} atualizados.`,
      });
    } catch (error) {
      setErroGeral(error.message);
      abrirPopup({
        tipo: 'erro',
        titulo: 'Erro ao atualizar usuário',
        mensagens: error.message,
      });
    }
  };

  const handleDesativarUsuario = async (usuarioItem) => {
    abrirPopup({
      tipo: 'confirmacao',
      titulo: 'Desativar usuário',
      mensagens: `Deseja desativar ${usuarioItem.nome}?`,
      textoConfirmar: 'Desativar',
      textoCancelar: 'Cancelar',
      onConfirm: async () => {
        try {
          await desativarUsuario(usuarioItem.id);
          await carregarUsuarios();
          abrirPopup({
            tipo: 'sucesso',
            titulo: 'Usuário desativado',
            mensagens: `${usuarioItem.nome} foi desativado.`,
          });
        } catch (error) {
          setErroGeral(error.message);
          abrirPopup({
            tipo: 'erro',
            titulo: 'Erro ao desativar usuário',
            mensagens: error.message,
          });
        }
      },
    });
  };

  const handleAlterarSenhaUsuario = async (usuarioItem) => {
    const senha = String(senhaPorUsuario[usuarioItem.id] || '');

    try {
      await alterarSenhaUsuario(usuarioItem.id, senha);
      setSenhaPorUsuario((prev) => ({
        ...prev,
        [usuarioItem.id]: '',
      }));
      abrirPopup({
        tipo: 'sucesso',
        titulo: 'Senha alterada',
        mensagens: `Senha de ${usuarioItem.nome} atualizada.`,
      });
    } catch (error) {
      setErroGeral(error.message);
      abrirPopup({
        tipo: 'erro',
        titulo: 'Erro ao alterar senha',
        mensagens: error.message,
      });
    }
  };

  const handleAlterarMinhaSenha = async (event) => {
    event.preventDefault();

    if (novaSenha.length < 6) {
      abrirPopup({
        tipo: 'erro',
        titulo: 'Nova senha inválida',
        mensagens: 'Nova senha deve ter no mínimo 6 caracteres.',
      });
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      abrirPopup({
        tipo: 'erro',
        titulo: 'Confirmação inválida',
        mensagens: 'A confirmação da nova senha não confere.',
      });
      return;
    }

    try {
      await alterarMinhaSenha({
        senha_atual: senhaAtual,
        nova_senha: novaSenha,
      });
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarNovaSenha('');
      abrirPopup({
        tipo: 'sucesso',
        titulo: 'Senha atualizada',
        mensagens: 'Sua senha foi alterada com sucesso.',
      });
    } catch (error) {
      setErroGeral(error.message);
      abrirPopup({
        tipo: 'erro',
        titulo: 'Erro ao alterar senha',
        mensagens: error.message,
      });
    }
  };

  const pedidoSelecionado = useMemo(() => {
    const id = Number(pedidoSelecionadoReimpressao);
    if (!id) {
      return null;
    }
    return pedidos.find((pedido) => Number(pedido.id) === id) || null;
  }, [pedidoSelecionadoReimpressao, pedidos]);

  if (!podeAcessar) {
    return (
      <div className="gerencialPage">
        <header className="gerencialHeader">
          <h1>Menu Gerencial</h1>
          <p>Controle administrativo do BurgerFlow 2.0.</p>
        </header>

        <section className="gerencialRestrito">
          <h2>Acesso restrito</h2>
          <p>Seu perfil não possui permissão para acessar esta área.</p>
        </section>
      </div>
    );
  }

  const resumo = dadosCaixa.resumo || {
    valor_inicial: 0,
    total_vendas: 0,
    total_suprimentos: 0,
    total_sangrias: 0,
    total_despesas: 0,
    valor_esperado: 0,
  };
  const caixaAberto = Boolean(dadosCaixa.aberto && dadosCaixa.caixa);

  return (
    <div className="gerencialPage">
      <header className="gerencialHeader">
        <h1>Menu Gerencial</h1>
        <p>Controle administrativo do BurgerFlow 2.0.</p>
      </header>

      {erroGeral && <p className="gerencialError">{erroGeral}</p>}

      <section className="gerencialCards">
        {secoes.map((secao) => (
          <article key={secao.id} className="gerencialCard">
            <h3>{secao.titulo}</h3>
            <p>{secao.descricao}</p>
            <button
              type="button"
              className="btnAbrirSecao"
              onClick={() => setSecaoAtiva(secao.id)}
            >
              {secao.acao}
            </button>
          </article>
        ))}
      </section>

      <section className="gerencialSection">
        {secaoAtiva === 'caixa' && (
          <>
            <div className="gerencialSectionHeader">
              <h2>Caixa Gerencial</h2>
              <button type="button" className="btnSecundario" onClick={carregarCaixa}>
                Atualizar
              </button>
            </div>

            <div className="gerencialResumoGrid">
              <div>
                <span>Status</span>
                <strong>{caixaAberto ? 'Aberto' : 'Fechado'}</strong>
              </div>
              <div>
                <span>ID do caixa</span>
                <strong>{dadosCaixa.caixa?.id || '-'}</strong>
              </div>
              <div>
                <span>Aberto em</span>
                <strong>{formatarDataHora(dadosCaixa.caixa?.aberto_em)}</strong>
              </div>
              <div>
                <span>Valor inicial</span>
                <strong>{formatarMoeda(resumo.valor_inicial)}</strong>
              </div>
              <div>
                <span>Total de vendas</span>
                <strong>{formatarMoeda(resumo.total_vendas)}</strong>
              </div>
              <div>
                <span>Suprimentos</span>
                <strong>{formatarMoeda(resumo.total_suprimentos)}</strong>
              </div>
              <div>
                <span>Sangrias</span>
                <strong>{formatarMoeda(resumo.total_sangrias)}</strong>
              </div>
              <div>
                <span>Despesas</span>
                <strong>{formatarMoeda(resumo.total_despesas)}</strong>
              </div>
              <div>
                <span>Valor esperado</span>
                <strong>{formatarMoeda(resumo.valor_esperado)}</strong>
              </div>
              <div>
                <span>Quanto tem no caixa</span>
                <strong>{formatarMoeda(resumo.valor_esperado)}</strong>
              </div>
            </div>

            {!caixaAberto ? (
              <form className="gerencialForm" onSubmit={handleAbrirCaixa}>
                <h3>Abrir caixa</h3>
                <input
                  type="number"
                  placeholder="Valor inicial"
                  value={valorInicial}
                  onChange={(event) => setValorInicial(event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Observação"
                  value={obsAbertura}
                  onChange={(event) => setObsAbertura(event.target.value)}
                />
                <button type="submit" className="btnPrimario">
                  Abrir caixa
                </button>
              </form>
            ) : (
              <form className="gerencialForm" onSubmit={handleFecharCaixa}>
                <h3>Fechar caixa</h3>
                <input
                  type="number"
                  placeholder="Valor final contado"
                  value={valorFinal}
                  onChange={(event) => setValorFinal(event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Observação"
                  value={obsFechamento}
                  onChange={(event) => setObsFechamento(event.target.value)}
                />
                <button type="submit" className="btnPerigo">
                  Fechar caixa
                </button>
              </form>
            )}

            <h3>Movimentos do caixa</h3>
            {dadosCaixa.movimentos.length === 0 ? (
              <p>Nenhuma movimentação encontrada.</p>
            ) : (
              <div className="gerencialTableWrap">
                <table className="gerencialTable">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Valor</th>
                      <th>Forma</th>
                      <th>Status pagto</th>
                      <th>Motivo</th>
                      <th>Data</th>
                      <th>Usuário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosCaixa.movimentos.map((mov) => (
                      <tr key={mov.id}>
                        <td>{mov.tipo}</td>
                        <td>{formatarMoeda(mov.valor)}</td>
                        <td>{mov.forma_pagamento || '-'}</td>
                        <td>{mov.status_pagamento || '-'}</td>
                        <td>{mov.motivo || '-'}</td>
                        <td>{formatarDataHora(mov.criado_em)}</td>
                        <td>{mov.usuario_nome || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {secaoAtiva === 'pedidos' && (
          <>
            <div className="gerencialSectionHeader">
              <h2>Pedidos Gerenciais</h2>
              <button type="button" className="btnSecundario" onClick={carregarPedidos}>
                Atualizar
              </button>
            </div>

            {pedidos.length === 0 ? (
              <p>Nenhum pedido encontrado.</p>
            ) : (
              <div className="gerencialTableWrap">
                <table className="gerencialTable">
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th>Cliente</th>
                      <th>Status atual</th>
                      <th>Total</th>
                      <th>Itens</th>
                      <th>Corrigir status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.map((pedido) => (
                      <tr key={pedido.id}>
                        <td>{pedido.numero}</td>
                        <td>{pedido.cliente_nome || '-'}</td>
                        <td>{String(pedido.status || '').replace('_', ' ')}</td>
                        <td>{formatarMoeda(pedido.total)}</td>
                        <td>
                          {(pedido.itens || [])
                            .map((item) => `${Number(item.quantidade)}x ${item.item_nome}`)
                            .join(', ') || '-'}
                        </td>
                        <td>
                          <div className="statusFix">
                            <select
                              value={statusSelecionado[pedido.id] || pedido.status}
                              onChange={(event) =>
                                setStatusSelecionado((prev) => ({
                                  ...prev,
                                  [pedido.id]: event.target.value,
                                }))
                              }
                            >
                              {statusPedido.map((status) => (
                                <option key={status} value={status}>
                                  {status.replace('_', ' ')}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btnSecundario"
                              onClick={() => handleCorrigirStatusPedido(pedido)}
                            >
                              Corrigir status do pedido
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {secaoAtiva === 'reimpressao' && (
          <>
            <h2>Reimprimir comprovante</h2>
            <p>Comprovante sem valor fiscal.</p>

            <div className="gerencialRow">
              <select
                value={pedidoSelecionadoReimpressao}
                onChange={(event) => setPedidoSelecionadoReimpressao(event.target.value)}
              >
                <option value="">Selecione um pedido</option>
                {pedidos.map((pedido) => (
                  <option key={pedido.id} value={pedido.id}>
                    Pedido #{pedido.numero} - {pedido.cliente_nome || 'Cliente'}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="btnPrimario"
                disabled={!pedidoSelecionado}
                onClick={() => window.print()}
              >
                Reimprimir
              </button>
            </div>

            <div className="cupomPreview printArea">
              {pedidoSelecionado ? (
                <>
                  <h3>BurgerFlow</h3>
                  <p>Comprovante sem valor fiscal</p>
                  <p>Pedido #{pedidoSelecionado.numero}</p>
                  <p>Data/Hora: {formatarDataHora(pedidoSelecionado.criado_em)}</p>
                  <p>Operador: {usuario?.nome || '-'}</p>
                  <p>Forma de pagamento: {pedidoSelecionado.forma_pagamento || '-'}</p>

                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qtd</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(pedidoSelecionado.itens || []).map((item) => (
                        <tr key={`${pedidoSelecionado.id}-${item.id}`}>
                          <td>{item.item_nome}</td>
                          <td>{Number(item.quantidade)}</td>
                          <td>{formatarMoeda(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <strong>Total: {formatarMoeda(pedidoSelecionado.total)}</strong>
                </>
              ) : (
                <p>Selecione um pedido para visualizar o comprovante.</p>
              )}
            </div>
          </>
        )}

        {secaoAtiva === 'relatorios' && (
          <>
            <h2>Relatório de produtos vendidos</h2>
            <form
              className="gerencialFormInline"
              onSubmit={(event) => {
                event.preventDefault();
                carregarRelatorio();
              }}
            >
              <input
                type="date"
                value={dataInicio}
                onChange={(event) => setDataInicio(event.target.value)}
              />
              <input
                type="date"
                value={dataFim}
                onChange={(event) => setDataFim(event.target.value)}
              />
              <button type="submit" className="btnPrimario">
                Buscar
              </button>
            </form>

            <div className="gerencialResumoInline">
              <p>
                <strong>Quantidade total:</strong>{' '}
                {Number(relatorio.resumo.quantidade_total_itens || 0).toLocaleString('pt-BR')}
              </p>
              <p>
                <strong>Valor total:</strong>{' '}
                {formatarMoeda(relatorio.resumo.valor_total_vendido)}
              </p>
            </div>

            {relatorio.itens.length === 0 ? (
              <p>Nenhum item vendido no período informado.</p>
            ) : (
              <div className="gerencialTableWrap">
                <table className="gerencialTable">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Tipo</th>
                      <th>Quantidade vendida</th>
                      <th>Total vendido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.itens.map((item) => (
                      <tr key={`${item.item_id}-${item.nome}`}>
                        <td>{item.nome}</td>
                        <td>{item.tipo}</td>
                        <td>{Number(item.quantidade_vendida).toLocaleString('pt-BR')}</td>
                        <td>{formatarMoeda(item.total_vendido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {secaoAtiva === 'usuarios' && (
          <>
            <h2>Gerenciar usuários</h2>
            {isAdmin ? (
              <form className="gerencialFormInline" onSubmit={handleCriarUsuario}>
                <input
                  type="text"
                  placeholder="Nome"
                  value={novoUsuario.nome}
                  onChange={(event) =>
                    setNovoUsuario((prev) => ({
                      ...prev,
                      nome: event.target.value,
                    }))
                  }
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={novoUsuario.email}
                  onChange={(event) =>
                    setNovoUsuario((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={novoUsuario.senha}
                  onChange={(event) =>
                    setNovoUsuario((prev) => ({
                      ...prev,
                      senha: event.target.value,
                    }))
                  }
                />
                <select
                  value={novoUsuario.nivel_acesso}
                  onChange={(event) =>
                    setNovoUsuario((prev) => ({
                      ...prev,
                      nivel_acesso: event.target.value,
                    }))
                  }
                >
                  {niveisAcesso.map((nivel) => (
                    <option key={nivel} value={nivel}>
                      {nivel}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btnPrimario">
                  Cadastrar usuário
                </button>
              </form>
            ) : (
              <p>Cadastro e desativação de usuários disponíveis apenas para admin.</p>
            )}

            {usuarios.length === 0 ? (
              <p>Nenhum usuário encontrado.</p>
            ) : (
              <div className="gerencialTableWrap">
                <table className="gerencialTable">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Nível</th>
                      <th>Ativo</th>
                      <th>Salvar</th>
                      <th>Senha</th>
                      <th>Desativar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((usuarioItem) => (
                      <tr key={usuarioItem.id}>
                        <td>
                          <input
                            type="text"
                            value={usuarioItem.nome}
                            onChange={(event) =>
                              setUsuarios((prev) =>
                                prev.map((row) =>
                                  row.id === usuarioItem.id
                                    ? { ...row, nome: event.target.value }
                                    : row
                                )
                              )
                            }
                            disabled={!isAdmin}
                          />
                        </td>
                        <td>
                          <input
                            type="email"
                            value={usuarioItem.email}
                            onChange={(event) =>
                              setUsuarios((prev) =>
                                prev.map((row) =>
                                  row.id === usuarioItem.id
                                    ? { ...row, email: event.target.value }
                                    : row
                                )
                              )
                            }
                            disabled={!isAdmin}
                          />
                        </td>
                        <td>
                          <select
                            value={usuarioItem.nivel_acesso}
                            onChange={(event) =>
                              setUsuarios((prev) =>
                                prev.map((row) =>
                                  row.id === usuarioItem.id
                                    ? { ...row, nivel_acesso: event.target.value }
                                    : row
                                )
                              )
                            }
                            disabled={!isAdmin}
                          >
                            {niveisAcesso.map((nivel) => (
                              <option key={nivel} value={nivel}>
                                {nivel}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={usuarioItem.ativo ? 'true' : 'false'}
                            onChange={(event) =>
                              setUsuarios((prev) =>
                                prev.map((row) =>
                                  row.id === usuarioItem.id
                                    ? { ...row, ativo: event.target.value === 'true' }
                                    : row
                                )
                              )
                            }
                            disabled={!isAdmin}
                          >
                            <option value="true">Ativo</option>
                            <option value="false">Inativo</option>
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btnSecundario"
                            disabled={!isAdmin}
                            onClick={() => handleAtualizarUsuario(usuarioItem)}
                          >
                            Salvar
                          </button>
                        </td>
                        <td>
                          <div className="senhaInline">
                            <input
                              type="password"
                              placeholder="Nova senha"
                              value={senhaPorUsuario[usuarioItem.id] || ''}
                              onChange={(event) =>
                                setSenhaPorUsuario((prev) => ({
                                  ...prev,
                                  [usuarioItem.id]: event.target.value,
                                }))
                              }
                              disabled={
                                !isAdmin &&
                                Number(usuario?.id) !== Number(usuarioItem.id)
                              }
                            />
                            <button
                              type="button"
                              className="btnSecundario"
                              disabled={
                                !isAdmin &&
                                Number(usuario?.id) !== Number(usuarioItem.id)
                              }
                              onClick={() => handleAlterarSenhaUsuario(usuarioItem)}
                            >
                              Alterar
                            </button>
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btnPerigo"
                            disabled={!isAdmin}
                            onClick={() => handleDesativarUsuario(usuarioItem)}
                          >
                            Desativar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {secaoAtiva === 'senha' && (
          <>
            <h2>Alterar minha senha</h2>
            <form className="gerencialForm" onSubmit={handleAlterarMinhaSenha}>
              <input
                type="password"
                placeholder="Senha atual"
                value={senhaAtual}
                onChange={(event) => setSenhaAtual(event.target.value)}
              />
              <input
                type="password"
                placeholder="Nova senha"
                value={novaSenha}
                onChange={(event) => setNovaSenha(event.target.value)}
              />
              <input
                type="password"
                placeholder="Confirmar nova senha"
                value={confirmarNovaSenha}
                onChange={(event) => setConfirmarNovaSenha(event.target.value)}
              />
              <button type="submit" className="btnPrimario">
                Alterar senha
              </button>
            </form>
          </>
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
                <button type="button" className="appPopupCancel" onClick={fecharPopup}>
                  {popup.textoCancelar}
                </button>
              )}
              <button type="button" className="appPopupConfirm" onClick={confirmarPopup}>
                {popup.textoConfirmar}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gerencial;
