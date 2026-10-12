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

### pessoas
Alunos, professores e clientes num cadastro só. Os papéis se acumulam: a mesma pessoa
pode ser aluna e professora. Os papéis liberam funções a mais e nunca restringem: qualquer pessoa
pode alugar quadra ou reservar espaço. Sem nenhum papel marcado, é um cliente que só faz locações.

| campo | tipo | obs |
|---|---|---|
| codigo_pes | PK | |
| nome_pes | texto | |
| aluno_pes | booleano | pode ter contratos e entrar em turmas |
| professor_pes | booleano | pode dar aulas e ter disponibilidade |
| email_pes | texto | |
| telefone_pes | texto | |
| cpf_pes | texto | único |
| data_nasc_pes | data | |
| nivel_pes | **(enum)** | INICIANTE, INTERMEDIARIO, AVANCADO — opcional, para alunos |
| observacao_pes | texto | |
| ativo_pes | booleano | |
| data_cadastro_pes | data/hora | |

### espacos
(antiga `quadras`) Tudo que pode ser agendado: quadras e outros espaços (sala de treino físico,
churrasqueira, paredão…). Qualquer espaço pode ser reservado (locação) e ter tabela de preço.
Na interface, quadras e os demais espaços têm páginas separadas; a tabela é uma só para que
agendamentos tenham uma única FK de local e uma única regra de conflito de horário.

| campo | tipo | obs |
|---|---|---|
| codigo_esp | PK | |
| nome_esp | texto | |
| tipo_esp | **(enum)** | QUADRA, OUTRO |
| locacao_esp | **(enum)** | NAO (só aulas/turmas), POR_HORA (quadras), POR_PERIODO (ex.: churrasqueira) |
| status_esp | **(enum)** | ATIVO, MANUTENCAO, INATIVO |

### modalidades
Atividades oferecidas: Tênis, Treino físico… Planos, turmas e aulas pertencem a uma modalidade.

| campo | tipo | obs |
|---|---|---|
| codigo_mod | PK | |
| nome_mod | texto | |
| cor_mod | texto '#RRGGBB' | cor das aulas e turmas da modalidade na agenda |
| ativo_mod | booleano | |

### configuracoes
Registro único com as configurações gerais da academia. Candidatos a vir para cá depois:
horário de funcionamento (hoje fixo no front, 07:00–23:00).

| campo | tipo | obs |
|---|---|---|
| codigo_cfg | PK | sempre 1 |
| cor_locacao_cfg | texto '#RRGGBB' | cor das locações/reservas na agenda |

### precos_espacos
(antiga `precos_quadras`) Faixas de preço de locação por espaço e dia da semana. O significado
depende de `locacao_esp`:
- POR_HORA: valor da hora dentro da faixa; uma reserva que atravessa faixas soma cada parte.
- POR_PERIODO: a faixa é o próprio período reservável (ex.: sábado 11:00–16:00), pelo valor fechado.

Trafega junto com o espaço na API (o espaço é salvo com todas as suas faixas). Faixas do mesmo
espaço e dia não podem se sobrepor.

| campo | tipo | obs |
|---|---|---|
| codigo_pre | PK | |
| codesp_pre | FK espacos | |
| dia_semana_pre | inteiro | 0 = domingo … 6 = sábado |
| hora_inicio_pre | hora | |
| hora_fim_pre | hora | |
| valor_pre | decimal | por hora ou por período, conforme `locacao_esp` |

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
O que a academia vende: uma frequência (ou quantidade) de uma modalidade.
Combinações ("tênis 3x + físico 1x") não viram planos: são itens do mesmo contrato.

| campo | tipo | obs |
|---|---|---|
| codigo_pla | PK | |
| codmod_pla | FK modalidades | |
| nome_pla | texto | ex.: "Tênis 2x/semana", "Físico 1x/semana", "Pacote 10 aulas tênis" |
| tipo_pla | **(enum)** | PACOTE, MENSAL |
| qtd_aulas_pla | inteiro | PACOTE: total de aulas; MENSAL: aulas por semana |
| validade_dias_pla | inteiro | PACOTE: prazo para usar as aulas |
| valor_pla | decimal | PACOTE: valor total; MENSAL: valor da mensalidade |
| ativo_pla | booleano | |

### contratos
Um aluno aderindo a um ou mais planos (os itens). Datas, vencimento e status são do contrato
inteiro: uma cobrança só por mês, com um movimento por item.

