import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export function buildCommandDefinitions() {
  return [
    new SlashCommandBuilder()
      .setName("mod")
      .setDescription("Ações de moderação do servidor")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addSubcommand((s) =>
        s.setName("warn")
          .setDescription("Aplica um aviso a um membro")
          .addUserOption((o) => o.setName("usuario").setDescription("Membro").setRequired(true))
          .addStringOption((o) => o.setName("motivo").setDescription("Motivo do aviso").setMaxLength(500))
      )
      .addSubcommand((s) =>
        s.setName("mute")
          .setDescription("Silencia um membro por um período (ex: 10m, 1h, 2d)")
          .addUserOption((o) => o.setName("usuario").setDescription("Membro").setRequired(true))
          .addStringOption((o) => o.setName("duracao").setDescription("Duração: 10m, 1h, 12h, 2d (máx. 28d)").setRequired(true))
          .addStringOption((o) => o.setName("motivo").setDescription("Motivo").setMaxLength(500))
      )
      .addSubcommand((s) =>
        s.setName("kick")
          .setDescription("Expulsa um membro do servidor")
          .addUserOption((o) => o.setName("usuario").setDescription("Membro").setRequired(true))
          .addStringOption((o) => o.setName("motivo").setDescription("Motivo").setMaxLength(500))
      )
      .addSubcommand((s) =>
        s.setName("ban")
          .setDescription("Bane um usuário do servidor")
          .addUserOption((o) => o.setName("usuario").setDescription("Usuário").setRequired(true))
          .addStringOption((o) => o.setName("motivo").setDescription("Motivo").setMaxLength(500))
          .addIntegerOption((o) =>
            o.setName("apagar_mensagens").setDescription("Dias de mensagens para apagar (0-7)").setMinValue(0).setMaxValue(7)
          )
      )
      .addSubcommand((s) =>
        s.setName("historico")
          .setDescription("Exibe o histórico de infrações de um usuário")
          .addUserOption((o) => o.setName("usuario").setDescription("Usuário").setRequired(true))
      )
      .addSubcommand((s) =>
        s.setName("casos").setDescription("Lista os casos de moderação recentes do servidor")
      )
      .addSubcommand((s) =>
        s.setName("remover")
          .setDescription("Remove/inativa um caso de infração")
          .addIntegerOption((o) => o.setName("caso").setDescription("Número do caso").setRequired(true).setMinValue(1))
      )
      .addSubcommand((s) =>
        s.setName("purge")
          .setDescription("Apaga mensagens em massa do canal atual (máx. 100, últimos 14 dias)")
          .addIntegerOption((o) => o.setName("quantidade").setDescription("Número de mensagens a apagar (1–100)").setRequired(true).setMinValue(1).setMaxValue(100))
          .addUserOption((o) => o.setName("usuario").setDescription("Filtrar apenas mensagens deste usuário (opcional)"))
      ),

    new SlashCommandBuilder()
      .setName("cargo-menu")
      .setDescription("Gerencia menus de seleção de cargos")
      .addSubcommand((s) =>
        s.setName("criar")
          .setDescription("Cria um novo menu de cargos em um canal")
          .addChannelOption((o) => o.setName("canal").setDescription("Canal onde o menu será enviado").setRequired(true))
          .addStringOption((o) => o.setName("titulo").setDescription("Título do menu").setRequired(true).setMaxLength(100))
          .addStringOption((o) => o.setName("descricao").setDescription("Descrição opcional").setMaxLength(200))
          .addIntegerOption((o) => o.setName("max_cargos").setDescription("Máximo de cargos simultâneos (0 = sem limite)").setMinValue(0).setMaxValue(25))
      )
      .addSubcommand((s) =>
        s.setName("opcao-adicionar")
          .setDescription("Adiciona um cargo ao menu")
          .addIntegerOption((o) => o.setName("menu_id").setDescription("ID do menu").setRequired(true).setMinValue(1))
          .addRoleOption((o) => o.setName("cargo").setDescription("Cargo a adicionar").setRequired(true))
          .addStringOption((o) => o.setName("label").setDescription("Texto exibido no menu (padrão: nome do cargo)").setMaxLength(100))
          .addStringOption((o) => o.setName("emoji").setDescription("Emoji da opção").setMaxLength(50))
          .addStringOption((o) => o.setName("descricao").setDescription("Descrição da opção").setMaxLength(100))
      )
      .addSubcommand((s) =>
        s.setName("opcao-remover")
          .setDescription("Remove um cargo do menu")
          .addIntegerOption((o) => o.setName("menu_id").setDescription("ID do menu").setRequired(true).setMinValue(1))
          .addRoleOption((o) => o.setName("cargo").setDescription("Cargo a remover").setRequired(true))
      )
      .addSubcommand((s) =>
        s.setName("remover")
          .setDescription("Remove o menu de cargos e sua mensagem")
          .addIntegerOption((o) => o.setName("menu_id").setDescription("ID do menu").setRequired(true).setMinValue(1))
      )
      .addSubcommand((s) =>
        s.setName("lista").setDescription("Lista todos os menus de cargos deste servidor")
      ),

    new SlashCommandBuilder()
      .setName("reaction-role")
      .setDescription("Gerencia cargos por reação de emoji")
      .addSubcommand((s) =>
        s.setName("adicionar")
          .setDescription("Associa um emoji de uma mensagem a um cargo")
          .addChannelOption((o) => o.setName("canal").setDescription("Canal onde a mensagem está").setRequired(true))
          .addStringOption((o) => o.setName("mensagem_id").setDescription("ID da mensagem").setRequired(true))
          .addStringOption((o) => o.setName("emoji").setDescription("Emoji (unicode ou :nome:)").setRequired(true).setMaxLength(50))
          .addRoleOption((o) => o.setName("cargo").setDescription("Cargo a atribuir").setRequired(true))
      )
      .addSubcommand((s) =>
        s.setName("remover")
          .setDescription("Remove uma reaction role pelo ID")
          .addIntegerOption((o) => o.setName("id").setDescription("ID da reaction role").setRequired(true).setMinValue(1))
      )
      .addSubcommand((s) =>
        s.setName("lista").setDescription("Lista todas as reaction roles deste servidor")
      ),

    new SlashCommandBuilder()
      .setName("tag")
      .setDescription("Gerencia tags — respostas automáticas ativadas por prefixo no chat")
      .addSubcommand((s) =>
        s.setName("criar")
          .setDescription("Cria uma nova tag")
          .addStringOption((o) => o.setName("nome").setDescription("Nome da tag (ex: ajuda)").setRequired(true).setMaxLength(32))
          .addStringOption((o) => o.setName("conteudo").setDescription("Texto de resposta (máx. 2000 caracteres)").setRequired(true).setMaxLength(2000))
      )
      .addSubcommand((s) =>
        s.setName("editar")
          .setDescription("Edita o conteúdo de uma tag existente")
          .addStringOption((o) => o.setName("nome").setDescription("Nome da tag a editar").setRequired(true).setMaxLength(32))
          .addStringOption((o) => o.setName("conteudo").setDescription("Novo conteúdo").setRequired(true).setMaxLength(2000))
      )
      .addSubcommand((s) =>
        s.setName("remover")
          .setDescription("Remove uma tag do servidor")
          .addStringOption((o) => o.setName("nome").setDescription("Nome da tag a remover").setRequired(true).setMaxLength(32))
      )
      .addSubcommand((s) => s.setName("lista").setDescription("Lista todas as tags do servidor"))
      .addSubcommand((s) =>
        s.setName("ver")
          .setDescription("Exibe o conteúdo de uma tag")
          .addStringOption((o) => o.setName("nome").setDescription("Nome da tag").setRequired(true).setMaxLength(32))
      )
      .addSubcommand((s) =>
        s.setName("prefixo")
          .setDescription("Altera o prefixo de ativação das tags (padrão: !)")
          .addStringOption((o) => o.setName("prefixo").setDescription("Novo prefixo (ex: !, ?, -)").setRequired(true).setMaxLength(5))
      ),

    new SlashCommandBuilder()
      .setName("nivel")
      .setDescription("Exibe o nível e XP de um membro")
      .addUserOption((o) => o.setName("usuario").setDescription("Membro (padrão: você mesmo)")),

    new SlashCommandBuilder()
      .setName("top")
      .setDescription("Exibe o ranking de XP do servidor")
      .addIntegerOption((o) => o.setName("pagina").setDescription("Página do ranking (padrão: 1)").setMinValue(1)),

    new SlashCommandBuilder()
      .setName("xp")
      .setDescription("Gerencia o sistema de XP e níveis")
      .addSubcommand((s) =>
        s.setName("reset")
          .setDescription("Zera o XP de um membro")
          .addUserOption((o) => o.setName("usuario").setDescription("Membro").setRequired(true))
      )
      .addSubcommand((s) =>
        s.setName("config")
          .setDescription("Configura o sistema de XP (sem parâmetros = ver configuração atual)")
          .addBooleanOption((o) => o.setName("ativar").setDescription("Ativar ou desativar o sistema de XP"))
          .addChannelOption((o) => o.setName("canal").setDescription("Canal para notificações de level-up"))
          .addIntegerOption((o) => o.setName("xp_mensagem").setDescription("XP base por mensagem (padrão: 15)").setMinValue(1).setMaxValue(100))
          .addIntegerOption((o) => o.setName("cooldown").setDescription("Segundos entre ganhos de XP (padrão: 60)").setMinValue(5).setMaxValue(600))
      )
      .addSubcommand((s) =>
        s.setName("recompensa-adicionar")
          .setDescription("Atribui um cargo como recompensa ao atingir um nível")
          .addIntegerOption((o) => o.setName("nivel").setDescription("Nível necessário").setRequired(true).setMinValue(1))
          .addRoleOption((o) => o.setName("cargo").setDescription("Cargo a entregar").setRequired(true))
      )
      .addSubcommand((s) =>
        s.setName("recompensa-remover")
          .setDescription("Remove a recompensa de cargo de um nível")
          .addIntegerOption((o) => o.setName("nivel").setDescription("Nível da recompensa a remover").setRequired(true).setMinValue(1))
      )
      .addSubcommand((s) => s.setName("recompensas").setDescription("Lista todos os cargos de recompensa configurados")),

    new SlashCommandBuilder()
      .setName("enquete")
      .setDescription("Gerencia enquetes de votação no servidor")
      .addSubcommand((s) =>
        s.setName("criar")
          .setDescription("Cria uma nova enquete com até 5 opções")
          .addStringOption((o) => o.setName("pergunta").setDescription("A pergunta da enquete").setRequired(true).setMaxLength(200))
          .addStringOption((o) => o.setName("opcao1").setDescription("1ª opção").setRequired(true).setMaxLength(80))
          .addStringOption((o) => o.setName("opcao2").setDescription("2ª opção").setRequired(true).setMaxLength(80))
          .addStringOption((o) => o.setName("opcao3").setDescription("3ª opção (opcional)").setMaxLength(80))
          .addStringOption((o) => o.setName("opcao4").setDescription("4ª opção (opcional)").setMaxLength(80))
          .addStringOption((o) => o.setName("opcao5").setDescription("5ª opção (opcional)").setMaxLength(80))
          .addStringOption((o) => o.setName("duracao").setDescription("Duração: 10m, 1h, 2d (padrão: 7d)"))
          .addChannelOption((o) => o.setName("canal").setDescription("Canal para enviar (padrão: atual)"))
      )
      .addSubcommand((s) =>
        s.setName("encerrar")
          .setDescription("Encerra uma enquete e exibe o resultado final")
          .addIntegerOption((o) => o.setName("id").setDescription("ID da enquete").setRequired(true).setMinValue(1))
      )
      .addSubcommand((s) => s.setName("lista").setDescription("Lista todas as enquetes ativas do servidor")),

    new SlashCommandBuilder()
      .setName("sorteio")
      .setDescription("Gerencia sorteios no servidor")
      .addSubcommand((s) =>
        s.setName("criar")
          .setDescription("Cria um novo sorteio")
          .addStringOption((o) => o.setName("premio").setDescription("O que será sorteado").setRequired(true).setMaxLength(200))
          .addStringOption((o) => o.setName("duracao").setDescription("Duração: 10m, 1h, 2d (máx. 30d)").setRequired(true))
          .addIntegerOption((o) => o.setName("vencedores").setDescription("Número de vencedores (padrão: 1)").setMinValue(1).setMaxValue(20))
          .addChannelOption((o) => o.setName("canal").setDescription("Canal para enviar o sorteio (padrão: atual)"))
      )
      .addSubcommand((s) =>
        s.setName("encerrar")
          .setDescription("Encerra um sorteio manualmente e anuncia os vencedores")
          .addIntegerOption((o) => o.setName("id").setDescription("ID do sorteio").setRequired(true).setMinValue(1))
      )
      .addSubcommand((s) =>
        s.setName("reroll")
          .setDescription("Sorteia novos vencedores para um sorteio já encerrado")
          .addIntegerOption((o) => o.setName("id").setDescription("ID do sorteio").setRequired(true).setMinValue(1))
          .addIntegerOption((o) => o.setName("vencedores").setDescription("Quantidade de novos vencedores (padrão: 1)").setMinValue(1).setMaxValue(20))
      )
      .addSubcommand((s) => s.setName("lista").setDescription("Lista todos os sorteios ativos do servidor")),

    new SlashCommandBuilder()
      .setName("automod")
      .setDescription("Configura a moderação automática do servidor")
      .addSubcommand((s) => s.setName("ver").setDescription("Exibe a configuração atual do auto-mod"))
      .addSubcommand((s) =>
        s.setName("palavra-adicionar")
          .setDescription("Adiciona uma palavra proibida à lista")
          .addStringOption((o) => o.setName("palavra").setDescription("Palavra ou frase").setRequired(true).setMaxLength(100))
          .addStringOption((o) =>
            o.setName("acao").setDescription("Ação ao detectar (padrão: apagar)").addChoices(
              { name: "Apenas apagar", value: "delete" },
              { name: "Apagar e avisar", value: "warn" },
              { name: "Apagar e mutar 10min", value: "mute" }
            )
          )
      )
      .addSubcommand((s) =>
        s.setName("palavra-remover")
          .setDescription("Remove uma palavra da lista")
          .addStringOption((o) => o.setName("palavra").setDescription("Palavra a remover").setRequired(true).setMaxLength(100))
      )
      .addSubcommand((s) => s.setName("palavras-lista").setDescription("Lista todas as palavras proibidas"))
      .addSubcommand((s) =>
        s.setName("spam")
          .setDescription("Configura a proteção anti-spam")
          .addBooleanOption((o) => o.setName("ativo").setDescription("Ativar ou desativar").setRequired(true))
          .addIntegerOption((o) => o.setName("mensagens").setDescription("Nº de mensagens para acionar punição").setMinValue(2).setMaxValue(30))
          .addIntegerOption((o) => o.setName("segundos").setDescription("Janela de tempo em segundos").setMinValue(1).setMaxValue(60))
          .addStringOption((o) =>
            o.setName("acao").setDescription("Punição ao detectar spam").addChoices(
              { name: "Apagar e mutar 5min", value: "mute" },
              { name: "Apagar e avisar", value: "warn" }
            )
          )
      )
      .addSubcommand((s) =>
        s.setName("mencoes")
          .setDescription("Define o limite de menções por mensagem (0 = desativado)")
          .addIntegerOption((o) => o.setName("limite").setDescription("Máximo de menções (0 = desativado)").setRequired(true).setMinValue(0).setMaxValue(50))
      )
      .addSubcommand((s) =>
        s.setName("links")
          .setDescription("Ativa ou desativa o bloqueio de links e convites do Discord")
          .addBooleanOption((o) => o.setName("ativo").setDescription("Ativar ou desativar").setRequired(true))
      )
      .addSubcommand((s) =>
        s.setName("raid")
          .setDescription("Configura a proteção contra raids (entradas em massa)")
          .addBooleanOption((o) => o.setName("ativo").setDescription("Ativar ou desativar").setRequired(true))
          .addIntegerOption((o) => o.setName("entradas").setDescription("Nº de entradas para disparar o alerta").setMinValue(3).setMaxValue(50))
          .addIntegerOption((o) => o.setName("segundos").setDescription("Janela de tempo em segundos").setMinValue(5).setMaxValue(120))
      )
      .addSubcommand((s) =>
        s.setName("isentar-canal")
          .setDescription("Isenta um canal das regras de auto-mod")
          .addChannelOption((o) => o.setName("canal").setDescription("Canal a isentar").setRequired(true))
      )
      .addSubcommand((s) =>
        s.setName("isentar-cargo")
          .setDescription("Isenta um cargo das regras de auto-mod")
          .addRoleOption((o) => o.setName("cargo").setDescription("Cargo a isentar").setRequired(true))
      ),

    new SlashCommandBuilder()
      .setName("starboard")
      .setDescription("Gerencia o starboard — canal de mensagens em destaque")
      .addSubcommand((s) =>
        s.setName("configurar")
          .setDescription("Ativa e configura o starboard")
          .addChannelOption((o) => o.setName("canal").setDescription("Canal onde as mensagens em destaque serão enviadas").setRequired(true))
          .addStringOption((o) => o.setName("emoji").setDescription("Emoji de reação para o starboard (padrão: ⭐)").setMaxLength(50))
          .addIntegerOption((o) => o.setName("minimo").setDescription("Mínimo de reações para entrar no starboard (padrão: 3)").setMinValue(1).setMaxValue(50))
      )
      .addSubcommand((s) => s.setName("ver").setDescription("Exibe a configuração atual do starboard"))
      .addSubcommand((s) => s.setName("desativar").setDescription("Desativa o starboard sem apagar a configuração")),

    new SlashCommandBuilder()
      .setName("stats")
      .setDescription("Gerencia canais de estatísticas do servidor")
      .addSubcommand((s) =>
        s.setName("criar")
          .setDescription("Cria ou atualiza um canal de estatísticas")
          .addStringOption((o) =>
            o.setName("tipo").setDescription("Tipo de estatística").setRequired(true).addChoices(
              { name: "👥 Membros totais", value: "membros" },
              { name: "🧑 Membros humanos", value: "humanos" },
              { name: "🤖 Bots", value: "bots" },
              { name: "📢 Canais", value: "canais" },
              { name: "🏷️ Cargos", value: "cargos" }
            )
          )
          .addChannelOption((o) => o.setName("canal").setDescription("Canal de voz a usar como stat (será renomeado automaticamente)").setRequired(true))
          .addStringOption((o) => o.setName("formato").setDescription('Formato do nome. Use {value} para o número. Ex: 👥 Membros: {value}').setMaxLength(100))
      )
      .addSubcommand((s) =>
        s.setName("remover")
          .setDescription("Remove um canal de estatísticas")
          .addStringOption((o) =>
            o.setName("tipo").setDescription("Tipo a remover").setRequired(true).addChoices(
              { name: "👥 Membros totais", value: "membros" },
              { name: "🧑 Membros humanos", value: "humanos" },
              { name: "🤖 Bots", value: "bots" },
              { name: "📢 Canais", value: "canais" },
              { name: "🏷️ Cargos", value: "cargos" }
            )
          )
      )
      .addSubcommand((s) => s.setName("lista").setDescription("Lista todos os canais de estatísticas configurados"))
      .addSubcommand((s) => s.setName("atualizar").setDescription("Força atualização imediata de todos os canais de estatísticas")),

    new SlashCommandBuilder()
      .setName("ticket-painel")
      .setDescription("Envia o painel para abrir tickets de atendimento")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName("config")
      .setDescription("Configura o bot de tickets neste servidor")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand((s) =>
        s
          .setName("painel")
          .setDescription("Abre o painel visual de configuração")
      ),

    new SlashCommandBuilder()
      .setName("configurar")
      .setDescription("Configura o bot para este servidor")
      .addSubcommand((s) =>
        s.setName("boas-vindas")
          .setDescription("Configura o sistema de boas-vindas (requer Gerenciar servidor)")
          .addChannelOption((o) => o.setName("canal").setDescription("Canal onde a mensagem de boas-vindas será enviada"))
          .addStringOption((o) =>
            o.setName("mensagem").setDescription("Mensagem de boas-vindas. Use {usuario}, {servidor}, {membros}").setMaxLength(1000)
          )
          .addChannelOption((o) => o.setName("canal-despedida").setDescription("Canal onde a mensagem de despedida será enviada"))
          .addStringOption((o) =>
            o.setName("mensagem-despedida").setDescription("Mensagem de despedida. Use {tag}, {servidor}, {membros}").setMaxLength(1000)
          )
          .addStringOption((o) =>
            o.setName("dm").setDescription("Mensagem enviada por DM quando alguém entra no servidor").setMaxLength(1000)
          )
          .addRoleOption((o) => o.setName("auto-cargo").setDescription("Cargo dado automaticamente a quem entrar no servidor"))
      )
      .addSubcommand((s) =>
        s.setName("logs")
          .setDescription("Configura o canal e os eventos de log (requer Gerenciar servidor)")
          .addChannelOption((o) => o.setName("canal").setDescription("Canal onde os logs do servidor serão enviados"))
          .addBooleanOption((o) => o.setName("mensagem-editada").setDescription("Registrar mensagens editadas"))
          .addBooleanOption((o) => o.setName("mensagem-apagada").setDescription("Registrar mensagens apagadas"))
          .addBooleanOption((o) => o.setName("membro-entrou").setDescription("Registrar entrada de membros"))
          .addBooleanOption((o) => o.setName("membro-saiu").setDescription("Registrar saída de membros"))
          .addBooleanOption((o) => o.setName("membro-banido").setDescription("Registrar banimentos"))
          .addBooleanOption((o) => o.setName("membro-desbanido").setDescription("Registrar desbanimentos"))
          .addBooleanOption((o) => o.setName("cargo-alterado").setDescription("Registrar alterações de cargo de membros"))
          .addBooleanOption((o) => o.setName("apelido-alterado").setDescription("Registrar mudanças de apelido"))
      )
      .addSubcommand((s) =>
        s.setName("ver").setDescription("Mostra a configuração atual de boas-vindas e logs do servidor")
      ),

    new SlashCommandBuilder()
      .setName("ticket")
      .setDescription("Ações em tickets")
      .addSubcommand((s) =>
        s
          .setName("add")
          .setDescription("Adiciona um membro ao ticket atual")
          .addUserOption((o) =>
            o.setName("usuario").setDescription("Membro").setRequired(true)
          )
      )
      .addSubcommand((s) =>
        s
          .setName("remove")
          .setDescription("Remove um membro do ticket atual")
          .addUserOption((o) =>
            o.setName("usuario").setDescription("Membro").setRequired(true)
          )
      )
      .addSubcommand((s) =>
        s.setName("stats").setDescription("Estatísticas de tickets do servidor")
      ),
  ].map((c) => c.toJSON());
}
