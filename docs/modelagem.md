# Modelagem do banco — QuadraLivre

Sistema de gestão de uma academia de tênis: aulas (avulsas, pacotes e mensalidades,
particulares e em turma) e locação de quadras. Acesso apenas da administração.

Convenção: `campo_sufixo`, onde o sufixo identifica a tabela (ex.: `nome_pes`).
Campos marcados com **(enum)** são valores fixos que o código usa nas regras;
ficam como enum no Java e como union de strings no TypeScript, não como tabela.

## Acesso

### usuarios
Login da administração (separado de `pessoas`).

| campo | tipo | obs |
|---|---|---|
| codigo_usu | PK | |
| nome_usu | texto | |
| login_usu | texto | único |
| senha_usu | texto | hash (BCrypt), nunca a senha em texto |
| ativo_usu | booleano | |

## Cadastros

### tipos_pessoa
(antiga `tipos_usuario`) Ex.: Aluno, Professor, Cliente (só aluga quadra).

| campo | tipo |
|---|---|
| codigo_tpe | PK |
| descri_tpe | texto |

### pessoas

| campo | tipo | obs |
|---|---|---|
| codigo_pes | PK | |
| codtpe_pes | FK tipos_pessoa | |
| nome_pes | texto | |
| email_pes | texto | |
| telefone_pes | texto | |
| cpf_pes | texto | único |
| data_nasc_pes | data | |
| nivel_pes | **(enum)** | INICIANTE, INTERMEDIARIO, AVANCADO — opcional, para alunos |
| observacao_pes | texto | |
| ativo_pes | booleano | |
| data_cadastro_pes | data/hora | |

### quadras

| campo | tipo | obs |
|---|---|---|
| codigo_qua | PK | |
| nome_qua | texto | |
| status_qua | **(enum)** | ATIVA, MANUTENCAO, INATIVA |

### precos_quadras
Preço da hora de locação por quadra, dia da semana e faixa de horário.

| campo | tipo | obs |
|---|---|---|
| codigo_prq | PK | |
| codqua_prq | FK quadras | |
| dia_semana_prq | inteiro | 0 = domingo … 6 = sábado |
| hora_inicio_prq | hora | |
| hora_fim_prq | hora | |
| valor_hora_prq | decimal | |

### servicos
Itens avulsos cobráveis: locação avulsa, aula particular avulsa, aula experimental,
aluguel de raquete, venda de bolinhas etc.

| campo | tipo |
|---|---|
| codigo_ser | PK |
| nome_ser | texto |
| valor_ser | decimal |
| ativo_ser | booleano |

### formas_pagamento

| campo | tipo |
|---|---|
| codigo_fpg | PK |
| descri_fpg | texto |
| ativo_fpg | booleano |

### disponibilidade_professores

| campo | tipo | obs |
|---|---|---|
| codigo_dsp | PK | |
| codpes_dsp | FK pessoas | professor |
| dia_semana_dsp | inteiro | 0 = domingo … 6 = sábado |
| hora_inicio_dsp | hora | |
| hora_fim_dsp | hora | |

## Planos (pacotes e mensalidades) — novo

### planos
O que a academia vende.

| campo | tipo | obs |
|---|---|---|
| codigo_pla | PK | |
| nome_pla | texto | ex.: "Pacote 10 aulas", "Mensal 2x/semana" |
| tipo_pla | **(enum)** | PACOTE, MENSAL |
| qtd_aulas_pla | inteiro | PACOTE: total de aulas; MENSAL: aulas por semana |
| validade_dias_pla | inteiro | PACOTE: prazo para usar as aulas |
| valor_pla | decimal | PACOTE: valor total; MENSAL: valor da mensalidade |
| ativo_pla | booleano | |

### contratos
Um aluno aderindo a um plano. Guarda cópia dos valores do plano no momento da venda,
para que mudar o plano depois não altere contratos antigos.

| campo | tipo | obs |
|---|---|---|
| codigo_con | PK | |
| codpes_con | FK pessoas | aluno |
| codpla_con | FK planos | |
| data_inicio_con | data | |
| data_fim_con | data | PACOTE: início + validade; MENSAL: vazio enquanto ativo |
| qtd_aulas_con | inteiro | copiado do plano |
| valor_con | decimal | copiado do plano (permite desconto) |
| dia_vencimento_con | inteiro | MENSAL: dia do mês da cobrança |
| status_con | **(enum)** | ATIVO, ENCERRADO, CANCELADO |

Aulas usadas de um pacote = quantidade de `participantes_agendamento` com
`codcon_par` = o contrato e presença diferente de "falta justificada" (regra a definir).

## Turmas — novo

### turmas
Aula em grupo com horário fixo semanal.

| campo | tipo | obs |
|---|---|---|
| codigo_tur | PK | |
| nome_tur | texto | ex.: "Intermediário terça/quinta 19h" |
| codpes_tur | FK pessoas | professor |
| codqua_tur | FK quadras | quadra padrão |
| nivel_tur | **(enum)** | mesmo enum de `nivel_pes` |
| capacidade_tur | inteiro | máximo de alunos |
| ativo_tur | booleano | |

