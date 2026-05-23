import { useEffect, useState } from 'react';
import { buscarCaixaAberto, listarMovimentosCaixa } from '../../services/cashService';
import PDV from '../PDV/PDV';
import './Caixa.css';

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

const Caixa = () => {
  const [dadosCaixa, setDadosCaixa] = useState({
    aberto: false,
    caixa: null,
    resumo: null,
    movimentos: [],
  });
  const [erro, setErro] = useState('');
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


  const carregarDadosCaixa = async () => {
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
      setErro('');
    } catch (error) {
      setErro(error.message);
    }
  };

  useEffect(() => {
    let ignorarResposta = false;

    Promise.all([buscarCaixaAberto(), listarMovimentosCaixa()])
      .then(([abertoData, movimentosData]) => {
        if (ignorarResposta) {
          return;
        }

        setDadosCaixa({
          aberto: Boolean(abertoData?.aberto),
          caixa: abertoData?.caixa || null,
          resumo: abertoData?.resumo || movimentosData?.resumo || null,
          movimentos:
            movimentosData?.movimentos || abertoData?.movimentos || [],
        });
        setErro('');
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


  const existeCaixaAberto = Boolean(dadosCaixa.aberto && dadosCaixa.caixa);
  const resumo = dadosCaixa.resumo || {
    valor_inicial: 0,
    total_vendas: 0,
    total_suprimentos: 0,
    total_sangrias: 0,
    total_despesas: 0,
    valor_esperado: 0,
  };

  return (
    <div className="caixaPage">
      <header className="caixaHeader">
        <h1>Caixa</h1>
        <p>Abra, acompanhe e feche o caixa do Burger Flow.</p>
      </header>

      {erro && <p className="caixaError">{erro}</p>}

      <section className="caixaSection">
        <div className="caixaSectionHeader">
          <h2>Status do caixa</h2>
          <button type="button" className="btnAtualizarCaixa" onClick={carregarDadosCaixa}>
            Atualizar
          </button>
        </div>

        {existeCaixaAberto ? (
          <div className="caixaInfoGrid">
            <p>
              <strong>Status:</strong>{' '}
              <span className="caixaStatusAberto">Aberto</span>
            </p>
            <p>
              <strong>ID:</strong> {dadosCaixa.caixa.id}
            </p>
            <p>
              <strong>Usuário:</strong>{' '}
              {dadosCaixa.caixa.usuario_nome || `#${dadosCaixa.caixa.usuario_id || '-'}`}
            </p>
            <p>
              <strong>Aberto em:</strong> {formatarDataHora(dadosCaixa.caixa.aberto_em)}
            </p>
          </div>
        ) : (
          <p>
            <span className="caixaStatusFechado">Nenhum caixa aberto.</span>
          </p>
        )}
      </section>

      {existeCaixaAberto && (
        <section className="caixaSection">
          <h2>Resumo do caixa</h2>

          <div className="caixaResumo">
            <div className="caixaResumoCard">
              <span>Valor inicial</span>
              <strong>{formatarMoeda(resumo.valor_inicial)}</strong>
            </div>

            <div className="caixaResumoCard">
              <span>Total de vendas</span>
              <strong>{formatarMoeda(resumo.total_vendas)}</strong>
            </div>

            <div className="caixaResumoCard">
              <span>Vendas em dinheiro</span>
              <strong>{formatarMoeda(resumo.vendas_dinheiro)}</strong>
            </div>

            <div className="caixaResumoCard">
              <span>Vendas Pix</span>
              <strong>{formatarMoeda(resumo.vendas_pix)}</strong>
            </div>

            <div className="caixaResumoCard">
              <span>Cartão crédito</span>
              <strong>{formatarMoeda(resumo.vendas_cartao_credito)}</strong>
            </div>

            <div className="caixaResumoCard">
              <span>Cartão débito</span>
              <strong>{formatarMoeda(resumo.vendas_cartao_debito)}</strong>
            </div>

            <div className="caixaResumoCard">
              <span>Voucher</span>
              <strong>{formatarMoeda(resumo.vendas_voucher)}</strong>
            </div>

            <div className="caixaResumoCard">
              <span>Total de suprimentos</span>
              <strong>{formatarMoeda(resumo.total_suprimentos)}</strong>
            </div>

            <div className="caixaResumoCard">
              <span>Total de sangrias</span>
              <strong>{formatarMoeda(resumo.total_sangrias)}</strong>
            </div>

            <div className="caixaResumoCard">
              <span>Despesas</span>
              <strong>{formatarMoeda(resumo.total_despesas)}</strong>
            </div>

            <div className="caixaResumoCard caixaResumoEsperado">
              <span>Valor esperado</span>
              <strong>{formatarMoeda(resumo.valor_esperado)}</strong>
            </div>
          </div>
        </section>
      )}

      {existeCaixaAberto && (
        <section className="caixaSection">
          <h2>PDV</h2>

          <PDV
            caixaAberto={dadosCaixa.caixa}
            onVendaFinalizada={async () => {
              await carregarDadosCaixa();
            }}
          />
        </section>
      )}

      {existeCaixaAberto && (
        <section className="caixaSection">
          <h2>Histórico de movimentações</h2>

          {dadosCaixa.movimentos.length === 0 ? (
            <p>Nenhuma movimentação registrada.</p>
          ) : (
            <table className="caixaTable">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Motivo</th>
                  <th>Data</th>
                  <th>Usuário</th>
                </tr>
              </thead>

              <tbody>
                {dadosCaixa.movimentos.map((movimento) => (
                  <tr key={movimento.id}>
                    <td className="movimentoTipo">{movimento.tipo}</td>
                    <td>{formatarMoeda(movimento.valor)}</td>
                    <td>{movimento.motivo || '-'}</td>
                    <td>{formatarDataHora(movimento.criado_em)}</td>
                    <td>{movimento.usuario_nome || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

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

export default Caixa;
