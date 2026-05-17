import {
  getIdentificationPlaceholder,
  IDENTIFICATION_TYPE_LABELS,
  IDENTIFICATION_TYPES,
  sanitizeIdentificationValue,
  validateIdentification,
} from '../../utils/identification'

export function IdentificationFields({
  type,
  value,
  onTypeChange,
  onValueChange,
  error,
}) {
  const validationError = error || validateIdentification(type, value)

  const handleTypeChange = (event) => {
    const nextType = event.target.value
    onTypeChange(nextType)
    onValueChange(sanitizeIdentificationValue(nextType, value))
  }

  const handleValueChange = (event) => {
    onValueChange(sanitizeIdentificationValue(type, event.target.value))
  }

  return (
    <>
      <Field label="Tipo de identificación">
        <select value={type} onChange={handleTypeChange} className="input">
          <option value={IDENTIFICATION_TYPES.ECUADORIAN_ID}>
            {IDENTIFICATION_TYPE_LABELS[IDENTIFICATION_TYPES.ECUADORIAN_ID]}
          </option>
          <option value={IDENTIFICATION_TYPES.FOREIGN_DOCUMENT}>
            {IDENTIFICATION_TYPE_LABELS[IDENTIFICATION_TYPES.FOREIGN_DOCUMENT]}
          </option>
        </select>
      </Field>

      <Field label="Identificación">
        <input
          name="cedula"
          value={value}
          onChange={handleValueChange}
          required
          inputMode={
            type === IDENTIFICATION_TYPES.ECUADORIAN_ID ? 'numeric' : 'text'
          }
          maxLength={type === IDENTIFICATION_TYPES.ECUADORIAN_ID ? 10 : 20}
          placeholder={getIdentificationPlaceholder(type)}
          className={[
            'input',
            validationError ? 'border-rose-300 focus:border-rose-400' : '',
          ].join(' ')}
        />
        {value && !validationError ? (
          <p className="mt-1.5 text-xs font-medium text-emerald-700">
            Identificación válida.
          </p>
        ) : null}
        {validationError ? (
          <p className="mt-1.5 text-xs font-medium text-rose-700">
            {validationError}
          </p>
        ) : null}
      </Field>
    </>
  )
}

function Field({ label, children }) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}
