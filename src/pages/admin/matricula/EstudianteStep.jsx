import { IdentificationFields } from '../../../components/forms/IdentificationFields'
import { validateIdentification } from '../../../utils/identification'

export function EstudianteStep({ form, onChange }) {
  const identificationError = validateIdentification(
    form.tipo_identificacion,
    form.cedula
  )

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Nombres">
        <input
          name="nombres"
          value={form.nombres}
          onChange={onChange}
          required
          className="input"
        />
      </Field>
      <Field label="Apellidos">
        <input
          name="apellidos"
          value={form.apellidos}
          onChange={onChange}
          required
          className="input"
        />
      </Field>
      <IdentificationFields
        type={form.tipo_identificacion}
        value={form.cedula}
        error={identificationError}
        onTypeChange={(value) =>
          onChange({
            target: { name: 'tipo_identificacion', value },
          })
        }
        onValueChange={(value) =>
          onChange({
            target: { name: 'cedula', value },
          })
        }
      />
      <Field label="Fecha de nacimiento">
        <input
          name="fecha_nacimiento"
          type="date"
          value={form.fecha_nacimiento}
          onChange={onChange}
          className="input"
        />
      </Field>
      <Field label="Genero">
        <select
          name="genero"
          value={form.genero}
          onChange={onChange}
          className="input"
        >
          <option value="">Selecciona</option>
          <option value="masculino">Masculino</option>
          <option value="femenino">Femenino</option>
          <option value="otro">Otro</option>
        </select>
      </Field>
      <Field label="Direccion" className="md:col-span-2">
        <textarea
          name="direccion"
          value={form.direccion}
          onChange={onChange}
          rows={3}
          className="input min-h-24"
        />
      </Field>
    </div>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}
