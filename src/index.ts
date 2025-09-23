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
import { createLogger } from './utils/logger.js';

const logger = createLogger('core');
const modulesLogger = createLogger('modules');

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
      logger.info('Running in development mode - single guild deployment');

      if (client.guilds.cache.size > 1) {
        logger.error(
          `Multiple servers detected (${client.guilds.cache.size}) while in development mode. Terminating to avoid conflicts.`,
        );
        logger.debug('Connected servers:', client.guilds.cache.map((guild) => `${guild.name} (${guild.id})`).join(', '));
        return process.exit(1);
      }

      const developmentGuild = client.guilds.cache.first();
      if (!developmentGuild) {
        logger.warn('No development guild found. Invite Isabelle to a server to continue.');
        return;
      }

      logger.info(`Connected to development server: ${developmentGuild.name} (${developmentGuild.id})`);
      logger.debug(`Guild member count: ${developmentGuild.memberCount}`);

      client.user?.setActivity({
        name: 'se développer elle même',
        type: ActivityType.Playing,
        url: 'https://github.com/MAXOUXAX/Isabelle',
      });

      logger.info('Deploying commands to development guild...');

      await commandManager
        .deployCommandsForGuild(developmentGuild.id)
        .then(() => {
          logger.info(`Successfully deployed ${commandManager.getFlatCommandsArray().length} commands to ${developmentGuild.name}`);
        })
        .catch((error: unknown) => {
          logger.error('Failed to deploy commands to development guild:', error);
        });
    } else if (process.env.NODE_ENV === undefined) {
      logger.info('Running in production mode - global deployment');

      logger.info('Deploying commands globally...');
      await commandManager.deployCommandsGlobally();
      logger.info(
        `Successfully deployed ${commandManager.getFlatCommandsArray().length} global commands. May take up to 1 hour to be available if this is the first deployment.`,
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
    logger.error(
      'Critical startup failure - Isabelle cannot start:',
      error instanceof Error ? { message: error.message, stack: error.stack } : error,
    );
    process.exit(1);
  });
});

const interactionLogger = createLogger('interactions');

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
    interactionLogger.error(
      `Interaction handling failed: ${errorMessage}`,
      { 
        interactionType: interaction.type,
        commandName: interaction.isCommand() ? interaction.commandName : undefined,
        customId: 'customId' in interaction ? interaction.customId : undefined,
        userId: interaction.user.id,
        guildId: interaction.guildId,
      }
    );

    // Only reply if the interaction hasn't been replied to already
    if (interaction.replied || interaction.deferred) {
      interaction
        .followUp({
          content: `Une erreur est survenue lors du traitement de l'interaction.\n${errorMessage}`,
          ephemeral: true,
        })
        .catch((err: unknown) => interactionLogger.error('Failed to send followup message after interaction error:', err));
    } else {
      interaction
        .reply({
          content: `Une erreur est survenue lors du traitement de l'interaction.\n${errorMessage}`,
          ephemeral: true,
        })
        .catch((err: unknown) => interactionLogger.error('Failed to reply to interaction after error:', err));
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
    modulesLogger.info(`Initializing ${module.name} module...`);
    const startTime = performance.now();
    let success = false;

    try {
      module.init();
      const commandCount = module.commands.length;
      const interactionCount = module.interactionHandlers.length;
      
      commandManager.registerCommandsFromModule(module);
      interactionManager.registerInteractionHandlers(
        module.interactionHandlers,
      );
      success = true;
      
      modulesLogger.debug(`${module.name} registered ${commandCount} commands and ${interactionCount} interactions`);
    } catch (error) {
      modulesLogger.error(
        `Failed to initialize ${module.name} module:`,
        error,
      );
      modulesLogger.warn(`${module.name} module will be disabled and unavailable`);
    } finally {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      results.push({ module, success, time: loadTime });

      if (success) {
        if (loadTime > 1000) {
          modulesLogger.warn(
            `${module.name} module took ${loadTime.toFixed(2)}ms to initialize (>1s). This may impact bot startup time.`,
          );
        } else {
          modulesLogger.info(
            `${module.name} module initialized successfully in ${loadTime.toFixed(2)}ms`,
          );
        }
      }
    }
  }

  const totalTime = performance.now() - globalStartTime;
  const successCount = results.filter((r) => r.success).length;
  const failedCount = MODULES.length - successCount;
  
  if (failedCount > 0) {
    modulesLogger.warn(
      `Module initialization completed: ${successCount}/${MODULES.length} successful, ${failedCount} failed (${totalTime.toFixed(2)}ms total)`,
    );
  } else {
    modulesLogger.info(
      `All ${successCount} modules initialized successfully in ${totalTime.toFixed(2)}ms`,
    );
  }
}

client.on(Events.GuildCreate, (guild) => {
  if (process.env.NODE_ENV === 'development') {
    if (client.guilds.cache.size > 1) {
      logger.error(
        `New guild "${guild.name}" joined, but already connected to ${client.guilds.cache.size - 1} other guilds in development mode. Skipping command deployment to prevent conflicts.`,
      );
      logger.debug(`New guild details: ${guild.name} (${guild.id}) with ${guild.memberCount} members`);
      return;
    }

    logger.info(
      `New development guild joined: ${guild.name} (${guild.id}). Deploying commands...`,
    );
    logger.debug(`Guild has ${guild.memberCount} members and ${guild.channels.cache.size} channels`);
    
    commandManager
      .deployCommandsForGuild(guild.id)
      .then(() => {
        logger.info(
          `Successfully deployed ${commandManager.getFlatCommandsArray().length} commands to ${guild.name}`,
        );
      })
      .catch((error: unknown) => {
        logger.error(
          `Failed to deploy commands to new guild "${guild.name}":`,
          error,
        );
      });
  }
});