| campo | tipo | obs |
|---|---|---|
| codigo_con | PK | |
| codpes_con | FK pessoas | aluno |
| tipo_con | **(enum)** | PACOTE, MENSAL — todos os itens têm planos deste tipo |
| data_inicio_con | data | |
| data_fim_con | data | PACOTE: início + maior validade entre os itens; MENSAL: vazio enquanto ativo |
| dia_vencimento_con | inteiro | MENSAL: dia do mês da cobrança |
| proporcional_con | booleano | MENSAL: 1ª mensalidade proporcional aos dias restantes do mês |
| observacao_con | texto | motivo de ajustes após a venda (renegociação, cortesia…) |
| status_con | **(enum)** | ATIVO, ENCERRADO, CANCELADO |

### contratos_itens
Cada plano contratado. Guarda cópia dos valores do plano no momento da venda,
para que mudar o plano depois não altere contratos antigos.

| campo | tipo | obs |
|---|---|---|
| codigo_cit | PK | |
| codcon_cit | FK contratos | |
| codpla_cit | FK planos | |
| qtd_aulas_cit | inteiro | copiado do plano — PACOTE: total; MENSAL: cota semanal |
| valor_cit | decimal | copiado do plano (permite desconto) |

No máximo um item por modalidade em cada contrato (unique `codcon_cit` + modalidade do plano),
para que a cota de cada modalidade fique num lugar só.
Os dias não ficam presos ao contrato: o aluno marca as aulas na agenda e cada uma desconta
da cota do item da mesma modalidade. Aulas usadas = `participantes_agendamento` com
`codcit_par` = o item e presença diferente de "falta justificada" (regra a definir).

## Turmas — novo

### turmas
Aula em grupo com horário fixo semanal.

| campo | tipo | obs |
|---|---|---|
| codigo_tur | PK | |
| nome_tur | texto | ex.: "Intermediário terça/quinta 19h" |
| codmod_tur | FK modalidades | |
| codpes_tur | FK pessoas | professor |
| codesp_tur | FK espacos | espaço padrão |
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
| codcit_tal | FK contratos_itens | opcional — item de contrato que paga essa participação |
| data_entrada_tal | data | |
| data_saida_tal | data | vazio = ainda está na turma |

## Agenda

### agendamentos
Cada ocupação de um espaço em um horário: locação, aula marcada ou encontro de turma.

| campo | tipo | obs |
|---|---|---|
| codigo_age | PK | |
| tipo_age | **(enum)** | LOCACAO, AULA, AULA_TURMA |
| codesp_age | FK espacos | |
| codmod_age | FK modalidades | só em AULA (em AULA_TURMA vem da turma; vazio em LOCACAO) |
| codpes_age | FK pessoas | responsável pela locação; vazio nas aulas (alunos e professor ficam nos participantes) |
| codtur_age | FK turmas | só em AULA_TURMA |
| data_inicio_age | data/hora | |
| data_fim_age | data/hora | |
| valor_age | decimal | LOCACAO: valor combinado; sugerido pela tabela de `precos_espacos` e editável (desconto a critério do gestor, motivo em `observacao_age`) |
| status_age | **(enum)** | AGENDADO, REALIZADO, CANCELADO |
| observacao_age | texto | |

AULA é qualquer aula fora de turma, com um ou mais alunos: particular de tênis, treino físico
da equipe marcado no dia que o aluno escolher etc.

Regra: não pode haver dois agendamentos não cancelados no mesmo espaço com horários sobrepostos
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
| codcit_par | FK contratos_itens | opcional — de qual item de contrato a aula é descontada |
| presenca_par | **(enum)** | PENDENTE, PRESENTE, FALTA, FALTA_JUSTIFICADA |

## Financeiro

### categorias_despesa
Classificação das despesas para relatório: aluguel, energia, salários, manutenção…

| campo | tipo |
|---|---|
| codigo_cde | PK |
| nome_cde | texto |
| ativo_cde | booleano |

### transacoes
Uma conta a receber (RECEITA) ou a pagar (DESPESA), com seus itens em `movimentos`.
Pagamento só integral: registrar o pagamento quita a transação. Sem multa/juros por atraso.
"Vencida" não é status: é uma ABERTA com vencimento no passado (calculado na consulta).

| campo | tipo | obs |
|---|---|---|
| codigo_tra | PK | |
| tipo_tra | **(enum)** | RECEITA, DESPESA |
| codpes_tra | FK pessoas | RECEITA: quem paga (obrigatório); DESPESA: a quem se paga (opcional, ex.: professor) |
| codcde_tra | FK categorias_despesa | só DESPESA (obrigatório) |
| codfpg_tra | FK formas_pagamento | preenchido ao pagar |
| valtot_tra | decimal | soma dos movimentos |
| data_tra | data/hora | criação |
| data_vencimento_tra | data | |
| data_pagamento_tra | data | |
| observacao_tra | texto | ex.: motivo do cancelamento |
| status_tra | **(enum)** | ABERTA, PAGA, CANCELADA |

