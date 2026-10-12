/** Cópia rasa do objeto sem as chaves informadas. */
export function omitir<T extends object, K extends keyof T>(objeto: T, ...chaves: K[]): Omit<T, K> {
  const copia = { ...objeto }
  for (const chave of chaves) delete copia[chave]
  return copia
}
