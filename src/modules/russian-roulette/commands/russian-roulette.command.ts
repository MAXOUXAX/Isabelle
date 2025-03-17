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
    const guild = interaction.guild;

    if (!guild) {
      void interaction.reply('Vous ne pouvez pas jouer en DM !');
      return;
    }

    // choose a random user to be killed between the user that use the command and all the guild member
    const killed = getGunTarget(interaction.user.id, guild);

    if (killed == null) {
      interaction
        .reply('Click ! Tu as survécu à la roulette russe, GG')
        .catch((e: unknown) => {
          console.error(e);
        });
      return
    }

    const member = guild.members.cache.get(killed);
    try {
      const dm = await member?.createDM();
      if (dm) {
        await dm.send('Tu as perdu à la roulette russe, RIP');

        try {
          const invite = await guild.invites.create(interaction.channelId);
          await dm.send(`https://discord.gg/${invite.code}`);
          await interaction.guild?.members.kick(killed, 'Tu as perdu à la roulette russe, RIP');
          console.debug('[RussianRoulette] Kicked user', killed, mentionId(killed));
        } catch (e) {
          console.error('[RussianRoulette] Error while creating invite or kicking user', e);
          await interaction.reply('Click ! Tu as survécu à la roulette russe, GG');
        }
      }
    } catch (e) {
      console.error('[RussianRoulette] Error while sending DM', e);
      await interaction.reply('Error while sending DM');
    }
  }
}

const PERCENTAGES = {
  kill_other: 0.1,
  is_killing: 0.1,
  kill_self: 0.1,
};

let numberOfGamesSinceLastKill = 0;

function getGunTarget(userID: string, guild: Guild) {
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

// Increase the chance that someone is gonna be killed, plus la suite de commande sans kill augmente plus la chance est elever
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

// map un nombre d'une tranche vers une autre
// exemple :
// number : 5
// in_min : 0
// in_max : 10
// out_min : 10
// out_max : 20
// return : 15
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
