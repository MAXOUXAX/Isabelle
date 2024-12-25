import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { mentionId } from '@/utils/mention.js';
import { CommandInteraction, Guild, SlashCommandBuilder } from 'discord.js';

export class RussianRouletteCommand implements IsabelleCommand {
  commandData: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('roulette-russe')
    .setDescription(
      "Joue à la roulette russe pour avoir une chance d'être banni !",
    );

  executeCommand(interaction: CommandInteraction) {
    const guild = interaction.guild;

    if (!guild) {
      void interaction.reply('Vous ne pouvez pas jouer en DM !');
      return;
    }

    // choose a random user to be killed between the user that use the command and all the guild member
    const killed = howIsGonnaBeKilled(interaction.user.id, guild);

    if (killed) {
      const member = guild.members.cache.get(killed);
      member
        ?.createDM()
        .then(async (dm) => {
          await dm.send('Tu as perdu à la roulette russe, RIP');

          // Create an invite to the killed user to join back
          guild.invites
            .create(interaction.channelId)
            .then((invite) => {
              void dm.send(`https://discord.gg/${invite.code}`);
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
              void interaction.reply(
                'Click ! Tu as survécu à la roulette russe, GG',
              );
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

const PERCENTAGES = {
  kill_other: 0.1,
  is_killing: 0.1,
  kill_self: 0.1,
};

let numberOfGamesSinceLastKill = 0;

function howIsGonnaBeKilled(userID: string, guild: Guild) {
  const isSelfKilling = Math.random() > PERCENTAGES.kill_other;
  const killingThreshold = increasePercentageWithLog(
    PERCENTAGES.is_killing,
    0.7,
  );

  console.debug('[RussianRoullete] killingThreshold', killingThreshold);

  if (isSelfKilling) {
    if (Math.random() < killingThreshold) {
      numberOfGamesSinceLastKill = 0;
      return userID;
    }
  } else {
    if (Math.random() < killingThreshold) {
      return (
        guild.members.cache.filter((member) => member.kickable).random()?.id ??
        userID
      );
    }
  }

  return null;
}

function increasePercentageWithLog(
  maxPercentage: number,
  percentage: number,
): number {
  return Math.min(
    maxPercentage,
    percentage +
      mapNumber(Math.log(numberOfGamesSinceLastKill + 1), 0, 4, 0, 1),
  );
}

function mapNumber(
  number: number,
  in_min: number,
  in_max: number,
  out_min: number,
  out_max: number,
) {
  return (
    ((number - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min
  );
}
