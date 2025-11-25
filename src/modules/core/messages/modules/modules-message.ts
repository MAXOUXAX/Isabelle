import type { ModuleData } from '@/modules/module-manager.js';
import { colors, emojis } from '@/utils/theme.js';
import {
  ApplicationCommandOptionType,
  ContainerBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

export const MODULES_SELECT_ID = 'modules:select';

export function buildModulesOverviewMessage(
  modules: ModuleData[],
): ContainerBuilder {
  const loadedCount = modules.filter((m) => m.status === 'loaded').length;
  const totalCount = modules.length;

  const header = `## ${emojis.puzzle} Modules d'Isabelle
${String(loadedCount)}/${String(totalCount)} modules actifs`;

  const container = new ContainerBuilder()
    .setAccentColor(colors.primary)
    .addTextDisplayComponents((text) => text.setContent(header));

  // Add module select menu if there are modules
  if (modules.length > 0) {
    const selectMenu = buildModuleSelectMenu(modules);
    container.addActionRowComponents((row) => row.addComponents(selectMenu));
  }

  // Add module list as table-like display
  const moduleList = buildModuleListSection(modules);
  container
    .addSeparatorComponents((sep) =>
      sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents((text) => text.setContent(moduleList));

  return container;
}

function buildModuleSelectMenu(modules: ModuleData[]): StringSelectMenuBuilder {
  return new StringSelectMenuBuilder()
    .setCustomId(MODULES_SELECT_ID)
    .setPlaceholder('Sélectionne un module pour voir ses détails...')
    .addOptions(
      modules.map((module) => {
        const statusEmoji =
          module.status === 'loaded' ? emojis.success : emojis.error;
        return new StringSelectMenuOptionBuilder()
          .setLabel(module.name)
          .setDescription(`${String(module.commandCount)} commande(s)`)
          .setValue(module.slug)
          .setEmoji(statusEmoji);
      }),
    );
}

function buildModuleListSection(modules: ModuleData[]): string {
  if (modules.length === 0) {
    return "Aucun module n'est enregistré.";
  }

  const lines = modules.map((module) => {
    const statusEmoji =
      module.status === 'loaded' ? emojis.success : emojis.error;
    const commandText =
      module.commandCount === 1
        ? '1 commande'
        : `${String(module.commandCount)} commandes`;

    const errorNote = module.status === 'failed' ? ' *(erreur)*' : '';

    return `${statusEmoji} **${module.name}** — ${commandText}${errorNote}`;
  });

  return lines.join('\n');
}

export function buildModuleDetailMessage(
  module: ModuleData,
  allModules: ModuleData[],
): ContainerBuilder {
  const accentColor =
    module.status === 'loaded' ? colors.success : colors.error;
  const statusLine =
    module.status === 'loaded'
      ? `${emojis.success} Ce module est actuellement chargé.`
      : `${emojis.error} Ce module est désactivé suite à une erreur.`;

  const header = `## ${emojis.puzzle} ${module.name}

${statusLine}`;

  const container = new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents((text) => text.setContent(header));

  // Navigation dropdown to switch modules
  if (allModules.length > 0) {
    const selectMenu = buildModuleSelectMenu(allModules);
    container.addActionRowComponents((row) => row.addComponents(selectMenu));
  }

  // Commands section
  const commandsSection = buildCommandsSection(module);
  container
    .addSeparatorComponents((sep) =>
      sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents((text) => text.setContent(commandsSection));

  // Contributors section (if any)
  if (module.contributors.length > 0) {
    const contributorsSection = buildContributorsSection(module);
    container
      .addSeparatorComponents((sep) =>
        sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents((text) => text.setContent(contributorsSection));
  }

  // Footer with technical info (subtle)
  const footer = buildFooterSection(module);
  if (footer) {
    container
      .addSeparatorComponents((sep) =>
        sep.setDivider(false).setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents((text) => text.setContent(footer));
  }

  return container;
}

function buildCommandsSection(module: ModuleData): string {
  const sectionTitle = `### ${emojis.commands} Commandes disponibles`;

  if (module.status === 'failed') {
    return `${sectionTitle}

Ce module n'est pas chargé : aucune commande n'est disponible.`;
  }

  if (module.commands.length === 0) {
    return `${sectionTitle}

Ce module ne déclare aucune commande.`;
  }

  const commandBlocks = module.commands.map((command) => {
    const subcommands = extractSubcommands(command.options);
    const baseLine = `\`/${command.name}\` — ${command.description}`;

    if (subcommands.length === 0) {
      return baseLine;
    }

    const subLines = subcommands
      .map((sub) => {
        const commandPath = sub.path.join(' ');
        return `  └ \`/${command.name} ${commandPath}\` — ${sub.description}`;
      })
      .join('\n');

    return `${baseLine}\n${subLines}`;
  });

  return `${sectionTitle}

${commandBlocks.join('\n\n')}`;
}

function buildContributorsSection(module: ModuleData): string {
  const contributors = module.contributors.map((c) => {
    const profileUrl = `https://github.com/${c.githubUsername}`;
    return `[${c.displayName}](${profileUrl})`;
  });

  return `### ${emojis.contributors} Contributeurs

${contributors.join(' • ')}`;
}

function buildFooterSection(module: ModuleData): string {
  const parts: string[] = [];

  if (module.loadTimeMs > 0) {
    parts.push(`Chargé en ${module.loadTimeMs.toFixed(1)}ms`);
  }

  if (module.interactionCount > 0) {
    const label =
      module.interactionCount === 1
        ? '1 interaction'
        : `${String(module.interactionCount)} interactions`;
    parts.push(label);
  }

  if (module.status === 'failed' && module.errorMessage) {
    parts.push(`Erreur : ${module.errorMessage}`);
  }

  if (parts.length === 0) {
    return '';
  }

  return `-# ${parts.join(' • ')}`;
}

interface SubcommandInfo {
  path: string[];
  description: string;
}

function extractSubcommands(
  options:
    | RESTPostAPIChatInputApplicationCommandsJSONBody['options']
    | undefined,
  parentPath: string[] = [],
): SubcommandInfo[] {
  if (!options) {
    return [];
  }

  const result: SubcommandInfo[] = [];

  for (const option of options) {
    if (option.type === ApplicationCommandOptionType.Subcommand) {
      result.push({
        path: [...parentPath, option.name],
        description: option.description,
      });
      continue;
    }

    if (option.type === ApplicationCommandOptionType.SubcommandGroup) {
      const nestedOptions = Array.isArray(option.options)
        ? option.options
        : undefined;
      result.push(
        ...extractSubcommands(nestedOptions, [...parentPath, option.name]),
      );
    }
  }

  return result;
}