### movimentos
Itens da transação. Cada item de receita aponta para a origem da cobrança (no máximo uma);
itens de despesa só têm descrição e valor.

| campo | tipo | obs |
|---|---|---|
| codigo_mov | PK | |
| codtra_mov | FK transacoes | |
| codser_mov | FK servicos | item avulso |
| codage_mov | FK agendamentos | locação / aula avulsa cobrada |
| codcit_mov | FK contratos_itens | venda de pacote ou mensalidade (um movimento por item) |
| competencia_mov | texto 'YYYY-MM' | só mensalidade; unique (`codcit_mov`, `competencia_mov`) impede cobrar o mesmo mês duas vezes |
| descri_mov | texto | ex.: "Tênis 2x por semana — 10/2026" |
| quantidade_mov | decimal | |
| val_unit_mov | decimal | |
| valtot_mov | decimal | |

**Geração de mensalidades** (rotina diária no backend; no front, botão "Gerar mensalidades"):
para cada contrato MENSAL ativo no mês, uma transação com um movimento por item.
- Vencimento: dia `dia_vencimento_con` do mês; se cair antes do início do contrato, vence no início.
- 1º mês proporcional (se `proporcional_con`): valor × (dias do mês − dia do início + 1) ÷ dias do mês.

**Venda de pacote**: ao registrar o contrato PACOTE, nasce uma transação com um movimento por item,
vencendo na data de início.

## Como cada tipo de aula/cobrança funciona

| situação | como fica |
|---|---|
| Locação de quadra ou reserva de espaço | `agendamento` LOCACAO → `movimento` com `codage_mov`, valor por `precos_espacos` |
| Aula avulsa | `agendamento` AULA (ou aluno avulso numa turma) → `movimento` com `codage_mov` e `codser_mov` |
| Pacote de aulas | venda: `contrato` + itens + um `movimento` por item (`codcit_mov`); cada aula: `participante` com `codcit_par` (desconta do saldo) |
| Mensalidade | `contrato` MENSAL; todo mês gera uma `transacao` com um `movimento` por item; aulas com `codcit_par` |
| Combinação (ex.: tênis 3x + físico 1x) | um `contrato` MENSAL com dois itens; cada aula marcada desconta da cota semanal do item da sua modalidade |
| Turma | `turma` + `turmas_horarios` + `turmas_alunos` (entra/sai a qualquer momento); encontros viram `agendamentos` AULA_TURMA |

## Mudanças em relação ao desenho original

- `tipos_usuario` removida: em `pessoas`, os papéis viram `aluno_pes` e `professor_pes`
  (booleanos), porque uma pessoa pode ser aluna e professora ao mesmo tempo e as regras
  dependem desses papéis. Nova tabela `usuarios` para o login.
- `status_agendamentos` e `status_transacao` viram enums.
- `quadras` → `espacos`, com `tipo_esp` (QUADRA, OUTRO): o treino físico acontece numa sala, e
  a academia também reserva churrasqueira, paredão etc.
- `agendamentos`: + `tipo_age`, `codmod_age`, `codtur_age`, `valor_age`, `observacao_age`.
- `participantes_agendamento`: + `codcit_par`, `presenca_par`.
- `precos_quadras` → `precos_espacos`: + `dia_semana_pre`.
- `transacoes`: + `tipo_tra` (receitas e despesas), `codcde_tra`, `data_vencimento_tra`,
  `data_pagamento_tra`, `observacao_tra`. Nova tabela `categorias_despesa`.
- `movimentos`: + `codage_mov`, `codcit_mov`, `competencia_mov`.
- `contratos` com itens (`contratos_itens`), para combinar modalidades e frequências sem
  criar um plano por combinação. + `proporcional_con`, `observacao_con`. Contrato ativo pode ser ajustado
  (valores, datas, aulas, vencimento, itens novos), mas não troca de aluno nem o plano de um item:
  isso é remover o item e incluir outro.
- Cores da agenda editáveis: `cor_mod` em `modalidades` e a tabela `configuracoes` (cor da locação).
- Novas: `modalidades`, `configuracoes`, `planos`, `contratos`, `contratos_itens`, `turmas`, `turmas_horarios`, `turmas_alunos`.
- Ainda não incluído (fase 2): bloqueios de quadra/professor (manutenção, férias), reposição de aulas.
