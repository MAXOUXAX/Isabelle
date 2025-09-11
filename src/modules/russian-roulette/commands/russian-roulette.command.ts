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
      await interaction.reply('Vous ne pouvez pas jouer en DM !');
      return;
    }

    const targetId = getGunTarget(interaction.user.id, guild);

    // No one got hit this round.
    if (targetId == null) {
      numberOfGamesSinceLastKill++;
      await interaction.reply('Click ! Tu as survécu à la roulette russe, GG');
      return;
    }

    // Reset counter on kill (any kill: self or other)
    numberOfGamesSinceLastKill = 0;

    try {
      const member = await guild.members
        .fetch(targetId)
        .catch(() => guild.members.cache.get(targetId));

      if (!member) {
        console.warn('[RussianRoulette] Impossible de récupérer le membre');
        await interaction.reply(
          'Click ! Tu as survécu à la roulette russe, GG',
        );
        return;
      }

      // 5 minutes timeout
      await member.timeout(
        TIMEOUT_DURATION_MS,
        'Perdu à la roulette russe (timeout 5 min)',
      );

      await interaction.reply(
        `Bang ! ${mentionId(targetId)} a été mis en timeout pendant 5 minutes.`,
      );
      console.debug(
        '[RussianRoulette] Timed-out user',
        targetId,
        mentionId(targetId),
      );
    } catch (e) {
      console.error('[RussianRoulette] Error while timing out user', e);
      await interaction.reply(
        'Une erreur est survenue, personne ne meurt cette fois-ci.',
      );
    }
  }
}

// Probabilities (tweak as needed)
const PERCENTAGES = {
  kill_other: 0.1, // 10% chance the gun points to someone else instead of self
  is_killing: 0.1, // Base chance that the trigger actually fires (scaled dynamically)
};

// Duration of the timeout applied when a player "dies" (5 minutes)
const TIMEOUT_DURATION_MS = 5 * 60 * 1000;

let numberOfGamesSinceLastKill = 0;

/**
 * Determines who (if anyone) is hit by the roulette.
 * Returns null when nobody is hit.
 */
function getGunTarget(userID: string, guild: Guild) {
  const targetSelf = Math.random() > PERCENTAGES.kill_other;
  const dynamicFireChance = increasePercentageWithLog(
    PERCENTAGES.is_killing,
    0.7,
  );

  console.debug('[RussianRoulette] dynamicFireChance', dynamicFireChance);

  // Gun does not fire
  if (Math.random() >= dynamicFireChance) return null;

  if (targetSelf) return userID;

  // Pick a random moderatable member; fallback to self if none
  const otherId = guild.members.cache
    .filter((m) => m.id !== userID && (m.moderatable || m.kickable))
    .random()?.id;
  return otherId ?? userID;
}

// Increase the chance that someone is gonna be killed, plus la suite de commande sans kill augmente plus la chance est elever
function increasePercentageWithLog(
  maxPercentage: number,
  base: number,
): number {
  return Math.min(
    maxPercentage,
    base + mapNumber(Math.log(numberOfGamesSinceLastKill + 1), 0, 4, 0, 1),
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
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
) {
  return ((number - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}
