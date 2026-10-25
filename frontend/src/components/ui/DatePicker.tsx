interface DatePickerProps {
  id: string
  label: string
  value: string
  min: string
  max: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function DatePicker({ id, label, value, min, max, onChange, disabled = false }: DatePickerProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <input
        className="field__control"
        disabled={disabled}
        id={id}
        max={max}
        min={min}
        onChange={(event) => onChange(event.currentTarget.value)}
        type="date"
        value={value}
      />
    </div>
  )
}
