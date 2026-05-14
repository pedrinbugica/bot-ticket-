# bot-ticket

Bot de **atendimento no Discord** com **sistema de tickets** em canais privados. Usuários abrem tickets por um painel com menu; a equipe responde no canal criado, pode **assumir** o atendimento e **encerrar** com confirmação, gerando **transcript** e log opcional.

## Funcionalidades

- Comando slash **`/ticket-painel`** (apenas **administradores** do servidor): envia embed + menu para escolher o tipo de ticket.
- Tipos configuráveis em código (`src/constants/ticketTypes.js`): por padrão **Suporte geral**, **Financeiro** e **Denúncia**.
- Um ticket ativo por usuário na categoria configurada (evita spam de canais).
- Canal privado: vê o **autor do ticket**, **cargos de suporte**, **dono do servidor** e o **bot**; demais membros não veem o canal.
- Botões **Assumir** e **Fechar ticket** (staff ou dono do servidor); fechamento em duas etapas (confirmar / cancelar).
- Ao fechar: gera **arquivo de transcript** (até ~500 mensagens), envia embed de resumo ao canal de log (se configurado), apaga o canal do ticket.

## Requisitos

- [Node.js](https://nodejs.org/) **>= 18.17**
- Conta e aplicação no [Discord Developer Portal](https://discord.com/developers/applications)

## Stack

- [discord.js](https://discord.js.org/) v14
- [dotenv](https://github.com/motdotla/dotenv)
- Módulos ES (`"type": "module"`)

## Como rodar

```bash
git clone <url-do-seu-repo>
cd bot-ticket
npm install
