// Dados iniciais do mock.
import type {
  Agendamento,
  CategoriaDespesa,
  Configuracoes,
  Contrato,
  DiaSemana,
  Espaco,
  FaixaPreco,
  FormaPagamento,
  Modalidade,
  Pessoa,
  Plano,
  Servico,
  Transacao,
  Turma,
  TurmaAluno,
} from '../../types/models'

export const pessoas: Pessoa[] = [
  { id: 1, aluno: false, professor: true, nome: 'Carlos Mendes', telefone: '(47) 99999-1001', email: 'carlos@exemplo.com', ativo: true, dataCadastro: '2026-01-10T09:00:00' },
  { id: 2, aluno: true, professor: true, nome: 'Juliana Rocha', telefone: '(47) 99999-1002', nivel: 'AVANCADO', ativo: true, dataCadastro: '2026-02-03T10:30:00' },
  { id: 3, aluno: true, professor: false, nome: 'Ana Souza', telefone: '(47) 98888-2001', nivel: 'INICIANTE', ativo: true, dataCadastro: '2026-03-15T18:00:00' },
  { id: 4, aluno: true, professor: false, nome: 'Bruno Lima', telefone: '(47) 98888-2002', nivel: 'INTERMEDIARIO', ativo: true, dataCadastro: '2026-04-02T19:15:00' },
  { id: 5, aluno: false, professor: false, nome: 'Marcos Pereira', telefone: '(47) 97777-3001', ativo: true, dataCadastro: '2026-05-20T08:45:00' },
  { id: 6, aluno: false, professor: true, nome: 'Rafael Costa', telefone: '(47) 99999-1003', observacao: 'Preparador físico da equipe de competição.', ativo: true, dataCadastro: '2026-06-01T08:00:00' },
]

/** Preço por hora de quadra: dia útil (diurno/noturno) e fim de semana. */
function precosQuadra(diurno: number, noturno: number, fimDeSemana: number): FaixaPreco[] {
  const diasUteis: DiaSemana[] = [1, 2, 3, 4, 5]
  return [
    ...diasUteis.flatMap((diaSemana) => [
      { diaSemana, horaInicio: '07:00', horaFim: '18:00', valor: diurno },
      { diaSemana, horaInicio: '18:00', horaFim: '23:00', valor: noturno },
    ]),
    { diaSemana: 6, horaInicio: '08:00', horaFim: '20:00', valor: fimDeSemana },
    { diaSemana: 0, horaInicio: '08:00', horaFim: '20:00', valor: fimDeSemana },
  ]
}

export const espacos: Espaco[] = [
  { id: 1, nome: 'Quadra 1', tipo: 'QUADRA', status: 'ATIVO', locacao: 'POR_HORA', precos: precosQuadra(80, 120, 100) },
  { id: 2, nome: 'Quadra 2', tipo: 'QUADRA', status: 'ATIVO', locacao: 'POR_HORA', precos: precosQuadra(80, 120, 100) },
  { id: 3, nome: 'Quadra 3', tipo: 'QUADRA', status: 'MANUTENCAO', locacao: 'POR_HORA', precos: precosQuadra(70, 100, 90) },
  { id: 4, nome: 'Sala de treino físico', tipo: 'OUTRO', status: 'ATIVO', locacao: 'NAO', precos: [] },
  {
    id: 5,
    nome: 'Churrasqueira',
    tipo: 'OUTRO',
    status: 'ATIVO',
    locacao: 'POR_PERIODO',
    precos: [
      { diaSemana: 6, horaInicio: '11:00', horaFim: '16:00', valor: 200 },
      { diaSemana: 6, horaInicio: '18:00', horaFim: '23:00', valor: 200 },
      { diaSemana: 0, horaInicio: '11:00', horaFim: '16:00', valor: 250 },
    ],
  },
]

export const modalidades: Modalidade[] = [
  { id: 1, nome: 'Tênis', cor: '#2f7d32', ativo: true },
  { id: 2, nome: 'Treino físico', cor: '#c05621', ativo: true },
]

export const configuracoes: Configuracoes = { corLocacao: '#1d5aa6' }

export const servicos: Servico[] = [
  { id: 1, nome: 'Locação avulsa (1h)', valor: 100, ativo: true },
  { id: 2, nome: 'Aula particular avulsa', valor: 150, ativo: true },
  { id: 3, nome: 'Aula experimental', valor: 0, ativo: true },
  { id: 4, nome: 'Aluguel de raquete', valor: 15, ativo: true },
]

export const formasPagamento: FormaPagamento[] = [
  { id: 1, descricao: 'Pix', ativo: true },
  { id: 2, descricao: 'Dinheiro', ativo: true },
  { id: 3, descricao: 'Cartão de crédito', ativo: true },
  { id: 4, descricao: 'Cartão de débito', ativo: true },
]

