import { useEffect, useState } from 'react';
import {
  buscarCaixaAberto,
  abrirCaixa,
  fecharCaixa,
  registrarMovimentoCaixa,
  listarMovimentosCaixa,
} from '../../services/cashService';
import PDV from '../PDV/PDV';
import './Caixa.css';

const Caixa = () => {
  const [caixaAberto, setCaixaAberto] = useState(null);
  const [erro, setErro] = useState('');
  const [valorInicial, setValorInicial] = useState('');
  const [valorFinal, setValorFinal] = useState('');
  const [observacao, setObservacao] = useState('');
  const [tipoMovimento, setTipoMovimento] = useState('suprimento');
  const [valorMovimento, setValorMovimento] = useState('');
  const [motivoMovimento, setMotivoMovimento] = useState('');
  const [movimentos, setMovimentos] = useState([]);
  const carregarMovimentos = async () => {
    try {
      const data = await listarMovimentosCaixa();
      setMovimentos(data.movimentos || []);
    } catch (error) {
      setErro(error.message);
    }
  };
  const carregarCaixa = async () => {
    try {
      const data = await buscarCaixaAberto();
      setCaixaAberto(data);
      setErro('');
    } catch (error) {
      setErro(error.message);
    }
  };

  useEffect(() => {
    let ignorarResposta = false;

    buscarCaixaAberto()
      .then((data) => {
        if (!ignorarResposta) {
          setCaixaAberto(data);
          setErro('');
        }
      })
      .catch((error) => {
        if (!ignorarResposta) {
          setErro(error.message);
        }
      });

    listarMovimentosCaixa()
      .then((data) => {
        if (!ignorarResposta) {
          setMovimentos(data.movimentos || []);
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

  const handleAbrirCaixa = async (event) => {
    event.preventDefault();

    try {
      await abrirCaixa({
        valor_inicial: Number(valorInicial || 0),
        observacao,
      });

      setValorInicial('');
      setObservacao('');
      await carregarCaixa();
      await carregarMovimentos();

      alert('Caixa aberto com sucesso.');
    } catch (error) {
      setErro(error.message);
    }
  };

  const handleFecharCaixa = async (event) => {
    event.preventDefault();

    const confirmar = window.confirm('Deseja fechar o caixa?');

    if (!confirmar) {
      return;
    }

    try {
      await fecharCaixa({
        valor_final: Number(valorFinal || 0),
        observacao,
      });

      setValorFinal('');
      setObservacao('');
      await carregarCaixa();
      await carregarMovimentos();
      alert('Caixa fechado com sucesso.');
    } catch (error) {
      setErro(error.message);
    }
  };

  const existeCaixaAberto = caixaAberto?.aberto;
  const handleRegistrarMovimento = async (event) => {
    event.preventDefault();

    if (Number(valorMovimento || 0) <= 0) {
      alert('Informe um valor maior que zero.');
      return;
    }

    try {
      await registrarMovimentoCaixa({
        tipo: tipoMovimento,
        valor: Number(valorMovimento),
        motivo: motivoMovimento,
      });

      setValorMovimento('');
      setMotivoMovimento('');

      await carregarCaixa();
      await carregarMovimentos();

      alert('Movimentação registrada com sucesso.');
    } catch (error) {
      setErro(error.message);
    }
  };
  const totalSuprimentos = movimentos
    .filter((movimento) => movimento.tipo === 'suprimento')
    .reduce((total, movimento) => total + Number(movimento.valor || 0), 0);

  const totalSangrias = movimentos
    .filter((movimento) => movimento.tipo === 'sangria')
    .reduce((total, movimento) => total + Number(movimento.valor || 0), 0);

  const valorInicialCaixa = existeCaixaAberto
    ? Number(caixaAberto.caixa.valor_inicial || 0)
    : 0;

  const saldoEsperado = valorInicialCaixa + totalSuprimentos - totalSangrias;
  const diferencaFechamento =
    valorFinal !== '' ? Number(valorFinal || 0) - saldoEsperado : 0;
  return (
    <div className="caixaPage">
      <header className="caixaHeader">
        <h1>Caixa</h1>
        <p>Abra, acompanhe e feche o caixa do Burger Flow.</p>
      </header>

      {erro && <p className="caixaError">{erro}</p>}

      <section className="caixaSection">
        <h2>Status do caixa</h2>

        {existeCaixaAberto ? (
          <div className="caixaInfo">
            <p>
              <strong>Status:</strong>{' '}
              <span className="caixaStatusAberto">Aberto</span>
            </p>
            <p>
              <strong>ID:</strong> {caixaAberto.caixa.id}
            </p>
            <p>
              <strong>Valor inicial:</strong> R${' '}
              {caixaAberto.caixa.valor_inicial}
            </p>
            <p>
              <strong>Aberto em:</strong>{' '}
              {new Date(caixaAberto.caixa.aberto_em).toLocaleString('pt-BR')}
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
              <strong>R$ {valorInicialCaixa.toFixed(2)}</strong>
            </div>

            <div className="caixaResumoCard">
              <span>Suprimentos</span>
              <strong>R$ {totalSuprimentos.toFixed(2)}</strong>
            </div>

            <div className="caixaResumoCard">
              <span>Sangrias</span>
              <strong>R$ {totalSangrias.toFixed(2)}</strong>
            </div>

            <div className="caixaResumoCard">
              <span>Saldo esperado</span>
              <strong>R$ {saldoEsperado.toFixed(2)}</strong>
            </div>
          </div>
        </section>
      )}
      {existeCaixaAberto && (
        <section className="caixaSection">
          <h2>PDV</h2>

          <PDV
            caixaAberto={caixaAberto.caixa}
            onVendaFinalizada={async () => {
              await carregarCaixa();
              await carregarMovimentos();
            }}
          />
        </section>
      )}
      {existeCaixaAberto && (
        <section className="caixaSection">
          <h2>Movimentação de caixa</h2>

          <form className="caixaForm" onSubmit={handleRegistrarMovimento}>
            <select
              value={tipoMovimento}
              onChange={(event) => setTipoMovimento(event.target.value)}
            >
              <option value="suprimento">Suprimento</option>
              <option value="sangria">Sangria</option>
            </select>

            <input
              type="number"
              placeholder="Valor"
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

          {movimentos.length === 0 ? (
            <p>Nenhuma movimentação registrada.</p>
          ) : (
            <table className="caixaTable">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Motivo</th>
                  <th>Data</th>
                </tr>
              </thead>

              <tbody>
                {movimentos.map((movimento) => (
                  <tr key={movimento.id}>
                    <td>{movimento.id}</td>
                    <td>{movimento.tipo}</td>
                    <td>R$ {movimento.valor}</td>
                    <td>{movimento.motivo}</td>
                    <td>
                      {new Date(movimento.criado_em).toLocaleString('pt-BR')}
                    </td>
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

          <form className="caixaForm" onSubmit={handleAbrirCaixa}>
            <input
              type="number"
              placeholder="Valor inicial"
              value={valorInicial}
              onChange={(event) => setValorInicial(event.target.value)}
            />

            <input
              type="text"
              placeholder="Observação"
              value={observacao}
              onChange={(event) => setObservacao(event.target.value)}
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

          <form className="caixaForm" onSubmit={handleFecharCaixa}>
            <input
              type="number"
              placeholder="Valor final"
              value={valorFinal}
              onChange={(event) => setValorFinal(event.target.value)}
            />

            <input
              type="text"
              placeholder="Observação"
              value={observacao}
              onChange={(event) => setObservacao(event.target.value)}
            />
            {valorFinal !== '' && (
              <div className="caixaDiferenca">
                <p>
                  <strong>Saldo esperado:</strong> R$ {saldoEsperado.toFixed(2)}
                </p>

                <p>
                  <strong>Valor final informado:</strong> R${' '}
                  {Number(valorFinal || 0).toFixed(2)}
                </p>

                <p>
                  <strong>Diferença:</strong>{' '}
                  <span
                    className={
                      diferencaFechamento === 0
                        ? 'diferencaZero'
                        : diferencaFechamento > 0
                          ? 'diferencaPositiva'
                          : 'diferencaNegativa'
                    }
                  >
                    R$ {diferencaFechamento.toFixed(2)}
                  </span>
                </p>
              </div>
            )}
            <button type="submit" className="btnFecharCaixa">
              Fechar caixa
            </button>
          </form>
        </section>
      )}
    </div>
  );
};

export default Caixa;
