/** Después de un guardado fallido, lleva la vista al primer campo en rojo. */
export const scrollToFirstInvalid = (root?: ParentNode | null) => {
  window.setTimeout(() => {
    window.requestAnimationFrame(() => {
      const invalid = (root ?? document).querySelector<HTMLElement>('[aria-invalid="true"]')

      if (!invalid) {
        return
      }

      const field = invalid.closest<HTMLElement>('.MuiFormControl-root') ?? invalid

      field.style.scrollMarginTop = '96px'
      field.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, 0)
}
