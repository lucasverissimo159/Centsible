[English](#centsible) | [Português](#centsible-português)

# Centsible

**A personal finance dashboard with a hand-built recurring-transaction engine, budget projections, and real undo/redo.**

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white)
![License](https://img.shields.io/badge/license-View--Only-red)

> ⚠️ **Repository available for portfolio purposes only.** The code can
> be viewed, but **cannot** be copied, downloaded, used, or
> reused in other projects. See the [License](#license) section and the
> [`LICENSE`](./LICENSE) file.

![Centsible dashboard](docs/screenshots/dashboard-light.png)

## Overview

Centsible is an expense tracker — a genre with a thousand tutorial clones — built to actually behave like one. Set up "Rent, monthly, on the 1st" once and it keeps posting itself, correctly, forever (including the part where "the 31st of every month" doesn't exist in February). Set a grocery budget and it doesn't just show a bar, it tells you where you're *trending* to land by the end of the month. Delete a transaction by mistake and you get a real Ctrl+Z, not a confirmation dialog.

Everything runs client-side (React + TypeScript + Vite) with data in `localStorage` — no backend, no signup, clone and run.

## Features

- **Recurring transactions** — daily / weekly / monthly / yearly, any interval ("every 2 weeks"), optional end date. Past-due occurrences auto-post on load, like a bank posting a bill; upcoming ones show in a 14-day preview.
- **Budgets with a projection, not just a bar** — linear end-of-month spend forecast based on your pace so far this month, with under / near-limit / over states.
- **Undo/redo** — a generic history stack over every data-changing action (`Ctrl+Z` / `Ctrl+Shift+Z`), plus inline "Undo" on delete toasts.
- **CSV import & export** — hand-rolled parser (quoted fields, embedded commas/quotes/newlines), with flexible import that infers income/expense from a signed amount if there's no explicit type column.
- **Dashboard** — category breakdown, 6-month income vs. expense trend, budget progress, upcoming bills, recent activity.
- **Custom categories** — name, color, icon, and whether they apply to income, expenses, or both.
- **JSON backup / restore**, CSV export, dark mode, multi-currency formatting (USD/EUR/GBP/BRL/JPY/CAD/AUD), fully responsive down to a 390px viewport.
- Seeded with **six months of realistic demo data** on first run, so the dashboard is never empty.

## Technical highlights

The brief for this project was "pick something everyday, make the complexity earn its place." These are the parts that do:

- **A hand-written recurrence engine** (`src/domain/recurrence.ts`), not a date library. The hard part isn't "add N days" — it's that anchoring a monthly rule to *the previous occurrence* silently breaks: "the 31st" clamps to Feb 28, and a naive implementation then keeps recurring on the 28th forever instead of returning to the 31st in March. This engine always computes each occurrence as an offset from the *original* start date, so Jan 31 → Feb 28 → Mar 31 → Apr 30, correctly, including leap years. It's the single most-tested file in the repo.
- **Money as integer cents, everywhere.** `amountCents: 4599`, never `amount: 45.99`. No floating-point drift, ever. Conversion to/from a decimal string happens at exactly two boundary functions (`domain/money.ts`).
- **A generic undo/redo reducer enhancer** (`src/store/undoable.ts`) — a `{ past, present, future }` wrapper around *any* `(state, action) => state` reducer, in the spirit of `redux-undo` but dependency-free and ~60 lines. It doesn't know what a "transaction" is.
- **Cascading, integrity-preserving deletes.** Delete a category and its transactions and recurring rules reassign to "Other" rather than pointing at a category that no longer exists; any budget tied to it is removed rather than left orphaned. See the `DELETE_CATEGORY` reducer case and its tests.
- **A localStorage schema with a version number and a migration chain**, not a bare `JSON.stringify(state)`. There's exactly one schema version today, but the shape means "add a field" becomes "bump the version and add a migration function," not a breaking change for existing users.
- **Memoized, framework-agnostic selectors** (`src/store/selectors.ts`) for dashboard aggregation — pure functions, independently unit-tested, wrapped in `useMemo` only at the point of use in components.
- **Route-level code-splitting.** Recharts alone pushed the initial bundle past Vite's 500 kB warning threshold; `React.lazy` + `Suspense` per route dropped the main chunk from **682 kB to 234 kB** (gzip 203 kB → 75 kB), with the chart-heavy dashboard chunk loading only when you land on it.

## Screenshots

<table>
<tr>
<td width="50%"><img src="docs/screenshots/dashboard-dark.png" alt="Dark mode dashboard" /><br/><sub>Dark mode</sub></td>
<td width="50%"><img src="docs/screenshots/transactions.png" alt="Transactions with recurring rules panel" /><br/><sub>Transactions + recurring rules</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/budgets.png" alt="Budget progress cards" /><br/><sub>Budgets with end-of-month projection</sub></td>
<td width="50%"><img src="docs/screenshots/mobile-dashboard.png" alt="Mobile dashboard" /><br/><sub>Responsive down to 390px</sub></td>
</tr>
</table>

## Architecture

```
src/
├── domain/          Pure, framework-agnostic business logic — the core of the app.
│   ├── recurrence.ts    Occurrence generation + materialization (the recurrence engine)
│   ├── budget.ts         Spend aggregation, status thresholds, end-of-month projection
│   ├── money.ts           Cents ⇄ decimal conversion, currency formatting
│   ├── csv.ts               Hand-rolled CSV parser/serializer
│   ├── importExport.ts       CSV↔Transaction mapping, JSON backup helpers
│   └── seedData.ts             Demo data generator
├── store/            State management — no Redux; Context + a plain reducer.
│   ├── appReducer.ts     Discriminated-union actions over AppState
│   ├── undoable.ts        Generic undo/redo reducer enhancer
│   ├── selectors.ts        Derived data for charts/dashboard (pure, memoized at call sites)
│   ├── persistence.ts       localStorage read/write with schema versioning
│   └── AppContext.tsx        Wires it all together behind an ergonomic action API
├── hooks/            useDebounce, useMediaQuery, useOnClickOutside, useKeyboardShortcut, useToast
├── components/
│   ├── ui/             Design-system primitives (Button, Card, Modal, Field, ProgressBar, Icon…)
│   ├── layout/          Sidebar, Header, responsive shell
│   ├── dashboard/         Charts and dashboard widgets
│   ├── transactions/       List, filters, form, CSV import/export, recurring rules panel
│   ├── budgets/             Budget form
│   └── categories/           Category form
├── pages/            One component per route
└── types/            Shared TypeScript types (Transaction, RecurringRule, Budget, …)
```

Business logic in `domain/` never imports React. Every non-trivial function there has a matching test in `__tests__/`. Components stay thin — they call `useApp()` for data/actions and a domain function for any real logic.

## Getting started

```bash
git clone <your-repo-url>
cd centsible
npm install
npm run dev
```

Open the printed local URL. The app seeds itself with demo data on first run — nothing to configure.

Demo login credentials (seeded account):

- Email: `admin@centsible.local`
- Password: `ChangeMe123!`

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with a coverage report |
| `npm run lint` | Run oxlint |

### Full-stack mode

The app can still run offline with `localStorage`, but production data can be served by the TypeScript API in `server/` and PostgreSQL through Prisma.

```bash
copy .env.example .env
docker compose up -d postgres
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run server:dev
```

In another terminal, run `npm run dev`. Open `/login` to create an organization or sign in. The Settings page can synchronize the authenticated organization's categories, transactions, budgets, and recurring rules. API integration tests run without Docker; PostgreSQL migration execution requires Docker or another PostgreSQL instance.

Backend commands:

| Command | Does |
|---|---|
| `npm run server:dev` | Start the API with watch mode |
| `npm run build:server` | Type-check the backend and Prisma adapter |
| `npm run db:migrate` | Create/apply a development migration |
| `npm run db:deploy` | Apply committed migrations in deployment |
| `npm run db:seed` | Create the demo organization and admin user |

## Testing

65 tests across 8 files, focused on the logic where a bug would actually matter — the recurrence engine, budget math, the CSV parser, the reducer's cascading-delete behavior, and the undo/redo enhancer. Domain-layer coverage sits around 81%; the recurrence engine specifically is exercised with month-end clamping, leap years, custom intervals, and range-boundary edge cases.

```bash
npm run test:run
```

## Design decisions

A few choices worth explaining rather than leaving implicit:

- **Why hand-roll the recurrence engine instead of `date-fns`/`rrule`?** Because the interesting part of this project *is* that logic, and reaching for a library would have hidden the one piece meant to demonstrate it. Everything else uses native `Date` carefully rather than reinventing further.
- **Why Context + `useReducer` instead of Redux/Zustand?** The state shape is a single flat document with no cross-cutting async concerns — a library wouldn't have bought much, and the undo/redo enhancer gets you most of what people reach for Redux middleware for anyway.
- **Why do `AppContext.tsx`, `useToast.tsx`, and `Icon.tsx` export a hook (or constants) alongside a component?** That's the standard React "context + provider + hook" colocation pattern. It trips the `react/only-export-components` fast-refresh lint rule (visible as warnings, not errors, in `npm run lint`) — a deliberate trade of marginally slower HMR in these three files for not fragmenting a cohesive concern across two files.
- **Dependency on `react-router` (not `react-router-dom`).** As of this writing, `react-router-dom@7.18.2` transitively pulls a `react-router` with a published advisory (RSC-mode CSRF bypass, [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2)) that doesn't affect this app at all — it's a plain client-side SPA that never touches React Router's server/RSC mode. Still, the unified `react-router@8.3.0` package ships the fix and has absorbed `react-router-dom`'s exports (`BrowserRouter` and friends), so that's what's installed. `npm audit` reports zero vulnerabilities.

## Roadmap

Deliberately out of scope for v1, and the natural next steps:

- Editing a single occurrence of a recurring series vs. the whole rule (currently: edit the one generated transaction, or pause/delete the whole rule)
- Live FX conversion for multi-currency accounts (currently: formatting only, one currency at a time)
- A backend + sync, if this ever needed to leave the browser

## License

This repository is **not open source**. It is made public solely for
portfolio / technical-demonstration purposes.

- ✅ Allowed: viewing the code through the GitHub interface.
- ❌ Not allowed: copying, downloading, cloning for reuse, using, modifying,
  running, or redistributing this code, in whole or in part, without the
  author's prior written permission.

All rights reserved. See the full terms in [`LICENSE`](LICENSE).

---

Designed and built by **Lucas Veríssimo de Oliveira**.

---
---

# Centsible (Português)

**Um dashboard de finanças pessoais com um motor de transações recorrentes feito à mão, projeções de orçamento e um verdadeiro desfazer/refazer.**

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white)
![License](https://img.shields.io/badge/license-View--Only-red)

> ⚠️ **Repositório disponível apenas para fins de portfólio.** O código pode
> ser visualizado, mas **não pode** ser copiado, baixado, usado ou
> reutilizado em outros projetos. Veja a seção [Licença](#licença) e o
> arquivo [`LICENSE`](./LICENSE).

![Centsible dashboard](docs/screenshots/dashboard-light.png)

## Visão Geral

Centsible é um rastreador de despesas — um gênero com mil clones de tutoriais — construído para realmente se comportar como um. Configure "Aluguel, mensal, dia 1" uma vez e ele continuará se lançando, corretamente, para sempre (incluindo a parte onde "o dia 31 de cada mês" não existe em fevereiro). Defina um orçamento para supermercado e ele não mostra apenas uma barra, ele diz para onde você está *tendendo* a ir até o final do mês. Exclua uma transação por engano e você tem um verdadeiro Ctrl+Z, não uma caixa de diálogo de confirmação.

Tudo roda do lado do cliente (React + TypeScript + Vite) com dados em `localStorage` — sem backend, sem cadastro, clone e rode.

## Recursos

- **Transações recorrentes** — diárias / semanais / mensais / anuais, qualquer intervalo ("a cada 2 semanas"), data de término opcional. Ocorrências em atraso são lançadas automaticamente ao carregar, como um banco debitando uma conta; as próximas aparecem em uma pré-visualização de 14 dias.
- **Orçamentos com projeção, não apenas uma barra** — previsão linear de gastos de fim de mês baseada no seu ritmo até agora este mês, com estados abaixo / perto do limite / acima do limite.
- **Desfazer/refazer** — uma pilha de histórico genérica sobre cada ação de alteração de dados (`Ctrl+Z` / `Ctrl+Shift+Z`), além de um "Desfazer" inline nos toasts de exclusão.
- **Importação e exportação de CSV** — parser feito à mão (campos entre aspas, vírgulas/aspas/quebras de linha embutidas), com importação flexível que infere receita/despesa de um valor com sinal se não houver coluna de tipo explícita.
- **Dashboard** — detalhamento por categoria, tendência de receita vs. despesa de 6 meses, progresso do orçamento, próximas contas, atividade recente.
- **Categorias personalizadas** — nome, cor, ícone e se elas se aplicam a receitas, despesas ou ambos.
- **Backup / restauração JSON**, exportação em CSV, modo escuro, formatação multimoeda (USD/EUR/GBP/BRL/JPY/CAD/AUD), totalmente responsivo até uma janela de visualização de 390px.
- Semeado com **seis meses de dados de demonstração realistas** na primeira execução, para que o dashboard nunca esteja vazio.

## Destaques técnicos

A premissa para este projeto era "escolha algo do dia a dia, faça a complexidade merecer seu lugar". Estas são as partes que fazem isso:

- **Um motor de recorrência escrito à mão** (`src/domain/recurrence.ts`), não uma biblioteca de datas. A parte difícil não é "adicionar N dias" — é que ancorar uma regra mensal na *ocorrência anterior* quebra silenciosamente: "o dia 31" se limita a 28 de fevereiro, e uma implementação ingênua então continua recorrendo no dia 28 para sempre, em vez de retornar ao dia 31 em março. Este motor sempre calcula cada ocorrência como um deslocamento da data de início *original*, então 31 de janeiro → 28 de fevereiro → 31 de março → 30 de abril, corretamente, incluindo anos bissextos. É o arquivo mais testado individualmente no repositório.
- **Dinheiro como centavos inteiros, em todos os lugares.** `amountCents: 4599`, nunca `amount: 45.99`. Sem desvio de ponto flutuante, nunca. A conversão de/para uma string decimal acontece em exatamente duas funções de fronteira (`domain/money.ts`).
- **Um aprimorador de reducer genérico para desfazer/refazer** (`src/store/undoable.ts`) — um wrapper `{ past, present, future }` ao redor de *qualquer* reducer `(state, action) => state`, no espírito do `redux-undo`, mas sem dependências e com ~60 linhas. Ele não sabe o que é uma "transação".
- **Exclusões em cascata que preservam a integridade.** Exclua uma categoria e suas transações e regras recorrentes são reatribuídas para "Outros" em vez de apontar para uma categoria que não existe mais; qualquer orçamento vinculado a ela é removido em vez de ficar órfão. Veja o caso do reducer `DELETE_CATEGORY` e seus testes.
- **Um esquema de localStorage com um número de versão e uma cadeia de migração**, não um mero `JSON.stringify(state)`. Há exatamente uma versão de esquema hoje, mas o formato significa que "adicionar um campo" se torna "aumentar a versão e adicionar uma função de migração", não uma mudança brusca para usuários existentes.
- **Seletores memoizados, agnósticos de framework** (`src/store/selectors.ts`) para agregação de dashboard — funções puras, testadas unitariamente de forma independente, envolvidas em `useMemo` apenas no ponto de uso nos componentes.
- **Code-splitting em nível de rota.** O Recharts sozinho empurrou o pacote inicial além do limite de aviso de 500 kB do Vite; `React.lazy` + `Suspense` por rota diminuiu o chunk principal de **682 kB para 234 kB** (gzip 203 kB → 75 kB), com o chunk pesado de gráficos do dashboard carregando apenas quando você o acessa.

## Capturas de tela

<table>
<tr>
<td width="50%"><img src="docs/screenshots/dashboard-dark.png" alt="Dark mode dashboard" /><br/><sub>Modo Escuro</sub></td>
<td width="50%"><img src="docs/screenshots/transactions.png" alt="Transactions with recurring rules panel" /><br/><sub>Transações + regras recorrentes</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/budgets.png" alt="Budget progress cards" /><br/><sub>Orçamentos com projeção de fim de mês</sub></td>
<td width="50%"><img src="docs/screenshots/mobile-dashboard.png" alt="Mobile dashboard" /><br/><sub>Responsivo até 390px</sub></td>
</tr>
</table>

## Arquitetura

```
src/
├── domain/          Lógica de negócios pura, agnóstica de framework — o núcleo do aplicativo.
│   ├── recurrence.ts    Geração de ocorrência + materialização (o motor de recorrência)
│   ├── budget.ts         Agregação de gastos, limites de status, projeção de fim de mês
│   ├── money.ts           Conversão centavos ⇄ decimal, formatação de moeda
│   ├── csv.ts               Parser/serializador CSV feito à mão
│   ├── importExport.ts       Mapeamento CSV↔Transação, auxiliares de backup JSON
│   └── seedData.ts             Gerador de dados de demonstração
├── store/            Gerenciamento de estado — sem Redux; Contexto + um reducer simples.
│   ├── appReducer.ts     Ações de união discriminada sobre AppState
│   ├── undoable.ts        Aprimorador de reducer genérico de desfazer/refazer
│   ├── selectors.ts        Dados derivados para gráficos/dashboard (puros, memoizados)
│   ├── persistence.ts       Leitura/escrita no localStorage com versionamento de esquema
│   └── AppContext.tsx        Conecta tudo por trás de uma API de ação ergonômica
├── hooks/            useDebounce, useMediaQuery, useOnClickOutside, useKeyboardShortcut, useToast
├── components/
│   ├── ui/             Primitivas do sistema de design (Button, Card, Modal, Field, ProgressBar, Icon…)
│   ├── layout/          Barra lateral, Cabeçalho, shell responsivo
│   ├── dashboard/         Gráficos e widgets de dashboard
│   ├── transactions/       Lista, filtros, formulário, importação/exportação CSV, painel de regras recorrentes
│   ├── budgets/             Formulário de orçamento
│   └── categories/           Formulário de categoria
├── pages/            Um componente por rota
└── types/            Tipos TypeScript compartilhados (Transaction, RecurringRule, Budget, …)
```

A lógica de negócios em `domain/` nunca importa React. Cada função não trivial lá tem um teste correspondente em `__tests__/`. Os componentes permanecem finos — eles chamam `useApp()` para dados/ações e uma função de domínio para qualquer lógica real.

## Primeiros Passos

```bash
git clone <url-do-seu-repositorio>
cd centsible
npm install
npm run dev
```

Abra o URL local exibido. O aplicativo se auto preenche com dados de demonstração na primeira execução — nada para configurar.

| Comando | O que faz |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Verificação de tipos (`tsc -b`) e build para produção |
| `npm run preview` | Serve o build de produção localmente |
| `npm run test` | Executa os testes em modo de observação |
| `npm run test:run` | Executa os testes uma vez |
| `npm run test:coverage` | Executa testes com relatório de cobertura |
| `npm run lint` | Executa oxlint |

## Testes

65 testes em 8 arquivos, focados na lógica onde um bug realmente importaria — o motor de recorrência, matemática orçamentária, parser CSV, comportamento de exclusão em cascata do reducer e aprimorador de desfazer/refazer. A cobertura da camada de domínio é de cerca de 81%; o motor de recorrência é exercido com limitações de final de mês, anos bissextos, intervalos personalizados e casos extremos de limite de intervalo.

```bash
npm run test:run
```

## Decisões de Design

Algumas escolhas que valem a pena ser explicadas em vez de ficarem implícitas:

- **Por que codificar manualmente o motor de recorrência em vez de `date-fns`/`rrule`?** Porque a parte interessante deste projeto *é* essa lógica, e usar uma biblioteca esconderia a única peça destinada a demonstrá-la. Todo o resto usa `Date` nativo cuidadosamente para não reinventar a roda.
- **Por que Context + `useReducer` em vez de Redux/Zustand?** O formato do estado é um documento único, sem preocupações assíncronas transversais — uma biblioteca não traria muitas vantagens, e o aprimorador de desfazer/refazer resolve a maior parte do que as pessoas procuram no middleware Redux.
- **Por que `AppContext.tsx`, `useToast.tsx`, e `Icon.tsx` exportam um hook (ou constantes) junto com um componente?** Esse é o padrão padrão React de "contexto + provedor + hook" em colocação. Isso aciona a regra `react/only-export-components` de fast-refresh (visível como avisos, não erros, em `npm run lint`) — uma troca deliberada por um HMR ligeiramente mais lento para manter coesão.
- **Dependência de `react-router` (não `react-router-dom`).** Até o momento desta escrita, `react-router-dom@7.18.2` possui indiretamente um aviso publicado (RSC-mode CSRF bypass, [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2)) que não afeta de forma alguma este aplicativo. Contudo, a nova versão `react-router@8.3.0` traz a correção e absorveu as exportações do `react-router-dom`. Portanto, zero vulnerabilidades.

## Roteiro (Roadmap)

Deliberadamente fora do escopo para a v1 e os próximos passos naturais:

- Edição de uma única ocorrência de uma série recorrente em vez de toda a regra
- Conversão FX ao vivo para contas em várias moedas
- Um back-end + sincronização, se isso um dia precisar sair do navegador

## Licença

Este repositório **não é open source**. Ele é tornado público exclusivamente para
fins de portfólio / demonstração técnica.

- ✅ Permitido: visualização do código pela interface do GitHub.
- ❌ Não permitido: copiar, baixar, clonar para reutilização, uso, modificação,
  execução ou redistribuição deste código, no todo ou em parte, sem a
  autorização prévia por escrito do autor.

Todos os direitos reservados. Veja os termos completos em [`LICENSE`](LICENSE).

---

Projetado e construído por **Lucas Veríssimo de Oliveira**.