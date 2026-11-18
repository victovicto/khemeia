# Khemeia — Backend ⚗️

API REST de um aplicativo mobile que ajuda estudantes do ensino médio a aprender **Química Orgânica**: o aluno desenha moléculas, estuda por assunto, responde quizzes, acompanha seu desempenho e recebe curiosidades e questões geradas por IA.

Projeto de conclusão do **Ensino Médio Técnico em Informática** na **Fundação Matias Machline (FMM)**, em Manaus – AM, desenvolvido em equipe.

📱 Screenshots
<p align="center"> <img src="docs/screenshots/01-onboarding.jpg" width="220" alt="Onboarding" /> <img src="docs/screenshots/02-tela-inicial.jpg" width="220" alt="Tela inicial" /> <img src="docs/screenshots/03-busca-composto.jpg" width="220" alt="Busca de composto" /> </p> <p align="center"> <img src="docs/screenshots/04-editor-molecular.jpg" width="220" alt="Editor molecular" /> <img src="docs/screenshots/05-explorador-assuntos.jpg" width="220" alt="Explorador de assuntos" /> <img src="docs/screenshots/06-quiz.jpg" width="220" alt="Quiz" /> </p>
Tela	Descrição
Onboarding	Apresentação do app, com foco em vestibulares
Tela inicial	Busca de compostos, ofensiva de estudos e atalhos
Busca de composto	Fórmula molecular, massa, SMILES e estrutura (ex.: etanol)
Editor molecular	Desenhe moléculas e capture o nome do composto
Explorador de assuntos	Módulos de Química Orgânica e progresso de estudo
Quiz	Questões contextualizadas no estilo dos vestibulares

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)
![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render&logoColor=white)

**Stack em uma linha:** Node.js + Express + MongoDB (Mongoose) + JWT + Together AI, com deploy no Render.

> 📱 O cliente é um app **Flutter/Dart** que consome esta API. Por ser um projeto acadêmico, ele foi executado diretamente em dispositivo físico a partir do VS Code, sem publicação em loja.

---

## 📑 Sumário

