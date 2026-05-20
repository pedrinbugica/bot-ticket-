import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { ID } from "./constants.js";
import { getTicketTypeRow } from "../db/ticketTypes.js";

const APARENCIA_TITLES = {
  titulo: "Título do painel",
  descricao: "Descrição extra",
  regras: "Regras do painel",
  cor: "Cor do painel",
  rodape: "Rodapé do painel",
  imagem: "Imagem do painel",
};

const CLEARABLE_FIELDS = new Set(["descricao", "regras", "rodape", "imagem"]);

export function modalWantsClear(interaction) {
  try {
    const v = interaction.fields.getTextInputValue("limpar")?.trim().toUpperCase();
    return v === "APAGAR" || v === "LIMPAR" || v === "-";
  } catch {
    return false;
  }
}

export function buildAparenciaModal(field, cfg) {
  const modal = new ModalBuilder()
    .setCustomId(ID.modalAparencia(field))
    .setTitle(APARENCIA_TITLES[field] ?? "Editar");

  const values = {
    titulo: cfg.panelTitle,
    descricao: cfg.panelDescription ?? "",
    regras: cfg.panelRules ?? "",
    cor: `#${cfg.ticketPanelColor.toString(16).padStart(6, "0")}`,
    rodape: cfg.panelFooter ?? "",
    imagem: cfg.panelImageUrl ?? "",
  };

  const style =
    field === "regras" || field === "descricao"
      ? TextInputStyle.Paragraph
      : TextInputStyle.Short;

  const input = new TextInputBuilder()
    .setCustomId("valor")
    .setLabel(
      field === "imagem"
        ? "URL da imagem (https://…)"
        : CLEARABLE_FIELDS.has(field)
          ? "Novo texto (pode ficar vazio)"
          : "Valor"
    )
    .setStyle(style)
    .setRequired(field === "titulo" || field === "cor")
    .setMaxLength(field === "imagem" ? 500 : 4000);

  const current = (values[field] ?? "").slice(0, 4000);
  if (current && !CLEARABLE_FIELDS.has(field)) {
    input.setValue(current);
  } else if (current && CLEARABLE_FIELDS.has(field)) {
    input.setValue(current);
    input.setPlaceholder("Apague o texto ou use o campo abaixo");
  } else {
    input.setPlaceholder(
      field === "imagem" ? "URL https://… ou use APAGAR abaixo" : "Deixe vazio ou use APAGAR abaixo"
    );
  }

  if (field === "cor") input.setMaxLength(7);

  const rows = [new ActionRowBuilder().addComponents(input)];

  if (CLEARABLE_FIELDS.has(field)) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("limpar")
          .setLabel("Apagar este campo")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setPlaceholder("Digite APAGAR para limpar")
          .setMaxLength(10)
      )
    );
  }

  modal.addComponents(...rows);
  return modal;
}

export function buildInactModal(cfg) {
  const modal = new ModalBuilder().setCustomId(ID.modalInact).setTitle("Horas de inatividade");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("horas")
        .setLabel("Horas (0 = desligar)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(String(cfg.inactivityHours ?? 0))
        .setMaxLength(4)
    )
  );

  return modal;
}

export function buildTipoAddModal() {
  return new ModalBuilder()
    .setCustomId(ID.modalTipoAdd)
    .setTitle("Novo tipo de ticket")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("valor")
          .setLabel("ID interno (ex: suporte)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(32)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("nome")
          .setLabel("Nome exibido")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("descricao")
          .setLabel("Descrição curta")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("emoji")
          .setLabel("Emoji (opcional)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(10)
      )
    );
}

const WELCOME_MODAL_TITLES = {
  entrada: "Mensagem de boas-vindas",
  saida: "Mensagem de saída",
  dm: "DM de boas-vindas",
};

const WELCOME_MODAL_PLACEHOLDERS = {
  entrada: "Ex: Bem-vindo(a) {usuario} ao {servidor}! 🎉",
  saida: "Ex: {tag} saiu. Agora somos {membros} membros.",
  dm: "Ex: Olá {tag}! Bem-vindo(a) ao {servidor}.",
};

export function buildWelcomeMessageModal(type, currentValue) {
  const modal = new ModalBuilder()
    .setCustomId(ID.welcomeModal(type))
    .setTitle(WELCOME_MODAL_TITLES[type] ?? "Editar mensagem");

  const input = new TextInputBuilder()
    .setCustomId("mensagem")
    .setLabel("Mensagem (deixe vazio para desativar)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder(WELCOME_MODAL_PLACEHOLDERS[type] ?? "Variáveis: {usuario} {tag} {servidor} {membros}");

  if (currentValue) input.setValue(currentValue.slice(0, 1000));

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

export function buildTipoEditModal(guildId, value) {
  const row = getTicketTypeRow(guildId, value);

  return new ModalBuilder()
    .setCustomId(ID.modalTipoEdit(value))
    .setTitle(`Editar: ${row?.label ?? value}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("nome")
          .setLabel("Nome exibido")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(row?.label ?? "")
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("descricao")
          .setLabel("Descrição curta")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue(row?.description ?? "")
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("emoji")
          .setLabel("Emoji (opcional)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue(row?.emoji ?? "")
          .setMaxLength(10)
      )
    );
}