export const planos: Plano[] = [
  { id: 1, modalidadeId: 1, nome: 'Pacote 10 aulas tênis', tipo: 'PACOTE', qtdAulas: 10, validadeDias: 90, valor: 1200, ativo: true },
  { id: 2, modalidadeId: 1, nome: 'Tênis 1x por semana', tipo: 'MENSAL', qtdAulas: 1, valor: 380, ativo: true },
  { id: 3, modalidadeId: 1, nome: 'Tênis 2x por semana', tipo: 'MENSAL', qtdAulas: 2, valor: 680, ativo: true },
  { id: 4, modalidadeId: 1, nome: 'Tênis 3x por semana', tipo: 'MENSAL', qtdAulas: 3, valor: 940, ativo: true },
  { id: 5, modalidadeId: 2, nome: 'Físico 1x por semana', tipo: 'MENSAL', qtdAulas: 1, valor: 180, ativo: true },
  { id: 6, modalidadeId: 2, nome: 'Físico 2x por semana', tipo: 'MENSAL', qtdAulas: 2, valor: 330, ativo: true },
]

export const contratos: Contrato[] = [
  {
    id: 1,
    alunoId: 3,
    tipo: 'MENSAL',
    itens: [{ id: 1, planoId: 2, qtdAulas: 1, valor: 380 }],
    dataInicio: '2026-03-16',
    diaVencimento: 10,
    status: 'ATIVO',
  },
  {
    id: 2,
    alunoId: 4,
    tipo: 'PACOTE',
    itens: [{ id: 2, planoId: 1, qtdAulas: 10, valor: 1100 }],
    dataInicio: '2026-09-01',
    dataFim: '2026-11-30',
    status: 'ATIVO',
  },
  {
    id: 3,
    alunoId: 2,
    tipo: 'MENSAL',
    itens: [
      { id: 3, planoId: 4, qtdAulas: 3, valor: 940 },
      { id: 4, planoId: 5, qtdAulas: 1, valor: 150 },
    ],
    dataInicio: '2026-08-01',
    diaVencimento: 5,
    observacao: 'Equipe de competição: desconto no físico.',
    status: 'ATIVO',
  },
  {
    id: 4,
    alunoId: 2,
    tipo: 'PACOTE',
    itens: [{ id: 5, planoId: 1, qtdAulas: 10, valor: 1200 }],
    dataInicio: '2026-02-01',
    dataFim: '2026-05-02',
    status: 'ENCERRADO',
  },
]

export const turmas: Turma[] = [
  {
    id: 1,
    nome: 'Iniciante seg/qua 18h',
    modalidadeId: 1,
    professorId: 1,
    espacoId: 1,
    nivel: 'INICIANTE',
    capacidade: 6,
    ativo: true,
    horarios: [
      { diaSemana: 1, horaInicio: '18:00', horaFim: '19:00' },
      { diaSemana: 3, horaInicio: '18:00', horaFim: '19:00' },
    ],
  },
  {
    id: 2,
    nome: 'Intermediário ter/qui 19h',
    modalidadeId: 1,
    professorId: 2,
    espacoId: 2,
    nivel: 'INTERMEDIARIO',
    capacidade: 8,
    ativo: true,
    horarios: [
      { diaSemana: 2, horaInicio: '19:00', horaFim: '20:30' },
      { diaSemana: 4, horaInicio: '19:00', horaFim: '20:30' },
    ],
  },
]

export const turmasAlunos: TurmaAluno[] = [
  { id: 1, turmaId: 1, alunoId: 3, contratoItemId: 1, dataEntrada: '2026-03-16' },
  { id: 2, turmaId: 2, alunoId: 4, dataEntrada: '2026-04-07' },
]

export const categoriasDespesa: CategoriaDespesa[] = [
  { id: 1, nome: 'Aluguel', ativo: true },
  { id: 2, nome: 'Energia e água', ativo: true },
  { id: 3, nome: 'Salários e repasses', ativo: true },
  { id: 4, nome: 'Manutenção', ativo: true },
  { id: 5, nome: 'Material esportivo', ativo: true },
]

