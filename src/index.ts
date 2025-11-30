import { commandManager } from '@/manager/commands/command.manager.js';
import { AutomaticResponsesModule } from '@/modules/automatic-responses/automatic-responses.module.js';
import { CoreModule } from '@/modules/core/core.module.js';
import { legalManager } from '@/modules/legal/legal.manager.js';
import { LegalModule } from '@/modules/legal/legal.module.js';
import { generativeAi } from '@/modules/legal/prompts/generative-ai.prompt.js';
import { moduleManager } from '@/modules/module-manager.js';
import { PlanifierModule } from '@/modules/planifier/planifier.module.js';
import { RoastModule } from '@/modules/roast/roast.module.js';
import { RussianRoulette } from '@/modules/russian-roulette/russian-roulette.module.js';
import { Schedule } from '@/modules/schedule/schedule.module.js';
import { SnakeCaseDetectorModule } from '@/modules/snake-case-detector/snake-case-detector.module.js';
import { SutomModule } from '@/modules/sutom/sutom.module.js';
import { environment } from '@/utils/environment.js';
import { voidAndTrackError } from '@/utils/promises.js';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';
import { interactionManager } from './manager/interaction.manager.js';
import { IsabelleModule } from './modules/bot-module.js';
import { HotPotato } from './modules/hot-potato/hot-potato.module.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('core');

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
  ],
});

const MODULES: IsabelleModule[] = [
  new CoreModule(),
  new LegalModule(),
  new HotPotato(),
  new AutomaticResponsesModule(),
  new PlanifierModule(),
  new RussianRoulette(),
  new SnakeCaseDetectorModule(),
  new SutomModule(),
  new Schedule(),
  new RoastModule(),
];

moduleManager.registerModules(MODULES);

client.once(Events.ClientReady, () => {
  async function handler() {
    logger.info(
      { userTag: client.user?.tag, userId: client.user?.id },
      "Connected to Discord's Gateway! 🎉",
    );

    logger.info('Registering legal consent scopes...');
    registerLegalScopes();

    logger.info('Initializing modules...');
    await moduleManager.initializeModules();

    if (environment === 'development') {
      logger.info('Running in development mode - single guild deployment');

      if (client.guilds.cache.size > 1) {
        logger.error(
          { guildCount: client.guilds.cache.size },
          `Multiple servers detected (${String(client.guilds.cache.size)}) while in development mode. Terminating to avoid conflicts.`,
        );
        logger.debug(
          {
            servers: client.guilds.cache
              .map((guild) => `${guild.name} (${guild.id})`)
              .join(', '),
          },
          'Connected servers',
        );
        return process.exit(1);
      }

      const developmentGuild = client.guilds.cache.first();
      if (!developmentGuild) {
        logger.warn(
          'No development guild found. Invite Isabelle to a server to continue.',
        );
        return;
      }

      logger.info(
        `Connected to development server: ${developmentGuild.name} (${developmentGuild.id})`,
      );
      logger.debug(
        { memberCount: developmentGuild.memberCount },
        'Guild member count',
      );

      logger.info('Deploying commands to development guild...');

      await commandManager
        .deployCommandsForGuild(developmentGuild.id)
        .then(() => {
          logger.info(
            { commandCount: commandManager.getFlatCommandsArray().length },
            `Successfully deployed ${String(commandManager.getFlatCommandsArray().length)} commands to ${developmentGuild.name}`,
          );
        })
        .catch((error: unknown) => {
          logger.error(
            { error },
            'Failed to deploy commands to development guild',
          );
        });
    } else if (process.env.NODE_ENV === undefined) {
      logger.info('Running in production mode - global deployment');

      logger.info('Deploying commands globally...');
      await commandManager.deployCommandsGlobally();
      logger.info(
        { commandCount: commandManager.getFlatCommandsArray().length },
        `Successfully deployed ${String(commandManager.getFlatCommandsArray().length)} global commands. May take up to 1 hour to be available if this is the first deployment.`,
      );
    } else {
      logger.error(
        `Invalid NODE_ENV value: "${process.env.NODE_ENV}". Use "development" or leave undefined for production.`,
      );
      return process.exit(1);
    }

    logger.info('Isabelle is ready to serve! 🚀');
  }

  handler().catch((error: unknown) => {
    logger.fatal(
      {
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error,
      },
      'Critical startup failure - Isabelle cannot start',
    );
    process.exit(1);
  });
});

const interactionLogger = createLogger('interactions');

client.on(Events.InteractionCreate, (interaction) => {
  if (!interaction.isCommand()) {
    voidAndTrackError(interactionManager.handleInteraction(interaction));
    return;
  }

  const handler = async () => {
    if (interaction.isCommand()) {
      const { commandName } = interaction;
      const command = commandManager.findByName(commandName);

      if (!command) {
        throw new Error(`La commande ${commandName} n'existe pas.`);
      }

      await command.executeCommand(interaction);
    } else {
      await interactionManager.handleInteraction(interaction);
    }
  };

  handler().catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    interactionLogger.error(
      {
        error: errorMessage,
        interactionType: interaction.type,
        commandName: interaction.isCommand()
          ? interaction.commandName
          : undefined,
        customId: 'customId' in interaction ? interaction.customId : undefined,
        userId: interaction.user.id,
        guildId: interaction.guildId,
      },
      'Interaction handling failed',
    );

    // Only reply if the interaction hasn't been replied to already
    if (interaction.replied || interaction.deferred) {
      interaction
        .followUp({
          content: `Une erreur est survenue lors du traitement de l'interaction.\n${errorMessage}`,
          ephemeral: true,
        })
        .catch((err: unknown) => {
          interactionLogger.error(
            { error: err },
            'Failed to send followup message after interaction error',
          );
        });
    } else {
      interaction
        .reply({
          content: `Une erreur est survenue lors du traitement de l'interaction.\n${errorMessage}`,
          ephemeral: true,
        })
        .catch((err: unknown) => {
          interactionLogger.error(
            { error: err },
            'Failed to reply to interaction after error',
          );
        });
    }
  });
});

await client.login(config.DISCORD_TOKEN);

function registerLegalScopes() {
  legalManager.registerConsentScope(generativeAi);
}

client.on(Events.GuildCreate, (guild) => {
  if (environment === 'development') {
    if (client.guilds.cache.size > 1) {
      logger.error(
        { guildCount: client.guilds.cache.size },
        `New guild "${guild.name}" joined, but already connected to ${String(client.guilds.cache.size - 1)} other guilds in development mode. Skipping command deployment to prevent conflicts.`,
      );
      logger.debug(
        {
          guildName: guild.name,
          guildId: guild.id,
          memberCount: guild.memberCount,
        },
        `New guild details: ${guild.name} (${guild.id}) with ${String(guild.memberCount)} members`,
      );
      return;
    }

    logger.info(
      `New development guild joined: ${guild.name} (${guild.id}). Deploying commands...`,
    );
    logger.debug(
      {
        memberCount: guild.memberCount,
        channelCount: guild.channels.cache.size,
      },
      `Guild has ${String(guild.memberCount)} members and ${String(guild.channels.cache.size)} channels`,
    );

    commandManager
      .deployCommandsForGuild(guild.id)
      .then(() => {
        logger.info(
          { commandCount: commandManager.getFlatCommandsArray().length },
          `Successfully deployed ${String(commandManager.getFlatCommandsArray().length)} commands to ${guild.name}`,
        );
      })
      .catch((error: unknown) => {
        logger.error(
          { error, guildName: guild.name },
          `Failed to deploy commands to new guild "${guild.name}"`,
        );
      });
  }
});