- [Funcionalidades](#-funcionalidades)
- [Destaques técnicos](#-destaques-técnicos)
- [Tecnologias](#️-tecnologias)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Como executar localmente](#-como-executar-localmente)
- [Variáveis de ambiente](#-variáveis-de-ambiente)
- [Endpoints](#-endpoints)
- [Modelos de dados](#️-modelos-de-dados)
- [Deploy no Render](#️-deploy-no-render)
- [Equipe](#-equipe)

## ✨ Funcionalidades

- **Autenticação:** cadastro, login e edição de perfil, com sessão via JWT
- **Moléculas:** salvar e carregar estruturas químicas (formato Molfile) vinculadas ao usuário
- **Assuntos:** resumo, vídeo e questões de cada tópico de química orgânica
- **Quiz:** 5 questões aleatórias por assunto, sorteadas do banco de questões
- **Desempenho:** registro de acertos e erros e estatísticas por assunto
- **IA:** curiosidade e quiz de 5 questões no estilo ENEM sobre qualquer composto, em português

## 🎯 Destaques técnicos

- **Autenticação segura:** senhas armazenadas com hash `bcrypt` (10 rounds), tokens JWT com expiração de 1 hora e um middleware que protege as rotas privadas e identifica o usuário pelo token, sem depender de IDs enviados pelo cliente.
- **Estatísticas com agregação do MongoDB:** o desempenho é calculado em uma pipeline (`$match`, `$group`, `$project`, `$sort`) que agrupa por assunto, conta acertos e erros, calcula o percentual e identifica o melhor e o pior assunto do aluno, além da média de respostas por dia.
- **Quiz aleatório no banco:** o sorteio das questões usa o operador `$sample`, sem carregar a coleção inteira na aplicação.
- **Integração com LLM:** a API conversa com a Together AI (Mistral-7B-Instruct) usando prompts estruturados. As respostas do quiz vêm em texto livre e são convertidas em JSON por um *parser* com expressões regulares, que valida enunciado, as 4 alternativas e a resposta correta, descartando questões malformadas.
- **Tratamento de falhas da IA:** quando o modelo responde em inglês, o backend detecta e refaz a chamada com um prompt mais restritivo. As duas gerações (curiosidade e quiz) rodam em paralelo com `Promise.all`.
- **Validação de dados no modelo:** cada assunto aceita de 1 a 5 questões, título único e e-mail de usuário único, garantidos pelo schema do Mongoose.
- **CORS configurado por ambiente:** as rotas de IA aceitam qualquer origem em desenvolvimento e restringem às origens permitidas em produção.

## 🛠️ Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js (ES Modules) |
| Framework | Express 4 |
| Banco de dados | MongoDB com Mongoose 8 |
| Autenticação | JSON Web Token (`jsonwebtoken`) e `bcryptjs` |
| IA | [Together AI](https://www.together.ai/) — modelo `mistralai/Mistral-7B-Instruct-v0.1`, consumido via `axios` |
| Outros | `cors`, `dotenv` |
| Hospedagem | [Render](https://render.com) |

> A IA é um serviço de terceiros integrado ao app como apoio ao aprendizado; o modelo não foi desenvolvido pela equipe.

## 📁 Estrutura do projeto

```
khemeia/
├── config/
│   └── together.js        # Cliente axios da API da Together AI
├── middleware/
│   └── authid.js          # Valida o JWT e injeta o id do usuário na requisição
├── models/
│   ├── usuario.js         # Usuários
│   ├── molecula.js        # Moléculas salvas (nome + molfile)
│   ├── assunto.js         # Assuntos com resumo, vídeo e até 5 questões
│   ├── questoes.js        # Banco de questões usado no quiz
│   └── desempenhos.js     # Respostas dos usuários
├── routes/
│   ├── auth.js            # /auth
│   ├── molecule.js        # /molecule
│   ├── assunto.js         # /assunto
│   ├── quiz.js            # /quiz
│   ├── desempenho.js      # /desempenho
│   └── ai.js              # /ai
├── .env.example           # Modelo das variáveis de ambiente
├── server.js              # Ponto de entrada da aplicação
└── package.json
```

## 🚀 Como executar localmente

**Pré-requisitos:** [Node.js](https://nodejs.org/) 18+, um banco MongoDB (local ou [MongoDB Atlas](https://www.mongodb.com/atlas)) e uma chave de API da [Together AI](https://www.together.ai/).

```bash
# 1. Clone o repositório
git clone https://github.com/victovicto/khemeia.git
cd khemeia

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# edite o .env com seus valores

# 4. Inicie o servidor
npm start
```

O servidor sobe em `http://localhost:3001`. Para conferir, acesse `GET /` ou `GET /ai/ping`.

## 🔐 Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta do servidor (padrão: `3001`) |
| `MONGO_URI` | String de conexão com o MongoDB |
| `JWT_SECRET` | Segredo usado para assinar e validar os tokens JWT |
| `TOGETHER_API_KEY` | Chave de acesso à API da Together AI |
| `NODE_ENV` | Em `production`, o CORS das rotas de IA restringe as origens permitidas |

> ⚠️ O `.env` está no `.gitignore`. Nunca envie suas chaves para o GitHub.

## 📡 Endpoints

Rotas marcadas com 🔒 exigem o header `Authorization: Bearer <token>`, obtido no login.

### Geral

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/` | Verifica se o servidor está no ar |

### Autenticação — `/auth`

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/auth/cadastro` | Cadastra um usuário (`nome`, `email`, `senha`) |
| `POST` | `/auth/login` | Autentica e retorna `token`, `id` e `nome` (`email`, `senha`) |
| `GET` | `/auth/perfil` 🔒 | Retorna os dados do usuário logado (sem a senha) |
| `PUT` | `/auth/perfil` 🔒 | Atualiza `nome`, `email` e/ou senha (`senhaAtual` + `novaSenha`) |

### Moléculas — `/molecule`

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/molecule/salvar-molecula` 🔒 | Salva uma molécula (`name`, `molfile`) |
| `GET` | `/molecule/carregar-molecula/:id` | Carrega uma molécula pelo ID |
| `GET` | `/molecule/moleculas-usuario` 🔒 | Lista as moléculas do usuário logado |

### Assuntos e quiz

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/assunto/:titulo` | Retorna `resumo`, `videoUrl` e `questoes` do assunto |
| `GET` | `/quiz/:assunto` | Retorna 5 questões aleatórias do assunto |

### Desempenho — `/desempenho`

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/desempenho/salvar` 🔒 | Registra uma resposta (`assunto`, `acertou`) |
| `GET` | `/desempenho` 🔒 | Retorna melhor e pior assunto, totais de respostas, acertos e erros e média por dia |

### Inteligência Artificial — `/ai`

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/ai/analisar-molecula` | Gera uma curiosidade e 5 questões estilo ENEM sobre o composto |
| `POST` | `/ai/curiosidade-molecula` | Gera apenas a curiosidade sobre o composto |
| `GET` | `/ai/ping` | Health-check do serviço de IA |

### Exemplos

**Login**

```http
POST /auth/login
Content-Type: application/json

{
  "email": "aluno@email.com",
  "senha": "123456"
}
```

```json
{
  "mensagem": "Login bem-sucedido",
  "token": "eyJhbGciOi...",
  "id": "64f1c2...",
  "nome": "Aluno"
}
```

**Análise de molécula com IA**

```http
POST /ai/analisar-molecula
Content-Type: application/json

{
  "moleculeName": "etanol"
}
```

```json
{
  "nome": "etanol",
  "curiosidade": "O etanol é ...",
  "perguntas": [
    {
      "enunciado": "...",
      "alternativas": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correta": "B"
    }
  ],
  "metadata": {
    "source": "Desconhecido",
    "method": "Desconhecido",
    "additionalInfo": null,
    "processedAt": "2025-01-01T12:00:00.000Z"
  }
}
```

**Estatísticas de desempenho**

```http
GET /desempenho
Authorization: Bearer <token>
```

```json
{
  "melhorDesempenho": { "assunto": "Funções Orgânicas", "totalRespondidas": 10, "totalAcertos": 9, "totalErros": 1, "percentual": 90 },
  "piorDesempenho":   { "assunto": "Isomeria", "totalRespondidas": 5, "totalAcertos": 2, "totalErros": 3, "percentual": 40 },
  "totalRespondidas": 15,
  "totalAcertos": 11,
  "totalErros": 4,
  "mediaPorDia": 7.5
}
```

## 🗄️ Modelos de dados

- **Usuario:** `nome`, `email` (único), `senha` (hash)
- **Molecule:** `name`, `molfile`, `usuarioId`
- **Assunto:** `titulo` (único), `descricao`, `resumo`, `videoUrl`, `questoes` (de 1 a 5, com alternativas e explicação), `ativo`, `ordem`
- **Question:** `enunciado`, `imagem`, `alternativas` (letra, texto, correta), `assunto`, `dificuldade`, `ano`, `fonte`
- **Desempenho:** `usuarioId`, `questaoId`, `assunto`, `acertou`, `data`

## ☁️ Deploy no Render

O backend foi publicado como **Web Service** no Render, conectado a este repositório do GitHub, para que o app pudesse fazer as requisições em ambiente real.

| Configuração | Valor |
|--------------|-------|
| Build Command | `npm install` |
| Start Command | `npm start` |
| Variáveis de ambiente | `MONGO_URI`, `JWT_SECRET`, `TOGETHER_API_KEY`, `NODE_ENV=production` |

> 💡 No plano gratuito do Render, o serviço entra em modo de inatividade após um período sem uso, então a primeira requisição pode demorar alguns segundos.

## 👥 Equipe

- **Victor Hugo Cortez de Souza** — Desenvolvedor Frontend e Backend
- **Maria Clara Passos da Silva** — Designer
- **Almino Dias de Lima Júnior** — Analista

**Orientador:** Davi Cauassa Leão

## 📄 Licença

Projeto acadêmico desenvolvido para fins educacionais.
