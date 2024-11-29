import { commandManager } from '@/manager/commands/command.manager.js';
import { CoreModule } from '@/modules/core/core.module.js';
import { ActivityType, Client, GatewayIntentBits } from 'discord.js';
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

client.once('ready', () => {
  async function handler() {
    console.log("Connected to Discord's Gateway! 🎉");

    console.log('Registering modules...');
    registerModules();

    console.log('Deploying global commands...');
    await commandManager.deployCommandsGlobally();

    if (process.env.NODE_ENV === 'development') {
      console.log('[DEVELOPMENT] Isabelle is running in development mode.');

      const { size } = client.guilds.cache;

      client.guilds.cache.reduce((acc, guild) => {
        acc.push(guild.name);
        return acc;
      }, [] as string[]);

      if (size > 1) {
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

client.on('interactionCreate', (interaction) => {
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

const MODULES: IsabelleModule[] = [new CoreModule(), new HotPotato()];

function registerModules() {
  for (const module of MODULES) {
    console.log(`[Modules] Initializing module ${module.name}`);
    module.init();
    commandManager.registerCommandsFromModule(module);
    interactionManager.registerInteractionHandlers(module.interactionHandlers);
    console.log(`[Modules] Module ${module.name} initialized.`);
  }
}
