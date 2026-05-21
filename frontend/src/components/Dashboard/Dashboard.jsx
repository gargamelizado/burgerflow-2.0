import { useEffect, useMemo, useState } from 'react';
import { listarItens } from '../../services/productService';
import { listarPedidos } from '../../services/orderService';
import { listarEstoque } from '../../services/stockService';
import {
  buscarCaixaAberto,
  listarMovimentosCaixa,
} from '../../services/cashService';
import './Dashboard.css';

const formatarMoeda = (valor) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0));

const formatarQuantidade = (valor) =>
  new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3,
  }).format(Number(valor || 0));

const dataLocal = (data) => {
  if (!data) {
    return '';
  }

  const parsed = new Date(data);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleDateString('pt-BR');
};

const normalizarTexto = (valor) => String(valor || '').toLowerCase();

const isAtivo = (item) => Boolean(Number(item?.ativo));

const apareceNoCardapio = (item) =>
  isAtivo(item) &&
  Boolean(Number(item?.aparece_cardapio)) &&
  item?.tipo !== 'INGREDIENTE';

const carregarResumoDashboard = async () => {
  const [itens, pedidos, estoque, caixaAbertoData, movimentosData] =
    await Promise.all([
      listarItens(),
      listarPedidos(),
      listarEstoque(),
      buscarCaixaAberto(),
      listarMovimentosCaixa(),
    ]);

  return {
    itens: Array.isArray(itens) ? itens : [],
    pedidos: Array.isArray(pedidos) ? pedidos : [],
    estoque: Array.isArray(estoque) ? estoque : [],
    caixaAberto: caixaAbertoData?.caixa || null,
    movimentos: Array.isArray(movimentosData?.movimentos)
      ? movimentosData.movimentos
      : [],
  };
};

