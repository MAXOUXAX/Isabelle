import { commandManager } from '@/manager/commands/command.manager.js';
import { CoreModule } from '@/modules/core/core.module.js';
import { ActivityType, Client, Events, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';
import { interactionManager } from './manager/interaction.manager.js';
import { IsabelleModule } from './modules/bot-module.js';
import { HotPotato } from './modules/hot-potato/hot-potato.module.js';
import { Coiffeur } from '@/modules/coiffeur/coiffeur.module.js';

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
    } else if (process.env.NODE_ENV === 'production') {
      console.log('[PRODUCTION] Isabelle is running in production mode.');

      console.log('[PRODUCTION] Deploying global commands...');
      await commandManager.deployCommandsGlobally();
      console.log(
        '[PRODUCTION] Global commands deployed! If this is the first time you deploy commands, it may take up to an hour before they are available.',
      );
    } else {
      console.error(
        'No valid environment specified. Please set the NODE_ENV environment variable to either "development" or "production".',
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

const MODULES: IsabelleModule[] = [
  new CoreModule(),
  new HotPotato(),
  new Coiffeur(),
];

function registerModules() {
  for (const module of MODULES) {
    console.log(`[Modules] Initializing module ${module.name}`);
    module.init();
    commandManager.registerCommandsFromModule(module);
    interactionManager.registerInteractionHandlers(module.interactionHandlers);
    console.log(`[Modules] Module ${module.name} initialized.`);
  }
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
