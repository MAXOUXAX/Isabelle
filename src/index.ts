import { commandManager } from '@/manager/commands/command.manager.js';
import { AutomaticResponsesModule } from '@/modules/automatic-responses/automatic-responses.module.js';
import { CoreModule } from '@/modules/core/core.module.js';
import { PlanifierModule } from '@/modules/planifier/planifier.module.js';
import { RussianRoulette } from '@/modules/russian-roulette/russian-roulette.module.js';
import { Schedule } from '@/modules/schedule/schedule.module.js';
import { SutomModule } from '@/modules/sutom/sutom.module.js';
import { ActivityType, Client, Events, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';
import { interactionManager } from './manager/interaction.manager.js';
import { IsabelleModule } from './modules/bot-module.js';
import { HotPotato } from './modules/hot-potato/hot-potato.module.js';
import { logger } from './utils/logger.js';

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
  new HotPotato(),
  new AutomaticResponsesModule(),
  new PlanifierModule(),
  new RussianRoulette(),
  new SutomModule(),
  new Schedule(),
];

client.once(Events.ClientReady, () => {
  async function handler() {
    logger.info("Connected to Discord's Gateway! 🎉");

    logger.info('Registering modules...');
    registerModules();

    if (process.env.NODE_ENV === 'development') {
      logger.info('[DEVELOPMENT] Isabelle is running in development mode.');

      if (client.guilds.cache.size > 1) {
        logger.error(
          '[DEVELOPMENT] Isabelle is connected to multiple servers while in development mode. To avoid any errors, the program will now terminate.',
        );
        logger.error(
          'Namely, the following servers: ',
          client.guilds.cache.map((guild) => guild.name).join(', '),
        );
        return process.exit(1);
      }

      const developmentGuild = client.guilds.cache.first();
      if (!developmentGuild) {
        logger.info(
          '[DEVELOPMENT] No guild found. Invite Isabelle to a server to continue.',
        );
        return;
      }

      logger.info(
        `[DEVELOPMENT] Isabelle is connected to the ${developmentGuild.name} development server.`,
      );

      client.user?.setActivity({
        name: 'se développer elle même',
        type: ActivityType.Playing,
        url: 'https://github.com/MAXOUXAX/Isabelle',
      });

      logger.info('[DEVELOPMENT] Deploying commands for this single guild...');

      await commandManager
        .deployCommandsForGuild(developmentGuild.id)
        .then(() => {
          logger.info(
            `[DEVELOPMENT] Commands deployed for the ${developmentGuild.name} server!`,
          );
        })
        .catch((error: unknown) => {
          logger.error('[DEVELOPMENT] Failed to deploy commands:', error);
        });
    } else if (process.env.NODE_ENV === undefined) {
      logger.info('[PRODUCTION] Isabelle is running in production mode.');

      logger.info('[PRODUCTION] Deploying global commands...');
      await commandManager.deployCommandsGlobally();
      logger.info(
        '[PRODUCTION] Global commands deployed! If this is the first time you deploy commands, it may take up to an hour before they are available.',
      );
    } else {
      logger.error(
        'No valid environment specified. Please set the NODE_ENV environment variable to "development" or delete it to run in production mode.',
      );
      return process.exit(1);
    }

    logger.info('Isabelle is ready to serve! 🚀');
  }

  handler().catch((error: unknown) => {
    logger.error(
      'An error occurred while starting Isabelle:',
      error instanceof Error ? error.message : String(error),
    );
  });
});

client.on(Events.InteractionCreate, (interaction) => {
  if (!interaction.isCommand()) {
    return void interactionManager.handleInteraction(interaction);
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
    logger.error(
      'An error occurred while handling an interaction:',
      errorMessage,
    );

    // Only reply if the interaction hasn't been replied to already
    if (interaction.replied || interaction.deferred) {
      interaction
        .followUp({
          content: `Une erreur est survenue lors du traitement de l'interaction.\n${errorMessage}`,
          ephemeral: true,
        })
        .catch((err: unknown) => logger.error('Failed to send followup message:', err));
    } else {
      interaction
        .reply({
          content: `Une erreur est survenue lors du traitement de l'interaction.\n${errorMessage}`,
          ephemeral: true,
        })
        .catch((err: unknown) => logger.error('Failed to reply to interaction:', err));
    }
  });
});

await client.login(config.DISCORD_TOKEN);

function registerModules(): void {
  interface ModuleResult {
    module: IsabelleModule;
    success: boolean;
    time: number;
  }

  const globalStartTime = performance.now();
  const results: ModuleResult[] = [];

  for (const module of MODULES) {
    logger.info(`[Modules] Initializing module ${module.name}`);
    const startTime = performance.now();
    let success = false;

    try {
      module.init();
      commandManager.registerCommandsFromModule(module);
      interactionManager.registerInteractionHandlers(
        module.interactionHandlers,
      );
      success = true;
    } catch (error) {
      logger.error(
        `[Modules] Failed to initialize module ${module.name}:`,
        error,
      );
      logger.error(`[Modules] Module ${module.name} will be disabled`);
    } finally {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      results.push({ module, success, time: loadTime });

      const timeMessage = `${loadTime.toFixed(2)}ms`;
      if (success) {
        if (loadTime > 1000) {
          logger.warn(
            `[Modules] WARNING! Module ${module.name} took ${timeMessage} to initialize! This may impact bot startup time.`,
          );
        } else {
          logger.info(
            `[Modules] Module ${module.name} initialized in ${timeMessage}`,
          );
        }
      }
    }
  }

  const totalTime = performance.now() - globalStartTime;
  const successCount = results.filter((r) => r.success).length;
  logger.info(
    `[Modules] Finished initializing ${successCount.toString()}/${MODULES.length.toString()} modules in ${totalTime.toFixed(2)}ms`,
  );
}

client.on(Events.GuildCreate, (guild) => {
  if (process.env.NODE_ENV === 'development') {
    if (client.guilds.cache.size > 1) {
      logger.error(
        '[DEVELOPMENT] Isabelle is already connected to a guild. To avoid any errors, the program will not deploy commands for the new guild.',
      );
      return;
    }

    logger.info(
      `[DEVELOPMENT] New guild joined: ${guild.name} (id: ${guild.id}). Deploying commands for this guild...`,
    );
    commandManager
      .deployCommandsForGuild(guild.id)
      .then(() => {
        logger.info(
          `[DEVELOPMENT] Commands deployed for the ${guild.name} server!`,
        );
      })
      .catch((error: unknown) => {
        logger.error(
          `[DEVELOPMENT] Failed to deploy commands for new guild:`,
          error,
        );
      });
  }
});