const Dashboard = () => {
  const [dados, setDados] = useState({
    itens: [],
    pedidos: [],
    estoque: [],
    caixaAberto: null,
    movimentos: [],
  });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregarDashboard = async () => {
    setCarregando(true);

    try {
      const resumo = await carregarResumoDashboard();

      setDados(resumo);
      setErro('');
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    let ignorarResposta = false;

    carregarResumoDashboard()
      .then((resumo) => {
        if (!ignorarResposta) {
          setDados(resumo);
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
  }, []);

  const resumo = useMemo(() => {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const pedidosHoje = dados.pedidos.filter(
      (pedido) => dataLocal(pedido.criado_em) === hoje
    );
    const movimentosVenda = dados.movimentos.filter(
      (movimento) => movimento.tipo === 'venda'
    );
    const totalVendasCaixa = movimentosVenda.reduce(
      (total, movimento) => total + Number(movimento.valor || 0),
      0
    );
    const totalSuprimentos = dados.movimentos
      .filter((movimento) => movimento.tipo === 'suprimento')
      .reduce((total, movimento) => total + Number(movimento.valor || 0), 0);
    const totalSangrias = dados.movimentos
      .filter((movimento) => movimento.tipo === 'sangria')
      .reduce((total, movimento) => total + Number(movimento.valor || 0), 0);
    const valorInicial = Number(dados.caixaAberto?.valor_inicial || 0);
    const saldoEsperado =
      valorInicial + totalVendasCaixa + totalSuprimentos - totalSangrias;
    const itensCardapio = dados.itens.filter(apareceNoCardapio);
    const estoqueNegativo = dados.estoque
      .filter((ingrediente) => Number(ingrediente.quantidade_total_base || 0) < 0)
      .sort(
        (a, b) =>
          Number(a.quantidade_total_base || 0) -
          Number(b.quantidade_total_base || 0)
      );

    return {
      pedidosHoje,
      totalVendasCaixa,
      totalSuprimentos,
      totalSangrias,
      saldoEsperado,
      itensCardapio,
      estoqueNegativo,
      produtos: dados.itens.filter((item) => item.tipo === 'PRODUTO').length,
      combos: dados.itens.filter((item) => item.tipo === 'COMBO').length,
      promocoes: dados.itens.filter((item) => item.tipo === 'PROMOCAO').length,
      ingredientes: dados.itens.filter((item) => item.tipo === 'INGREDIENTE')
        .length,
      pedidosNovos: pedidosHoje.filter((pedido) => pedido.status === 'novo')
        .length,
      pedidosPreparo: pedidosHoje.filter(
        (pedido) => pedido.status === 'em_preparo'
      ).length,
      pedidosProntos: pedidosHoje.filter((pedido) => pedido.status === 'pronto')
        .length,
      pedidosEntregues: pedidosHoje.filter(
        (pedido) => pedido.status === 'entregue'
      ).length,
    };
  }, [dados]);

  const ultimosPedidos = resumo.pedidosHoje.slice(0, 4);

  return (
    <div className="dashboardPage">
      <header className="dashboardHeader">
        <div>
          <span className="dashboardEyebrow">Resumo operacional</span>
          <h1>Dashboard</h1>
          <p>Visão rápida do cardápio, estoque, pedidos e caixa.</p>
        </div>

        <button
          type="button"
          className="dashboardRefresh"
          onClick={carregarDashboard}
          disabled={carregando}
        >
          {carregando ? 'Atualizando...' : 'Atualizar'}
        </button>
      </header>

      {erro && <div className="dashboardError">{erro}</div>}

      <section className="dashboardCards" aria-label="Resumo principal">
        <article className="dashboardCard dashboardCardPedidos">
          <span>Pedidos de hoje</span>
          <strong>{resumo.pedidosHoje.length}</strong>
          <small>{resumo.pedidosNovos} novo(s)</small>
        </article>

        <article className="dashboardCard dashboardCardVendas">
          <span>Vendas no caixa</span>
          <strong>{formatarMoeda(resumo.totalVendasCaixa)}</strong>
          <small>
            {dados.caixaAberto ? 'Caixa aberto' : 'Nenhum caixa aberto'}
          </small>
        </article>

        <article className="dashboardCard dashboardCardItens">
          <span>Itens no cardápio</span>
          <strong>{resumo.itensCardapio.length}</strong>
          <small>Produtos, combos e promoções ativos</small>
        </article>

        <article className="dashboardCard dashboardCardEstoque">
          <span>Estoque negativo</span>
          <strong>{resumo.estoqueNegativo.length}</strong>
          <small>Ingredientes abaixo de zero</small>
        </article>
      </section>

      <section className="dashboardGrid">
        <article className="dashboardPanel">
          <div className="dashboardPanelHeader">
            <div>
              <h2>Caixa atual</h2>
              <p>Status e saldo esperado da operação.</p>
            </div>
            <span
              className={`dashboardStatus ${
                dados.caixaAberto ? 'statusAberto' : 'statusFechado'
              }`}
            >
              {dados.caixaAberto ? 'Aberto' : 'Fechado'}
            </span>
          </div>

          <div className="dashboardMoneyGrid">
            <div>
              <span>Inicial</span>
              <strong>{formatarMoeda(dados.caixaAberto?.valor_inicial)}</strong>
            </div>
            <div>
              <span>Suprimentos</span>
              <strong>{formatarMoeda(resumo.totalSuprimentos)}</strong>
            </div>
            <div>
              <span>Sangrias</span>
              <strong>{formatarMoeda(resumo.totalSangrias)}</strong>
            </div>
            <div>
              <span>Saldo esperado</span>
              <strong>{formatarMoeda(resumo.saldoEsperado)}</strong>
            </div>
          </div>
        </article>

        <article className="dashboardPanel">
          <div className="dashboardPanelHeader">
            <div>
              <h2>Pedidos</h2>
              <p>Andamento dos pedidos criados hoje.</p>
            </div>
          </div>

          <div className="dashboardStatusGrid">
            <span>
              Novo <strong>{resumo.pedidosNovos}</strong>
            </span>
            <span>
              Em preparo <strong>{resumo.pedidosPreparo}</strong>
            </span>
            <span>
              Pronto <strong>{resumo.pedidosProntos}</strong>
            </span>
            <span>
              Entregue <strong>{resumo.pedidosEntregues}</strong>
            </span>
          </div>
        </article>

        <article className="dashboardPanel">
          <div className="dashboardPanelHeader">
            <div>
              <h2>Cardápio</h2>
              <p>Distribuição dos itens cadastrados.</p>
            </div>
          </div>

          <div className="dashboardTypeList">
            <span>
              Ingredientes <strong>{resumo.ingredientes}</strong>
            </span>
            <span>
              Produtos <strong>{resumo.produtos}</strong>
            </span>
            <span>
              Combos <strong>{resumo.combos}</strong>
            </span>
            <span>
              Promoções <strong>{resumo.promocoes}</strong>
            </span>
          </div>
        </article>

        <article className="dashboardPanel">
          <div className="dashboardPanelHeader">
            <div>
              <h2>Atenção</h2>
              <p>Ingredientes que precisam de reposição.</p>
            </div>
          </div>

          {resumo.estoqueNegativo.length > 0 ? (
            <div className="dashboardNegativeList">
              {resumo.estoqueNegativo.slice(0, 5).map((ingrediente) => (
                <div key={ingrediente.id}>
                  <span>{ingrediente.nome}</span>
                  <strong>
                    {formatarQuantidade(ingrediente.quantidade_total_base)}{' '}
                    {ingrediente.unidade_base}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboardEmptyState">Sem estoque negativo.</div>
          )}
        </article>
      </section>

      <section className="dashboardPanel dashboardRecentPanel">
        <div className="dashboardPanelHeader">
          <div>
            <h2>Últimos pedidos de hoje</h2>
            <p>Pedidos recentes registrados no PDV.</p>
          </div>
        </div>

        {ultimosPedidos.length > 0 ? (
          <div className="dashboardRecentList">
            {ultimosPedidos.map((pedido) => (
              <div key={pedido.id} className="dashboardRecentItem">
                <div>
                  <strong>Pedido #{pedido.numero}</strong>
                  <span>{pedido.cliente_nome || 'Cliente balcão'}</span>
                </div>
                <span className="dashboardRecentStatus">
                  {normalizarTexto(pedido.status).replace('_', ' ')}
                </span>
                <strong>{formatarMoeda(pedido.total)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboardEmptyState">
            Nenhum pedido registrado hoje.
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
