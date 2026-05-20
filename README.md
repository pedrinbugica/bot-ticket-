# Bot de Administração do Discord

Bot profissional multi-servidor para Discord, construído com Node.js, discord.js v14 e SQLite. Inclui sistema de tickets, moderação, logs, boas-vindas, menus de cargos, auto-moderação, sorteios, enquetes, XP/níveis e tags personalizadas.

---

## Funcionalidades

| Módulo | O que faz |
|--------|-----------|
| **Tickets** | Painel de atendimento com tipos configuráveis, transcripts e fechamento por inatividade |
| **Moderação** | Warn, mute, kick, ban com histórico de casos por servidor |
| **Logs** | Registro automático de mensagens editadas/apagadas, entradas, saídas, bans e alterações de cargo |
| **Boas-vindas** | Mensagem de entrada/saída personalizável com auto-cargo |
| **Menu de Cargos** | Dropdown para membros escolherem seus próprios cargos |
| **Reaction Roles** | Cargos atribuídos/removidos por reação de emoji |
| **Auto-Moderação** | Filtro de palavras, anti-spam, anti-menção, filtro de links e proteção anti-raid |
| **Sorteios** | Sorteios com timer automático, botão de participação e reroll |
| **Enquetes** | Votações com barras de progresso e encerramento automático |
| **XP e Níveis** | Sistema de experiência por mensagem com ranking, recompensas e notificações |
| **Tags** | Respostas automáticas por prefixo configurável (ex: `!ajuda`) |

---

## Requisitos

