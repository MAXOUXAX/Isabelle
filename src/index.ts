import { commandManager } from '@/manager/commands/command.manager.js';
import { CoreModule } from '@/modules/core/core.module.js';
import { Client, GatewayIntentBits } from 'discord.js';
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
  console.log('Discord bot is ready! 🤖');
  registerModules();
});

client.on('guildCreate', (guild) => {
  console.log(`New guild joined: ${guild.name} (${guild.id})`);

  // Only deploy ocmmands for the guild if we're in development mode
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  console.log('[DEVELOPMENT] Deploying commands for the new guild.');
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
