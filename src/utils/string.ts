export const ensurePrefix = (str: string, prefix: string) => (str.startsWith(prefix) ? str : `${prefix}${str}`)
export const withoutSuffix = (str: string, suffix: string) =>
  str.endsWith(suffix) ? str.slice(0, -suffix.length) : str
export const withoutPrefix = (str: string, prefix: string) => (str.startsWith(prefix) ? str.slice(prefix.length) : str)

/** Igual que el servidor: sin espacios de más, primera letra en mayúscula y el resto en minúscula ("MATRIMONIAL" → "Matrimonial"). */
export const toCatalogName = (str: string) => {
  const name = str.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-PE')

  return name.charAt(0).toLocaleUpperCase('es-PE') + name.slice(1)
}

/** "Doble" y "DOBLE" son el mismo nombre para el servidor. */
export const sameCatalogName = (a: string, b: string) =>
  toCatalogName(a).toLocaleLowerCase('es-PE') === toCatalogName(b).toLocaleLowerCase('es-PE')