### turmas_horarios

| campo | tipo |
|---|---|
| codigo_tho | PK |
| codtur_tho | FK turmas |
| dia_semana_tho | inteiro |
| hora_inicio_tho | hora |
| hora_fim_tho | hora |

### turmas_alunos
Composição da turma com histórico: entrar = novo registro; sair = preencher `data_saida_tal`.
Assim dá para adicionar e remover alunos a qualquer momento sem perder quem participou antes.

| campo | tipo | obs |
|---|---|---|
| codigo_tal | PK | |
| codtur_tal | FK turmas | |
| codpes_tal | FK pessoas | aluno |
| codcon_tal | FK contratos | opcional — contrato que paga essa participação |
| data_entrada_tal | data | |
| data_saida_tal | data | vazio = ainda está na turma |

## Agenda

### agendamentos
Cada ocupação de quadra em um horário: locação, aula particular ou encontro de turma.

| campo | tipo | obs |
|---|---|---|
| codigo_age | PK | |
| tipo_age | **(enum)** | LOCACAO, AULA_PARTICULAR, AULA_TURMA |
| codqua_age | FK quadras | |
| codpes_age | FK pessoas | responsável (quem alugou / aluno da particular); vazio em AULA_TURMA |
| codtur_age | FK turmas | só em AULA_TURMA |
| data_inicio_age | data/hora | |
| data_fim_age | data/hora | |
| status_age | **(enum)** | AGENDADO, REALIZADO, CANCELADO |
| observacao_age | texto | |

Regra: não pode haver dois agendamentos não cancelados na mesma quadra com horários sobrepostos
(validar no backend; no PostgreSQL dá para garantir com exclusion constraint).

Os encontros de turma são gerados a partir de `turmas_horarios` (ex.: para as próximas semanas),
e os participantes a partir de `turmas_alunos` ativos na data.

### participantes_agendamento

| campo | tipo | obs |
|---|---|---|
| codigo_par | PK | |
| codage_par | FK agendamentos | |
| codpes_par | FK pessoas | |
| papel_par | **(enum)** | ALUNO, PROFESSOR, JOGADOR (locação) |
| codcon_par | FK contratos | opcional — de qual pacote/mensalidade a aula é descontada |
| presenca_par | **(enum)** | PENDENTE, PRESENTE, FALTA, FALTA_JUSTIFICADA |

## Financeiro

### transacoes
Uma cobrança (com seus itens em `movimentos`).

| campo | tipo | obs |
|---|---|---|
| codigo_tra | PK | |
| codpes_tra | FK pessoas | quem paga |
| codfpg_tra | FK formas_pagamento | preenchido ao pagar |
| valtot_tra | decimal | soma dos movimentos |
| data_tra | data/hora | criação |
| data_vencimento_tra | data | |
| data_pagamento_tra | data/hora | |
| status_tra | **(enum)** | ABERTA, PAGA, CANCELADA |

### movimentos
Itens da transação. Cada item aponta para a origem da cobrança (no máximo uma).

| campo | tipo | obs |
|---|---|---|
| codigo_mov | PK | |
| codtra_mov | FK transacoes | |
| codser_mov | FK servicos | item avulso |
| codage_mov | FK agendamentos | locação / aula avulsa cobrada |
| codcon_mov | FK contratos | venda de pacote ou mensalidade |
| descri_mov | texto | ex.: "Mensalidade 10/2026" |
| quantidade_mov | decimal | |
| val_unit_mov | decimal | |
| valtot_mov | decimal | |

## Como cada tipo de aula/cobrança funciona

| situação | como fica |
|---|---|
| Locação de quadra | `agendamento` LOCACAO → `movimento` com `codage_mov`, valor por `precos_quadras` |
| Aula avulsa | `agendamento` AULA_PARTICULAR (ou aluno avulso numa turma) → `movimento` com `codage_mov` e `codser_mov` |
| Pacote de aulas | venda: `contrato` + `movimento` com `codcon_mov`; cada aula: `participante` com `codcon_par` (desconta do saldo) |
| Mensalidade | `contrato` MENSAL; todo mês gera `transacao` + `movimento` com `codcon_mov`; aulas com `codcon_par` |
| Turma | `turma` + `turmas_horarios` + `turmas_alunos` (entra/sai a qualquer momento); encontros viram `agendamentos` AULA_TURMA |

## Mudanças em relação ao desenho original

- `tipos_usuario` → `tipos_pessoa`; nova tabela `usuarios` para o login.
- `status_agendamentos` e `status_transacao` viram enums.
- `agendamentos`: + `tipo_age`, `codtur_age`, `observacao_age`.
- `participantes_agendamento`: + `codcon_par`, `presenca_par`.
- `precos_quadras`: + `dia_semana_prq`.
- `transacoes`: + `data_vencimento_tra`, `data_pagamento_tra`.
- `movimentos`: + `codage_mov`, `codcon_mov`.
- Novas: `planos`, `contratos`, `turmas`, `turmas_horarios`, `turmas_alunos`.
- Ainda não incluído (fase 2): bloqueios de quadra/professor (manutenção, férias), reposição de aulas.
