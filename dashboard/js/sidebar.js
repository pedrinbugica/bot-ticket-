// Sidebar HTML compartilhada entre todas as páginas
export function sidebarHTML(guildName = "") {
  return `
  <div class="sidebar-header">
    <h1>🤖 Bot Admin</h1>
    <p>Painel de controle</p>
  </div>
  ${guildName ? `<div class="sidebar-guild"><span>Servidor ativo</span><strong>${guildName}</strong></div>` : ""}
  <span class="nav-group">Visão geral</span>
  <a href="/overview.html" data-page="overview"><span class="icon">📊</span> Overview</a>
  <a href="/tickets.html" data-page="tickets"><span class="icon">🎫</span> Tickets</a>
  <a href="/moderation.html" data-page="moderation"><span class="icon">🔨</span> Moderação</a>
  <a href="/leveling.html" data-page="leveling"><span class="icon">⭐</span> XP e Níveis</a>

  <span class="nav-group">Módulos</span>
  <a href="/modules.html" data-page="modules"><span class="icon">🔧</span> Todos os módulos</a>
  <a href="/module-welcome.html" data-page="welcome"><span class="icon">👋</span> Boas-vindas</a>
  <a href="/module-automod.html" data-page="automod"><span class="icon">🛡️</span> Auto-moderação</a>
  <a href="/module-logs.html" data-page="logs"><span class="icon">📋</span> Logs</a>
  <a href="/module-starboard.html" data-page="starboard"><span class="icon">⭐</span> Starboard</a>
  <a href="/module-jtc.html" data-page="jtc"><span class="icon">🎮</span> Join-to-Create</a>
  <a href="/module-counting.html" data-page="counting"><span class="icon">🔢</span> Counting Game</a>
  <a href="/module-stats.html" data-page="stats"><span class="icon">📊</span> Canais de Stats</a>
  <a href="/roles.html" data-page="roles"><span class="icon">🏷️</span> Cargos e Roles</a>

  <span class="nav-group">Conteúdo</span>
  <a href="/tags.html" data-page="tags"><span class="icon">💬</span> Tags</a>
  <a href="/giveaways.html" data-page="giveaways"><span class="icon">🎉</span> Sorteios</a>
  <a href="/polls.html" data-page="polls"><span class="icon">📊</span> Enquetes</a>
  <a href="/birthdays.html" data-page="birthdays"><span class="icon">🎂</span> Aniversários</a>
  <a href="/scheduled.html" data-page="scheduled"><span class="icon">📅</span> Agendados</a>

  <div class="sidebar-footer">
    <button class="btn btn-ghost btn-sm" id="changeGuildBtn" style="width:100%;margin-bottom:8px">↩ Trocar servidor</button>
    <button class="btn btn-ghost btn-sm" id="logoutBtn" style="width:100%">Sair</button>
  </div>`;
}
