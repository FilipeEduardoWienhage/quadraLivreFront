import { useEffect, useState } from 'react'

export const minutoDoDia = () => {
  const agora = new Date()
  return agora.getHours() * 60 + agora.getMinutes()
}

/** Minuto atual do dia (minutos desde 00:00), atualizado sozinho a cada 30 segundos. */
export function useMinutoAtual() {
  const [minuto, setMinuto] = useState(minutoDoDia)
  useEffect(() => {
    const id = setInterval(() => setMinuto(minutoDoDia()), 30_000)
    return () => clearInterval(id)
  }, [])
  return minuto
}
