import { useEffect, useMemo, useState } from 'react';
import {
  buscarCaixaAberto,
  abrirCaixa,
  fecharCaixa,
  registrarMovimentoCaixa,
  listarMovimentosCaixa,
} from '../../services/cashService';
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

const normalizarValorMonetario = (valor) => {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return null;
  }

  return Number(numero.toFixed(2));
};

const getResultadoDiferenca = (diferenca) => {
  if (diferenca === 0) {
    return {
      tipo: 'diferencaZero',
      mensagem: 'Caixa conferido corretamente.',
    };
  }

  if (diferenca < 0) {
    return {
      tipo: 'diferencaNegativa',
      mensagem: `Faltou ${formatarMoeda(Math.abs(diferenca))}.`,
    };
  }

  return {
    tipo: 'diferencaPositiva',
    mensagem: `Sobrou ${formatarMoeda(diferenca)}.`,
  };
};

const Caixa = () => {
  const [dadosCaixa, setDadosCaixa] = useState({
    aberto: false,
    caixa: null,
    resumo: null,
    movimentos: [],
  });
  const [erro, setErro] = useState('');
  const [valorInicial, setValorInicial] = useState('');
  const [observacaoAbertura, setObservacaoAbertura] = useState('');
  const [valorFinal, setValorFinal] = useState('');
  const [observacaoFechamento, setObservacaoFechamento] = useState('');
  const [tipoMovimento, setTipoMovimento] = useState('suprimento');
  const [valorMovimento, setValorMovimento] = useState('');
  const [motivoMovimento, setMotivoMovimento] = useState('');
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

  const handleAbrirCaixa = async (event) => {
    event.preventDefault();
    const valorInicialNormalizado = normalizarValorMonetario(valorInicial);

    if (valorInicialNormalizado === null || valorInicialNormalizado < 0) {
      abrirPopup({
        tipo: 'erro',
        titulo: 'Valor inicial inválido',
        mensagens: 'Informe um valor inicial válido.',
      });
      return;
    }

    try {
      await abrirCaixa({
        valor_inicial: valorInicialNormalizado,
        observacao: observacaoAbertura,
      });

      setValorInicial('');
      setObservacaoAbertura('');
      await carregarDadosCaixa();
      abrirPopup({
        tipo: 'sucesso',
        titulo: 'Caixa aberto',
        mensagens: 'Caixa aberto com sucesso.',
      });
    } catch (error) {
      setErro(error.message);
      abrirPopup({
        tipo: 'erro',
        titulo: 'Erro ao abrir caixa',
        mensagens: error.message,
      });
    }
  };

  const executarFechamentoCaixa = async () => {
    const valorFinalNormalizado = normalizarValorMonetario(valorFinal);

    if (valorFinalNormalizado === null || valorFinalNormalizado < 0) {
      abrirPopup({
        tipo: 'erro',
        titulo: 'Valor final inválido',
        mensagens: 'Informe um valor final válido para o fechamento.',
      });
      return;
    }

    try {
      const resultado = await fecharCaixa({
        valor_final: valorFinalNormalizado,
        observacao: observacaoFechamento,
      });

      setValorFinal('');
      setObservacaoFechamento('');
      await carregarDadosCaixa();

      const resumo = resultado?.resumo || {};
      const diferenca = Number(resumo.diferenca || 0);
      const resultadoDiferenca = resultado?.resultado || getResultadoDiferenca(diferenca);

      abrirPopup({
        tipo: 'sucesso',
        titulo: 'Caixa fechado com sucesso',
        mensagens: [
          `Valor esperado: ${formatarMoeda(resumo.valor_esperado)}`,
          `Valor informado: ${formatarMoeda(resumo.valor_final)}`,
          `Diferença: ${formatarMoeda(diferenca)}`,
          resultadoDiferenca.mensagem,
        ],
      });
    } catch (error) {
      setErro(error.message);
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
      onConfirm: executarFechamentoCaixa,
    });
  };

  const handleRegistrarMovimento = async (event) => {
    event.preventDefault();
    const valorMovimentoNormalizado = normalizarValorMonetario(valorMovimento);

    if (valorMovimentoNormalizado === null || valorMovimentoNormalizado <= 0) {
      abrirPopup({
        tipo: 'erro',
        titulo: 'Valor inválido',
        mensagens: 'Informe um valor maior que zero.',
      });
      return;
    }

    try {
      await registrarMovimentoCaixa({
        tipo: tipoMovimento,
        valor: valorMovimentoNormalizado,
        motivo: motivoMovimento,
      });

      setValorMovimento('');
      setMotivoMovimento('');
      await carregarDadosCaixa();
      abrirPopup({
        tipo: 'sucesso',
        titulo: 'Movimentação registrada',
        mensagens: 'Movimentação registrada com sucesso.',
      });
    } catch (error) {
      setErro(error.message);
      abrirPopup({
        tipo: 'erro',
        titulo: 'Erro na movimentação',
        mensagens: error.message,
      });
    }
  };

  const existeCaixaAberto = Boolean(dadosCaixa.aberto && dadosCaixa.caixa);
  const resumo = dadosCaixa.resumo || {
    valor_inicial: 0,
    total_vendas: 0,
    total_suprimentos: 0,
    total_sangrias: 0,
    total_despesas: 0,
    valor_esperado: 0,
  };
  const valorFinalDigitado = normalizarValorMonetario(valorFinal);
  const diferencaPreview =
    valorFinalDigitado === null
      ? 0
      : Number((valorFinalDigitado - Number(resumo.valor_esperado || 0)).toFixed(2));
  const resultadoPreview = useMemo(
    () => getResultadoDiferenca(diferencaPreview),
    [diferencaPreview]
  );

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
          <h2>Movimentação de caixa</h2>

          <form className="caixaForm caixaFormMovimento" onSubmit={handleRegistrarMovimento}>
            <select
              value={tipoMovimento}
              onChange={(event) => setTipoMovimento(event.target.value)}
            >
              <option value="suprimento">Suprimento</option>
              <option value="sangria">Sangria</option>
            </select>

            <input
              type="number"
              placeholder="Valor do movimento"
              value={valorMovimento}
              onChange={(event) => setValorMovimento(event.target.value)}
            />

            <input
              type="text"
              placeholder="Motivo"
              value={motivoMovimento}
              onChange={(event) => setMotivoMovimento(event.target.value)}
            />

            <button type="submit" className="btnAbrirCaixa">
              Registrar
            </button>
          </form>
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

      {!existeCaixaAberto && (
        <section className="caixaSection">
          <h2>Abrir caixa</h2>

          <form className="caixaForm caixaFormAbertura" onSubmit={handleAbrirCaixa}>
            <input
              type="number"
              placeholder="Valor inicial"
              value={valorInicial}
              onChange={(event) => setValorInicial(event.target.value)}
            />

            <input
              type="text"
              placeholder="Observação de abertura"
              value={observacaoAbertura}
              onChange={(event) => setObservacaoAbertura(event.target.value)}
            />

            <button type="submit" className="btnAbrirCaixa">
              Abrir caixa
            </button>
          </form>
        </section>
      )}

      {existeCaixaAberto && (
        <section className="caixaSection">
          <h2>Fechar caixa</h2>

          <form className="caixaForm caixaFormFechamento" onSubmit={handleFecharCaixa}>
            <input
              type="number"
              placeholder="Valor final contado"
              value={valorFinal}
              onChange={(event) => setValorFinal(event.target.value)}
            />

            <input
              type="text"
              placeholder="Observação de fechamento"
              value={observacaoFechamento}
              onChange={(event) => setObservacaoFechamento(event.target.value)}
            />

            {valorFinal !== '' && (
              <div className="caixaDiferenca">
                <p>
                  <strong>Valor esperado:</strong> {formatarMoeda(resumo.valor_esperado)}
                </p>
                <p>
                  <strong>Valor informado:</strong>{' '}
                  {valorFinalDigitado === null ? 'Valor inválido' : formatarMoeda(valorFinalDigitado)}
                </p>
                <p>
                  <strong>Diferença:</strong>{' '}
                  <span className={resultadoPreview.tipo}>
                    {formatarMoeda(diferencaPreview)}
                  </span>
                </p>
                <p className={resultadoPreview.tipo}>{resultadoPreview.mensagem}</p>
              </div>
            )}

            <button type="submit" className="btnFecharCaixa">
              Fechar caixa
            </button>
          </form>
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