- Node.js 18 ou superior
- npm
- Conta no [Discord Developer Portal](https://discord.com/developers/applications)

---

## Instalação

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd bot-ticket

# 2. Instale as dependências
npm install

# 3. Copie o arquivo de ambiente
cp .env.example .env
```

---

## Configuração do `.env`

Abra o arquivo `.env` e preencha:

```env
# Token do bot (obrigatório — copie do Developer Portal)
DISCORD_TOKEN=seu_token_aqui

# Caminho do banco SQLite (criado automaticamente)
DATABASE_PATH=data/bot.db

# true = comandos globais (demora até 1h para aparecer)
# false = registra por servidor ao entrar (instantâneo — recomendado para testes)
DEPLOY_GLOBAL=false

# Fechar tickets sem atividade após N horas (0 = desligado)
INACTIVITY_HOURS=24

# Enviar transcript por DM ao fechar ticket
SEND_DM_ON_CLOSE=true
```

---

## Configuração no Discord Developer Portal

1. Acesse [discord.com/developers/applications](https://discord.com/developers/applications)
2. Selecione seu bot → **Bot → Privileged Gateway Intents** e ative:
   - **Server Members Intent**
   - **Message Content Intent**
3. Vá em **OAuth2 → URL Generator**, marque os escopos `bot` e `applications.commands`
4. Em **Bot Permissions**, marque: Manage Roles, Kick Members, Ban Members, Moderate Members, Send Messages, Manage Messages, Read Message History, Embed Links, Add Reactions, View Channels
5. Use a URL gerada para convidar o bot ao servidor

---

## Iniciando o bot

```bash
npm start
```

Com Docker:

```bash
docker compose up -d
docker compose logs -f   # acompanhar logs
docker compose down      # parar
```

---

## Referência de Comandos

### Configuração Geral
| Comando | Descrição |
|---------|-----------|
| `/config painel` | Abre o painel visual de configuração |

### Tickets
| Comando | Descrição |
|---------|-----------|
| `/ticket-painel` | Envia o painel de abertura de tickets |
| `/ticket add @usuario` | Adiciona membro ao ticket |
| `/ticket remove @usuario` | Remove membro do ticket |
| `/ticket stats` | Estatísticas de tickets |

### Moderação
| Comando | Descrição |
|---------|-----------|
| `/mod warn @user [motivo]` | Aplica aviso |
| `/mod mute @user <duracao> [motivo]` | Silencia (ex: `10m`, `1h`, `2d`) |
| `/mod kick @user [motivo]` | Expulsa |
| `/mod ban @user [motivo]` | Bane |
| `/mod historico @user` | Histórico de infrações |
| `/mod casos` | Casos recentes do servidor |
| `/mod remover caso:<id>` | Remove/inativa caso |

### Logs
Configurado via `/config painel` → tela **Logs**. Eventos: mensagem editada/apagada, entrada/saída, ban/unban, cargo alterado, apelido alterado.

### Boas-vindas
Configurado via `/config painel` → tela **Boas-vindas**. Variáveis: `{usuario}` `{tag}` `{servidor}` `{membros}`

### Menu de Cargos
| Comando | Descrição |
|---------|-----------|
| `/cargo-menu criar <canal> <titulo>` | Cria menu |
| `/cargo-menu opcao-adicionar <menu_id> <cargo>` | Adiciona cargo |
| `/cargo-menu opcao-remover <menu_id> <cargo>` | Remove cargo |
| `/cargo-menu remover <menu_id>` | Remove menu |
| `/cargo-menu lista` | Lista menus |

### Reaction Roles
| Comando | Descrição |
|---------|-----------|
| `/reaction-role adicionar <canal> <mensagem_id> <emoji> <cargo>` | Cria |
| `/reaction-role remover <id>` | Remove |
| `/reaction-role lista` | Lista |

### Auto-Moderação
| Comando | Descrição |
|---------|-----------|
| `/automod ver` | Configuração atual |
| `/automod palavra-adicionar <palavra> [acao]` | Adiciona palavra proibida |
| `/automod palavra-remover <palavra>` | Remove palavra |
| `/automod palavras-lista` | Lista palavras |
| `/automod spam <ativo> [msgs] [segs] [acao]` | Anti-spam |
| `/automod mencoes <limite>` | Limite de menções por mensagem |
| `/automod links <ativo>` | Filtro de links/convites |
| `/automod raid <ativo> [entradas] [segs]` | Anti-raid |
| `/automod isentar-canal <canal>` | Isenta canal |
| `/automod isentar-cargo <cargo>` | Isenta cargo |

### Sorteios
| Comando | Descrição |
|---------|-----------|
| `/sorteio criar <premio> <duracao> [vencedores] [canal]` | Cria sorteio |
| `/sorteio encerrar <id>` | Encerra manualmente |
| `/sorteio reroll <id> [vencedores]` | Sorteia novos vencedores |
| `/sorteio lista` | Lista sorteios ativos |

### Enquetes
| Comando | Descrição |
|---------|-----------|
| `/enquete criar <pergunta> <opcao1> <opcao2> [opcao3-5] [duracao] [canal]` | Cria enquete |
| `/enquete encerrar <id>` | Encerra e publica resultado |
| `/enquete lista` | Lista enquetes ativas |

### XP e Níveis
| Comando | Descrição |
|---------|-----------|
| `/nivel [usuario]` | Nível, XP e progresso |
| `/top [pagina]` | Ranking do servidor |
| `/xp config [ativar] [canal] [xp_mensagem] [cooldown]` | Configura sistema |
| `/xp reset <usuario>` | Zera XP |
| `/xp recompensa-adicionar <nivel> <cargo>` | Cargo de recompensa |
| `/xp recompensa-remover <nivel>` | Remove recompensa |
| `/xp recompensas` | Lista recompensas |

### Tags
| Comando | Descrição |
|---------|-----------|
| `/tag criar <nome> <conteudo>` | Cria tag |
| `/tag editar <nome> <conteudo>` | Edita conteúdo |
| `/tag remover <nome>` | Remove tag |
| `/tag lista` | Lista todas as tags |
| `/tag ver <nome>` | Pré-visualiza tag |
| `/tag prefixo <prefixo>` | Altera prefixo (padrão: `!`) |

Membros usam as tags digitando `!nome` no chat.

---

## Banco de Dados

SQLite com migrations automáticas. O arquivo é criado automaticamente no caminho definido em `DATABASE_PATH`. Nenhuma configuração manual necessária.

---

## Estrutura do Projeto

```
src/
├── automod/          # Motor de auto-moderação
├── commands/
│   ├── definitions.js    # Definições dos slash commands
│   ├── handlers/         # Handlers de cada comando
│   └── register.js       # Registro dos comandos na API
├── config/           # Configuração por servidor (cache + env)
├── config-ui/        # Painel visual de configuração (/config painel)
├── db/               # Funções de banco de dados por módulo
├── events/           # Listeners de eventos do Discord
├── giveaway/         # Lógica de sorteios
├── handlers/         # Roteador central de interações
├── jobs/             # Jobs periódicos (inatividade, mutes, sorteios, enquetes)
├── leveling/         # Sistema de XP e níveis
├── moderation/       # Lógica de ações de moderação
├── polls/            # Lógica de enquetes
├── roles/            # Menu de cargos e reaction roles
├── tags/             # Sistema de tags
├── tickets/          # Lógica de tickets
├── util/             # Utilitários (permissões, emoji, etc.)
├── welcome/          # Lógica de boas-vindas
└── index.js          # Ponto de entrada
```