export const transacoes: Transacao[] = [
  {
    id: 1,
    tipo: 'RECEITA',
    pessoaId: 3,
    movimentos: [
      { id: 1, contratoItemId: 1, competencia: '2026-09', descricao: 'Tênis 1x por semana — 09/2026', quantidade: 1, valorUnitario: 380, valorTotal: 380 },
    ],
    valorTotal: 380,
    data: '2026-09-01T06:00:00',
    dataVencimento: '2026-09-10',
    formaPagamentoId: 1,
    dataPagamento: '2026-09-09',
    status: 'PAGA',
  },
  {
    id: 2,
    tipo: 'RECEITA',
    pessoaId: 3,
    movimentos: [
      { id: 2, contratoItemId: 1, competencia: '2026-10', descricao: 'Tênis 1x por semana — 10/2026', quantidade: 1, valorUnitario: 380, valorTotal: 380 },
    ],
    valorTotal: 380,
    data: '2026-10-01T06:00:00',
    dataVencimento: '2026-10-10',
    status: 'ABERTA',
  },
  {
    id: 3,
    tipo: 'RECEITA',
    pessoaId: 4,
    movimentos: [
      { id: 3, contratoItemId: 2, descricao: 'Pacote 10 aulas tênis', quantidade: 1, valorUnitario: 1100, valorTotal: 1100 },
    ],
    valorTotal: 1100,
    data: '2026-09-01T10:00:00',
    dataVencimento: '2026-09-01',
    formaPagamentoId: 2,
    dataPagamento: '2026-09-01',
    status: 'PAGA',
  },
  {
    id: 4,
    tipo: 'RECEITA',
    pessoaId: 2,
    movimentos: [
      { id: 4, contratoItemId: 3, competencia: '2026-10', descricao: 'Tênis 3x por semana — 10/2026', quantidade: 1, valorUnitario: 940, valorTotal: 940 },
      { id: 5, contratoItemId: 4, competencia: '2026-10', descricao: 'Físico 1x por semana — 10/2026', quantidade: 1, valorUnitario: 150, valorTotal: 150 },
    ],
    valorTotal: 1090,
    data: '2026-10-01T06:00:00',
    dataVencimento: '2026-10-05',
    formaPagamentoId: 3,
    dataPagamento: '2026-10-05',
    status: 'PAGA',
  },
  {
    id: 5,
    tipo: 'RECEITA',
    pessoaId: 5,
    movimentos: [
      { id: 6, servicoId: 4, descricao: 'Aluguel de raquete', quantidade: 2, valorUnitario: 15, valorTotal: 30 },
    ],
    valorTotal: 30,
    data: '2026-10-11T17:00:00',
    dataVencimento: '2026-10-15',
    status: 'ABERTA',
  },
  {
    id: 6,
    tipo: 'DESPESA',
    categoriaId: 1,
    movimentos: [{ id: 7, descricao: 'Aluguel do imóvel — 10/2026', quantidade: 1, valorUnitario: 4500, valorTotal: 4500 }],
    valorTotal: 4500,
    data: '2026-10-01T09:00:00',
    dataVencimento: '2026-10-10',
    formaPagamentoId: 1,
    dataPagamento: '2026-10-10',
    status: 'PAGA',
  },
  {
    id: 7,
    tipo: 'DESPESA',
    categoriaId: 3,
    pessoaId: 6,
    movimentos: [{ id: 8, descricao: 'Repasse treino físico — 09/2026', quantidade: 1, valorUnitario: 2000, valorTotal: 2000 }],
    valorTotal: 2000,
    data: '2026-10-01T09:00:00',
    dataVencimento: '2026-10-05',
    formaPagamentoId: 1,
    dataPagamento: '2026-10-05',
    status: 'PAGA',
  },
  {
    id: 8,
    tipo: 'DESPESA',
    categoriaId: 2,
    movimentos: [{ id: 9, descricao: 'Conta de energia — 10/2026', quantidade: 1, valorUnitario: 640, valorTotal: 640 }],
    valorTotal: 640,
    data: '2026-10-08T09:00:00',
    dataVencimento: '2026-10-20',
    status: 'ABERTA',
  },
  {
    id: 9,
    tipo: 'RECEITA',
    pessoaId: 5,
    movimentos: [
      { id: 10, agendamentoId: 1, descricao: 'Locação Quadra 1 — 12/10/2026 08:00–09:00', quantidade: 1, valorUnitario: 80, valorTotal: 80 },
    ],
    valorTotal: 80,
    data: '2026-10-10T15:00:00',
    dataVencimento: '2026-10-12',
    status: 'ABERTA',
  },
]

// os encontros de turma não estão aqui: o mock os gera ao abrir cada dia (ver mock/agenda.ts)
export const agendamentos: Agendamento[] = [
  {
    id: 1,
    tipo: 'LOCACAO',
    espacoId: 1,
    pessoaId: 5,
    dataInicio: '2026-10-12T08:00:00',
    dataFim: '2026-10-12T09:00:00',
    valor: 80,
    status: 'AGENDADO',
    participantes: [],
  },
  {
    id: 2,
    tipo: 'AULA',
    espacoId: 4,
    modalidadeId: 2,
    dataInicio: '2026-10-12T08:00:00',
    dataFim: '2026-10-12T09:00:00',
    status: 'AGENDADO',
    participantes: [
      { id: 1, pessoaId: 6, papel: 'PROFESSOR', presenca: 'PENDENTE' },
      { id: 2, pessoaId: 2, papel: 'ALUNO', contratoItemId: 4, presenca: 'PENDENTE' },
    ],
  },
  {
    id: 3,
    tipo: 'AULA',
    espacoId: 2,
    modalidadeId: 1,
    dataInicio: '2026-10-12T10:00:00',
    dataFim: '2026-10-12T11:00:00',
    status: 'AGENDADO',
    participantes: [
      { id: 3, pessoaId: 1, papel: 'PROFESSOR', presenca: 'PENDENTE' },
      { id: 4, pessoaId: 4, papel: 'ALUNO', contratoItemId: 2, presenca: 'PENDENTE' },
    ],
  },
]
