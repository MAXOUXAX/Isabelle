import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { mentionId } from '@/utils/mention.js';
import { CommandInteraction, Guild, SlashCommandBuilder } from 'discord.js';

export class RussianRouletteCommand implements IsabelleCommand {
  commandData: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('roulette-russe')
    .setDescription(
      "Joue à la roulette russe pour avoir une chance d'être banni !",
    );

  async executeCommand(interaction: CommandInteraction) {
    const user = interaction.user.id;

    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply("You can't play this game in DMs!");
      return;
    }

    // choose a random user to be killed between the user that use the command and all the guild member
    const killed = howIsGonnaBeKilled(user, guild);

    if (killed) {
      const member = guild.members.cache.get(killed);
      member
        ?.createDM()
        .then(async (dm) => {
          await dm.send('Tu as perdu à la roulette russe, RIP');

          // Create an invite to the killed user to join back
          guild.invites
            .create(interaction.channelId)
            .then(async (invite) => {
              await dm.send(`https://discord.gg/${invite.code}`);
              interaction.guild?.members
                .kick(killed, 'Tu as perdu à la roulette russe, RIP')
                .catch((e: unknown) => {
                  console.error(
                    '[RussianRoulette] Error while kicking user',
                    e,
                  );
                  interaction
                    .reply('Click ! Tu as survécu à la roulette russe, GG')
                    .catch((e: unknown) => {
                      console.error(e);
                    });
                });
              console.log(
                '[RussianRoulette] Kicked user',
                killed,
                mentionId(killed),
              );
            })
            .catch((e: unknown) => {
              console.error('[RussianRoulette] Error while creating invite', e);
              interaction
                .reply('Click ! Tu as survécu à la roulette russe, GG')
                .catch((e: unknown) => {
                  console.error(e);
                });
            });
        })
        .catch((e: unknown) => {
          console.error('[RussianRoulette] Error while sending DM', e);
          interaction.reply('Error while sending DM').catch((e: unknown) => {
            console.error(e);
          });
        });
    } else {
      interaction
        .reply('Click ! Tu as survécu à la roulette russe, GG')
        .catch((e: unknown) => {
          console.error(e);
        });
    }
  }
}

const POURCENTAGES = {
  kill_other: 0.1,
  is_killing: 0.1,
  kill_self: 0.1,
};

function howIsGonnaBeKilled(user: string, guild: Guild) {
  const isSelfKilling = Math.random() > POURCENTAGES.kill_other;
  if (isSelfKilling) {
    if (Math.random() < POURCENTAGES.kill_self) {
      return user;
    }
  } else {
    if (Math.random() < POURCENTAGES.is_killing) {
      return (
        guild.members.cache.filter((member) => member.kickable).random()?.id ??
        user
      );
    }
  }

  return null;
}
