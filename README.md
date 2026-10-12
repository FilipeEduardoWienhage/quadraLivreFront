# QuadraLivre — front-end

Sistema de gestão de uma academia de tênis: agenda de quadras e espaços, aulas e turmas,
contratos (pacotes e mensalidades) e financeiro. Uso exclusivo da administração.

Este repositório é o front-end. O backend (API Java) ainda não existe: os dados vêm de um
**mock** que simula a API no navegador (ver [Dados mock](#dados-mock)).

## Stack

- React 19 + TypeScript + Vite
- React Router
- CSS puro por componente (sem framework de UI)
- Oxlint

## Como rodar

```bash
npm install
npm run dev      # servidor de desenvolvimento (http://localhost:5173)
npm run build    # checagem de tipos + build de produção
npm run lint     # oxlint
```

## Telas

| Tela | O que faz |
|---|---|
| Agenda | Um card por espaço com a linha do tempo do dia; locações (valor pela tabela de preços), aulas (com cota do contrato) e encontros de turma; presença e cancelamento |
| Pessoas | Cadastro único com papéis acumuláveis (aluno, professor); sem papel = cliente |
| Turmas | Horários semanais, professor, local e entrada/saída de alunos com histórico |
| Planos | O que a academia vende, por modalidade (pacote ou mensal) |
| Contratos | Combinam planos de modalidades diferentes; ajuste, encerramento e cancelamento |
| Quadras / Espaços | Locais agendáveis, com forma de locação (por hora, por período ou não alugável) e preços |
| Modalidades | Tênis, treino físico… com a cor usada na agenda |
| Serviços | Itens avulsos cobráveis |
| Financeiro | Contas a receber e a pagar, geração de mensalidades, pagamento e cancelamento |

## Estrutura

```
docs/modelagem.md        modelo de dados e regras de negócio (fonte da verdade)
src/
  types/models.ts        tipos das entidades, no formato do JSON da API
  services/
    api.ts               contrato da API: o que o front espera do backend
    index.ts             ponto único de acesso aos dados (trocar mock por API real é só aqui)
    mock/                implementação simulada: CRUD genérico + regras do servidor
  components/            componentes reutilizáveis (Tabela, ModalFormulario, Campo, Toast…)
  hooks/                 useRecurso (lista + salvar/excluir), useEdicao (modal de cadastro)…
  pages/                 uma pasta/arquivo por tela
  utils/                 funções puras: datas, horários, preços, formatação
  config.ts              horário de funcionamento e grade da agenda
```

## Dados mock

- Os dados iniciais ficam em `src/services/mock/dados.ts` e, depois de alterados, são guardados
  no `localStorage` do navegador.
- O mock simula as regras que serão do servidor: conflitos de horário, cobrança da locação,
  geração de mensalidades sem duplicidade, cota de aulas etc. Ao implementar o backend, essas
  regras devem ir para lá.
- Ao mudar o formato dos dados, aumente `VERSAO` em `src/services/mock/criarRecursoMock.ts`:
  os dados antigos do navegador são ignorados e os iniciais voltam.

## Convenções

- Código, nomes e textos em português, como o domínio.
- Regras e decisões de modelagem são registradas em `docs/modelagem.md`, com o motivo.
- Registros referenciados por outros (pessoas, planos, contratos, transações) não são excluídos:
  são inativados, encerrados ou cancelados, para preservar o histórico.
