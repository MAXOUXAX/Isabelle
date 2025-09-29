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

    try {
      const member = await guild.members
        .fetch(targetId)
        .catch(() => guild.members.cache.get(targetId));

      if (!member) {
        console.warn('[RussianRoulette] Impossible de récupérer le membre');
        numberOfGamesSinceLastKill++; // pas de kill finalement
        await interaction.reply(
          'Click ! Tu as survécu à la roulette russe, GG',
        );
        return;
      }

      if (!(member.moderatable || member.kickable)) {
        numberOfGamesSinceLastKill++;
        await interaction.reply(
          `Bang...? ${mentionId(targetId)} était trop puissant pour être affecté. Le canon a fondu et tout le monde s'en sort vivant cette fois-ci !`,
        );
        console.debug('[RussianRoulette] Target not moderatable', targetId);
        return;
      }

      // Get random timeout duration
      const { duration, label } = getRandomTimeoutDuration();

      await member.timeout(
        duration,
        `Perdu à la roulette russe (timeout ${label})`,
      );

      numberOfGamesSinceLastKill = 0;

      await interaction.reply(
        `Bang ! ${mentionId(targetId)} a été mis en timeout pendant ${label}.`,
      );
      console.debug(
        '[RussianRoulette] Timed-out user',
        targetId,
        mentionId(targetId),
      );
    } catch (e) {
      console.error('[RussianRoulette] Error while timing out user', e);
      numberOfGamesSinceLastKill++;
      await interaction.reply(
        `Le pistolet s'enraye... Personne ne meurt cette fois-ci (erreur: ${(e as Error).name}).`,
      );
    }
  }
}

// Probabilities (tweak as needed)
const PERCENTAGES = {
  kill_other: 0.1, // 10% chance the gun points to someone else instead of self
  is_killing: 0.1, // Base chance that the trigger actually fires (scaled dynamically)
};

// Available timeout durations with their probabilities
const TIMEOUT_OPTIONS = [
  { duration: 5 * 60 * 1000, probability: 25, label: '5 minutes' }, // 25%
  { duration: 10 * 60 * 1000, probability: 20, label: '10 minutes' }, // 20%
  { duration: 30 * 60 * 1000, probability: 15, label: '30 minutes' }, // 15%
  { duration: 60 * 60 * 1000, probability: 15, label: '1 heure' }, // 15%
  { duration: 4 * 60 * 60 * 1000, probability: 15, label: '4 heures' }, // 15%
  { duration: 12 * 60 * 60 * 1000, probability: 5, label: '12 heures' }, // 5%
  { duration: 24 * 60 * 60 * 1000, probability: 5, label: '24 heures' }, // 5%
];

/**
 * Selects a random timeout duration based on weighted probabilities
 */
function getRandomTimeoutDuration(): { duration: number; label: string } {
  const random = Math.random() * 100; // 0-100
  let cumulative = 0;

  for (const option of TIMEOUT_OPTIONS) {
    cumulative += option.probability;
    if (random < cumulative) {
      return { duration: option.duration, label: option.label };
    }
  }

  // Fallback to first option (should never happen)
  return {
    duration: TIMEOUT_OPTIONS[0].duration,
    label: TIMEOUT_OPTIONS[0].label,
  };
}

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
