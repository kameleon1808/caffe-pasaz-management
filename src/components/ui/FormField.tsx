/**
 * @file src/components/ui/FormField.tsx
 * @description Wrapper za labelu + input sa prikazom greške.
 *              Label + input wrapper with error display.
 *
 * @example
 * ```tsx
 * <FormField label="Naziv" error={errors.nameSr} required>
 *   <input className="field-input" {...register('nameSr')} />
 * </FormField>
 * ```
 */

import { ReactNode } from 'react'

export interface FormFieldProps {
  /** Tekst labele / Label text */
  label:     string
  /** Poruka greške / Error message */
  error?:    string
  /** Obavezno polje / Required field */
  required?: boolean
  /** Input ili drugi element / Input or other element */
  children:  ReactNode
  /** Hint tekst ispod inputa / Hint text below input */
  hint?:     string
}

/**
 * Polje forme sa labelom, greškom i hintom.
 * Form field with label, error, and hint.
 */
export function FormField({ label, error, required, children, hint }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-white/80">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>

      {children}

      {hint && !error && (
        <p className="text-xs text-white/40">{hint}</p>
      )}

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
