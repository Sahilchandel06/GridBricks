import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  id: string
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
}

export function Select({ id, label, value, options, onChange, disabled = false }: SelectProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <div className="field__control-wrap">
        <select
          className="field__control field__control--select"
          disabled={disabled}
          id={id}
          onChange={(event) => onChange(event.currentTarget.value)}
          value={value}
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown aria-hidden="true" className="field__chevron" />
      </div>
    </div>
  )
}
