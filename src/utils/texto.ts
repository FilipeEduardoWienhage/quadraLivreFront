/** Minúsculas e sem acentos, para buscas: "José" e "jose" casam. */
function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** Verdadeiro se algum dos campos contém o termo (ignorando acentos e maiúsculas). */
export function contemTermo(termo: string, ...campos: (string | undefined)[]) {
  const alvo = normalizar(termo.trim())
  return !alvo || campos.some((c) => c !== undefined && normalizar(c).includes(alvo))
}
