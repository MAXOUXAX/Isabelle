import { commandManager } from '@/manager/commands/command.manager.js';
import { Coiffeur } from '@/modules/coiffeur/coiffeur.module.js';
import { CoreModule } from '@/modules/core/core.module.js';
import { PlanifierModule } from '@/modules/planifier/planifier.module.js';
import { RussianRoulette } from '@/modules/russian-roulette/russian-roulette.module.js';
import { SutomModule } from '@/modules/sutom/sutom.module.js';
import { ActivityType, Client, Events, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';
import { interactionManager } from './manager/interaction.manager.js';
import { IsabelleModule } from './modules/bot-module.js';
import { HotPotato } from './modules/hot-potato/hot-potato.module.js';

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
  new Coiffeur(),
  new PlanifierModule(),
  new RussianRoulette(),
  new SutomModule(),
];

client.once(Events.ClientReady, () => {
  async function handler() {
    console.log("Connected to Discord's Gateway! 🎉");

    console.log('Registering modules...');
    registerModules();

    if (process.env.NODE_ENV === 'development') {
      console.log('[DEVELOPMENT] Isabelle is running in development mode.');

      if (client.guilds.cache.size > 1) {
        console.error(
          '[DEVELOPMENT] Isabelle is connected to multiple servers while in development mode. To avoid any errors, the program will now terminate.',
        );
        console.error(
          'Namely, the following servers: ',
          client.guilds.cache.map((guild) => guild.name).join(', '),
        );
        return process.exit(1);
      }

      const developmentGuild = client.guilds.cache.first();
      if (!developmentGuild) {
        console.log(
          '[DEVELOPMENT] No guild found. Invite Isabelle to a server to continue.',
        );
        return;
      }

      console.log(
        `[DEVELOPMENT] Isabelle is connected to the ${developmentGuild.name} development server.`,
      );

      client.user?.setActivity({
        name: 'se développer elle même',
        type: ActivityType.Playing,
        url: 'https://github.com/MAXOUXAX/Isabelle',
      });

      console.log('[DEVELOPMENT] Deploying commands for this single guild...');

      void commandManager
        .deployCommandsForGuild(developmentGuild.id)
        .then(() => {
          console.log(
            `[DEVELOPMENT] Commands deployed for the ${developmentGuild.name} server!`,
          );
        });
    } else if (process.env.NODE_ENV === undefined) {
      console.log('[PRODUCTION] Isabelle is running in production mode.');

      console.log('[PRODUCTION] Deploying global commands...');
      await commandManager.deployCommandsGlobally();
      console.log(
        '[PRODUCTION] Global commands deployed! If this is the first time you deploy commands, it may take up to an hour before they are available.',
      );
    } else {
      console.error(
        'No valid environment specified. Please set the NODE_ENV environment variable to "development" or delete it to run in production mode.',
      );
      return process.exit(1);
    }

    console.log('Isabelle is ready to serve! 🚀');
  }

  handler().catch((error: unknown) => {
    console.error(
      'An error occurred while starting Isabelle:',
      error as string,
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
      return;
    } else {
      await interactionManager.handleInteraction(interaction);
      return;
    }
  };

  handler().catch((error: unknown) => {
    void interaction.reply(
      `Une erreur est survenue lors du traitement de l'interaction.\n${error as string}`,
    );
    console.error(
      'An error occurred while handling an interaction:',
      error as string,
    );
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
    console.log(`[Modules] Initializing module ${module.name}`);
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
      console.error(
        `[Modules] Failed to initialize module ${module.name}:`,
        error,
      );
      console.error(`[Modules] Module ${module.name} will be disabled`);
    } finally {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      results.push({ module, success, time: loadTime });

      const timeMessage = `${loadTime.toFixed(2)}ms`;
      if (success) {
        if (loadTime > 1000) {
          console.warn(
            `[Modules] WARNING! Module ${module.name} took ${timeMessage} to initialize! This may impact bot startup time.`,
          );
        } else {
          console.log(
            `[Modules] Module ${module.name} initialized in ${timeMessage}`,
          );
        }
      }
    }
  }

  const totalTime = performance.now() - globalStartTime;
  const successCount = results.filter((r) => r.success).length;
  console.log(
    `[Modules] Finished initializing ${successCount.toString()}/${MODULES.length.toString()} modules in ${totalTime.toFixed(2)}ms`,
  );
}

client.on(Events.GuildCreate, (guild) => {
  if (process.env.NODE_ENV === 'development') {
    if (client.guilds.cache.size > 1) {
      console.error(
        '[DEVELOPMENT] Isabelle is already connected to a guild. To avoid any errors, the program will not deploy commands for the new guild.',
      );
      return;
    }

    console.log(
      `[DEVELOPMENT] New guild joined: ${guild.name} (id: ${guild.id}). Deploying commands for this guild...`,
    );
    void commandManager.deployCommandsForGuild(guild.id).then(() => {
      console.log(
        `[DEVELOPMENT] Commands deployed for the ${guild.name} server!`,
      );
    });
  }
});
