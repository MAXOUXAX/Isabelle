import { humanShortDate, humanTime } from '@/utils/date.js';
import { colors, emojis } from '@/utils/theme.js';
import {
  ContainerBuilder,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  SeparatorSpacingSize,
} from 'discord.js';

interface LessonSummary {
  name: string;
  start: Date;
  end: Date;
  room?: string | null;
}

interface BonjourStats {
  version: string;
  moduleCount: number;
  commandCount: number;
}

interface BonjourMessageContext {
  displayName: string;
  lessons: LessonSummary[];
  hasScheduleError: boolean;
  promotedCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[];
  stats: BonjourStats;
}

export function buildBonjourMessage(
  context: BonjourMessageContext,
): ContainerBuilder {
  const today = new Date();
  const formattedDate = humanShortDate(today);

  const header = buildHeaderSection(context.displayName, formattedDate);
  const schedule = context.hasScheduleError
    ? buildScheduleErrorSection()
    : buildScheduleSection(context.lessons);
  const footer = buildFooterSection(context.stats);

  const container = new ContainerBuilder()
    .setAccentColor(colors.primary)
    .addTextDisplayComponents((text) => text.setContent(header))
    .addSeparatorComponents((sep) =>
      sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents((text) => text.setContent(schedule));

  // Add promoted commands section
  if (context.promotedCommands.length > 0) {
    const commandsSection = buildPromotedCommandsSection(
      context.promotedCommands,
    );

    container
      .addSeparatorComponents((sep) =>
        sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents((text) => text.setContent(commandsSection));
  }

  // Add subtle footer with stats
  container
    .addSeparatorComponents((sep) =>
      sep.setDivider(false).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents((text) => text.setContent(footer));

  return container;
}

function buildHeaderSection(
  displayName: string,
  formattedDate: string,
): string {
  return `## Bonjour, ${displayName} !
Voici ta journée du **${formattedDate}**.`;
}

function buildScheduleSection(lessons: LessonSummary[]): string {
  if (lessons.length === 0) {
    return `### ${emojis.calendar} Planning du jour

Aucun cours prévu aujourd'hui. Profite pour te reposer ou avancer tes projets !`;
  }

  const lines = lessons.map((lesson) => {
    const start = humanTime(lesson.start);
    const end = humanTime(lesson.end);
    const room = lesson.room ? ` • \`${lesson.room}\`` : '';
    return `\`${start}\` → \`${end}\` **${lesson.name}**${room}`;
  });

  return `### ${emojis.calendar} Planning du jour

${lines.join('\n')}`;
}

function buildScheduleErrorSection(): string {
  return `### ${emojis.calendar} Planning du jour

${emojis.warning} Impossible de récupérer l'emploi du temps. Utilise \`/schedule\` pour réessayer.`;
}

function buildPromotedCommandsSection(
  commands: RESTPostAPIChatInputApplicationCommandsJSONBody[],
): string {
  const lines = commands.map((cmd) => `\`/${cmd.name}\` — ${cmd.description}`);

  return `### ${emojis.sparkles} Commandes à essayer

${lines.join('\n')}`;
}

function buildFooterSection(stats: BonjourStats): string {
  return `-# v${stats.version} • ${String(stats.moduleCount)} modules • ${String(stats.commandCount)} commandes`;
}
