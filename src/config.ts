// Constantes de interface. O que a academia configura (horário de funcionamento, feriados,
// cores) fica nas Configurações, salvas pela API.

/**
 * Fatia da grade da agenda, em minutos: só para visualizar e clicar em horários livres.
 * Agendamentos aceitam qualquer minuto (ex.: 21:22).
 */
export const INTERVALO_AGENDA_MIN = 30

/** Painel: quando um pacote entra em "terminando" (aulas restantes ou dias para vencer). */
export const PACOTE_AULAS_RESTANTES_ALERTA = 2
export const PACOTE_DIAS_VALIDADE_ALERTA = 14

/** Painel: até quantos dias atrás procurar aulas com presença não registrada. */
export const DIAS_PRESENCA_PENDENTE = 7
