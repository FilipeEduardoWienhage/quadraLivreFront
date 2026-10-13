/** Simula a rede; nos testes automatizados fica em zero para não deixá-los lentos. */
const LATENCIA_MS = import.meta.env.MODE === 'test' ? 0 : 250

const esperar = () => new Promise((resolve) => setTimeout(resolve, LATENCIA_MS))

/**
 * A API com a latência de uma requisição em cada método: uma vez por chamada da tela,
 * como no HTTP. As regras do "servidor" chamam umas às outras sem a latência, como
 * consultas internas ao banco.
 */
export function comLatencia<T extends object>(api: T): T {
  return Object.fromEntries(
    Object.entries(api).map(([nome, valor]) => [
      nome,
      typeof valor === 'function'
        ? async (...args: unknown[]) => {
            await esperar()
            return valor.apply(api, args)
          }
        : valor,
    ]),
  ) as T
}
