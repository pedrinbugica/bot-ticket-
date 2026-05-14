/** Tipos de ticket exibidos no painel (StringSelectMenu, máx. 25 opções). */
export const TICKET_TYPES = [
  {
    value: "suporte",
    label: "Suporte geral",
    description: "Dúvidas, bugs e ajuda geral",
    emoji: "🛟",
  },
  {
    value: "financeiro",
    label: "Financeiro",
    description: "Pagamentos, assinaturas e reembolsos",
    emoji: "💳",
  },
  {
    value: "denuncia",
    label: "Denúncia",
    description: "Reportar usuário ou conteúdo",
    emoji: "⚠️",
  },
];

export function getTicketType(value) {
  return TICKET_TYPES.find((t) => t.value === value) ?? null;
}
