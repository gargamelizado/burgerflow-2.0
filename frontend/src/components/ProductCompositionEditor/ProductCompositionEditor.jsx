import './ProductCompositionEditor.css';

const unidadesPadrao = ['gr', 'kg', 'ml', 'li'];

const getOpcaoLabel = (opcao, variant) => {
  if (variant === 'ingredientes' && opcao.unidade_base) {
    return `${opcao.nome} (${opcao.unidade_base})`;
  }

  return opcao.nome;
};

export default function ProductCompositionEditor({
  title,
  variant,
  rows,
  options,
  units = unidadesPadrao,
  onUpdate,
  onAdd,
  onRemove,
}) {
  const isIngredientes = variant === 'ingredientes';
  const selectField = isIngredientes ? 'ingrediente_id' : 'produto_id';
  const quantityField = isIngredientes ? 'quantidade_usada' : 'quantidade';

  return (
    <fieldset className="formBlock fullWidth compositionEditor">
      <legend>{title}</legend>

      <div className="compositionEditorRows">
        {rows.map((row, index) => (
          <div
            className={
              isIngredientes
                ? 'compositionEditorRow compositionEditorRowIngredientes'
                : 'compositionEditorRow compositionEditorRowProdutos'
            }
            key={`${variant}-${index}`}
          >
            <select
              value={row[selectField]}
              aria-label={isIngredientes ? 'Ingrediente usado' : 'Produto do combo'}
              title={isIngredientes ? 'Ingrediente usado' : 'Produto do combo'}
              onChange={(event) =>
                onUpdate(index, selectField, event.target.value)
              }
              required
            >
              <option value="">{isIngredientes ? 'Ingrediente' : 'Produto'}</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {getOpcaoLabel(option, variant)}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={isIngredientes ? '0' : '1'}
              step={isIngredientes ? '0.001' : '1'}
              placeholder={isIngredientes ? 'Quantidade usada' : 'Quantidade'}
              value={row[quantityField]}
              onChange={(event) =>
                onUpdate(index, quantityField, event.target.value)
              }
              required
            />

            {isIngredientes && (
              <select
                value={row.unidade_usada}
                aria-label="Unidade usada"
                title="Unidade usada"
                onChange={(event) =>
                  onUpdate(index, 'unidade_usada', event.target.value)
                }
              >
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              className="btnRemoverLinha"
              onClick={() => onRemove(index)}
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="btnAdicionarLinha" onClick={onAdd}>
        {isIngredientes ? 'Adicionar ingrediente' : 'Adicionar produto'}
      </button>
    </fieldset>
  );
}
