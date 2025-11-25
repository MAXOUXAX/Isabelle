import { humanTime } from '@/utils/date.js';
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
  const introduction = buildIntroductionSection(context.displayName);
  const planningSection = context.hasScheduleError
    ? buildPlanningErrorSection()
    : buildPlanningSection(context.lessons);
  const commandsSection = buildPromotedCommandsSection(
    context.promotedCommands,
  );
  const statsSection = buildStatsSection(context.stats);

  return new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(introduction),
    )
    .addSeparatorComponents((separator) =>
      separator.setDivider(true).setSpacing(SeparatorSpacingSize.Large),
    )
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(planningSection),
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
      textDisplay.setContent(statsSection),
    );
}

function buildIntroductionSection(displayName: string): string {
  return `# 👋 Bonjour ${displayName}

Je suis Isabelle, prête à t'accompagner pour ta journée à TELECOM Nancy. Voici les infos utiles et quelques commandes à tester dès maintenant.`;
}

function buildPlanningSection(lessons: LessonSummary[]): string {
  if (lessons.length === 0) {
    return `## 🗓️ Planning du jour

- Aucun cours prévu aujourd'hui. Profite pour te reposer ou avancer tes projets !`;
  }

  const lines = lessons.map((lesson) => {
    const start = humanTime(lesson.start);
    const end = humanTime(lesson.end);
    const room = lesson.room ? ` (${lesson.room})` : '';
    return `- ${start} → ${end} • ${lesson.name}${room}`;
  });

  return `## 🗓️ Planning du jour

${lines.join('\n')}`;
}

function buildPlanningErrorSection(): string {
  return `## 🗓️ Planning du jour

- Impossible de récupérer l'emploi du temps. Vérifie plus tard ou utilise directement \`/schedule\`.`;
}

function buildPromotedCommandsSection(
  promotedCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[],
): string {
  const blocks = promotedCommands.map((command) => {
    return `- \`/${command.name}\` — ${command.description}`;
  });

  return `## 🎯 Commandes à essayer

${blocks.join('\n')}`;
}

function buildStatsSection(stats: BonjourStats): string {
  return `## 🛠️ Détails techniques

- Version actuelle : \`v${stats.version}\`
- Modules actifs : ${String(stats.moduleCount)}
- Commandes et sous-commandes : ${String(stats.commandCount)}`;
}
