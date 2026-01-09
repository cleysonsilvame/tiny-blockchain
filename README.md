# Blockchain Visualizer - Angular

Ferramenta educacional interativa para entender o funcionamento de blockchain, mineração e proof-of-work.

## 🚀 Funcionalidades

### 📦 Core Blockchain

- **Mineração de Blocos**: Proof-of-work com dificuldade configurável
- **Mempool**: Pool de transações pendentes com sistema de taxas
- **Hash SHA-256**: Cálculo de hash criptográfico usando crypto-js
- **Validação de Cadeia**: Verificação de integridade da blockchain

### 💰 Sistema Financeiro

- **Transações**: Transferências entre endereços com taxas configuráveis
- **Recompensas de Mineração**: 6.25 BTC + taxas das transações
- **Wallet Explorer**: Visualização de saldos e histórico de transações
- **Priorização por Taxa**: Mempool ordenado por taxa (mineradores escolhem primeiro)

### 🏁 Mineração Competitiva

- **Modo Solo**: Mineração individual com controle manual
- **Modo Competição**: 4 mineradores simultâneos competindo
- **Diferentes Hash Rates**: Alice (15k), Bob (12k), Charlie (10k), Diana (13k)
- **Visualização em Tempo Real**: Progresso de cada minerador durante a corrida

### 🔀 Sistema de Forks

- **Criação de Forks**: Bifurcação da cadeia em pontos específicos
- **Seleção de Fork**: Escolha em qual fork minerar novos blocos
- **Consenso Automático**: Cadeia mais longa sempre vence
- **Visualização de Múltiplas Cadeias**: Identificação visual de cada fork

### 🛡️ Demonstração de Segurança

- **Tamper de Blocos**: Editar dados de blocos existentes (quebra integridade)
- **Validação Visual**: Blocos inválidos destacados em vermelho
- **Detecção de Alterações**: Verificação automática de hashes

### 📊 Dashboard de Estatísticas

- Total de blocos minerados
- BTC em circulação
- Tempo médio entre blocos
- Hashrate da rede
- Estatísticas por minerador
- Total de transações e taxas

## 🎯 Como Usar

### 1. Criar Transações

- **Manual**: Preencha sender, receiver, amount e fee
- **Automático**: Ative geração automática de transações aleatórias
- **Priorização**: Toggle para ordenar por taxa

### 2. Minerar Blocos

1. Escolha o **modo de mineração** (Solo ou Competição)
2. Se houver forks, **selecione qual fork minerar**
3. Clique em "MINE BLOCK" ou "START MINING RACE"
4. Aguarde o proof-of-work ser encontrado

### 3. Validar Integridade

1. Clique em "Validar Blockchain" no header
2. Veja resultado: cadeia válida ou blocos inválidos

### 4. Quebrar Integridade (Educacional)

1. Clique no ícone ✏️ em qualquer bloco minerado
2. Edite os dados do bloco
3. Clique em "💥 Tamper"
4. Valide novamente para ver o bloco ficar inválido

### 5. Criar e Trabalhar com Forks

1. Clique em "Mostrar" no Fork Visualizer
2. Crie um fork manualmente com "+ Criar Fork Manual"
3. Selecione o fork desejado antes de minerar
4. Mine blocos em diferentes forks
5. Observe o consenso: fork mais longo vira cadeia principal

## 🛠️ Tecnologias

- **Angular 18+**: Framework principal com standalone components
- **Signals**: Sistema reativo do Angular
- **Tailwind CSS**: Estilização utilitária
- **crypto-js**: Hashing SHA-256
- **TypeScript**: Tipagem estática

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
