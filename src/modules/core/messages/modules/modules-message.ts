import type { ModuleData } from '@/modules/module-manager.js';
import {
  ApplicationCommandOptionType,
  ContainerBuilder,
  SeparatorSpacingSize,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

export function buildModulesOverviewMessage(
  modules: ModuleData[],
): ContainerBuilder {
  const lines = modules.map((module) => {
    const statusEmoji = module.status === 'loaded' ? '✅' : '❌';
    const commandLabel =
      module.commandCount === module.commandEntryCount
        ? `${module.commandCount.toString()} commande(s)`
        : `${module.commandCount.toString()} commande(s) • ${module.commandEntryCount.toString()} variantes`;

    const loadTime =
      module.loadTimeMs > 0 ? `${module.loadTimeMs.toFixed(2)} ms` : '—';

    const error =
      module.status === 'failed' && module.errorMessage
        ? ` • Erreur : ${module.errorMessage}`
        : '';

    return `- ${statusEmoji} **${module.name}** • ${commandLabel} • ${loadTime}${error}`;
  });

  const content =
    '# 🧩 Modules chargés\n\n' +
    (lines.length > 0
      ? `${lines.join('\n')}\n\nUtilise \`/modules <module>\` pour obtenir les détails d'un module spécifique.`
      : "Aucun module n'est enregistré.");

  return new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(content));
}

export function buildModuleDetailMessage(module: ModuleData): ContainerBuilder {
  const header = `# 🧩 Module ${module.name}`;
  const statusLine =
    module.status === 'loaded'
      ? '✅ Ce module est actuellement chargé.'
      : '❌ Ce module est désactivé suite à une erreur lors du démarrage.';

  const statsLines = [
    `- Temps de chargement : ${module.loadTimeMs.toFixed(2)} ms`,
    `- Commandes : ${module.commandCount.toString()} (variantes : ${module.commandEntryCount.toString()})`,
    `- Gestionnaires d'interactions : ${module.interactionCount.toString()}`,
  ];

  if (module.status === 'failed' && module.errorMessage) {
    statsLines.push(`- Raison : ${module.errorMessage}`);
  }

  const commandsSection = buildCommandsSection(module);
  const contributorsSection = buildContributorsSection(module);

  const builder = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`${header}\n\n${statusLine}`),
    )
    .addSeparatorComponents((separator) =>
      separator.setDivider(true).setSpacing(SeparatorSpacingSize.Large),
    )
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`## 📊 Statistiques\n\n${statsLines.join('\n')}`),
    )
    .addSeparatorComponents((separator) =>
      separator.setDivider(true).setSpacing(SeparatorSpacingSize.Large),
    )
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(commandsSection),
    )
    .addSeparatorComponents((separator) =>
      separator.setDivider(true).setSpacing(SeparatorSpacingSize.Large),
    )
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(contributorsSection),
    );

  return builder;
}

function buildCommandsSection(module: ModuleData): string {
  if (module.status === 'failed') {
    return "## 🧩 Commandes\n\nCe module n'est pas chargé : aucune commande n'a été enregistrée.";
  }

  if (module.commands.length === 0) {
    return '## 🧩 Commandes\n\nCe module ne déclare aucune commande.';
  }

  const blocks = module.commands.map((command) => {
    const subcommands = extractSubcommands(command.options);
    const baseLine = `- \`/${command.name}\` — ${command.description}`;

    if (subcommands.length === 0) {
      return baseLine;
    }

    const subLines = subcommands
      .map((subcommand) => {
        const commandPath = subcommand.path.join(' ');
        return `  - \`/${command.name} ${commandPath}\` — ${subcommand.description}`;
      })
      .join('\n');

    return `${baseLine}\n${subLines}`;
  });

  return `## 🧩 Commandes\n\n${blocks.join('\n')}`;
}

function buildContributorsSection(module: ModuleData): string {
  if (module.contributors.length === 0) {
    return "## 🤝 Contributeurs\n\nAucun contributeur n'est enregistré pour ce module pour le moment.";
  }

  const lines = module.contributors.map((contributor) => {
    const profileUrl = `https://github.com/${contributor.githubUsername}`;
    return `- [${contributor.displayName}](${profileUrl}) (@${contributor.githubUsername})`;
  });

  return `## 🤝 Contributeurs\n\n${lines.join('\n')}`;
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
