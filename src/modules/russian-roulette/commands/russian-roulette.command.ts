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

      // Get random timeout duration and message
      const { duration, label, message } = getRandomTimeoutDuration();

      await member.timeout(
        duration,
        `Perdu à la roulette russe (timeout ${label})`,
      );

      numberOfGamesSinceLastKill = 0;

      // Replace {user} placeholder with actual mention
      const finalMessage = message.replace('{user}', mentionId(targetId));
      await interaction.reply(finalMessage);
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

// Available timeout durations with their probabilities (80% for 5-10min, 20% for longer)
const TIMEOUT_OPTIONS = [
  { 
    duration: 5 * 60 * 1000, 
    probability: 50, 
    label: '5 minutes',
    messages: [
      'RIP {user} 💀 5 minutes de timeout !',
      'Oups ! {user} s\'est fait no-scope par Isabelle... 5 minutes !',
      '{user} vient de se faire sus impostor 📮 5 minutes de penalty !',
      'Skill issue ! {user} prend 5 minutes pour git gud 🎮',
      'Isabelle t\'a vraiment fumée sur ce coup {user} ! 5 minutes de pause ☕'
    ]
  },
  { 
    duration: 10 * 60 * 1000, 
    probability: 30, 
    label: '10 minutes',
    messages: [
      'F in the chat pour {user} ! 10 minutes de timeout 😭',
      '{user} vient de découvrir que la vie c\'est pas un tuto YouTube... 10 minutes !',
      'Bruh moment 💀 {user} se tape 10 minutes de réflexion !',
      'Ratio + L + {user} prend 10 minutes 📉',
      'Isabelle : "Et c\'est là que {user} a compris qu\'il avait merdé" 🎭 10 minutes !'
    ]
  },
  { 
    duration: 30 * 60 * 1000, 
    probability: 8, 
    label: '30 minutes',
    messages: [
      'EMOTIONAL DAMAGE ! 😱 {user} mange 30 minutes de timeout !',
      '{user} vient de pull une branche en prod... 30 minutes pour réfléchir ! 🐛',
      'Mamma mia ! {user} s\'est fait spaghetti code par Isabelle ! 🍝 30 minutes !',
      'Plot twist : {user} pensait être le main character... 30 minutes de side quest ! 🎮',
      'Isabelle mode hacker activé 👩‍💻 {user} debug pendant 30 minutes !'
    ]
  },
  { 
    duration: 60 * 60 * 1000, 
    probability: 7, 
    label: '1 heure',
    messages: [
      'GAME OVER ! 🎮 {user} respawn dans 1 heure !',
      '{user} vient de commit sans tests... 1 heure de CI/CD en panne ! 🚨',
      'Porco dio ! {user} s\'est fait rekt by Isabelle ! 🇮🇹 1 heure !',
      'Achievement unlocked : "How did we get here?" {user} - 1 heure de timeout ! 🏆',
      'Isabelle en mode "I\'m about to end this person\'s whole career" 😎 {user} : 1 heure !'
    ]
  },
  { 
    duration: 4 * 60 * 60 * 1000, 
    probability: 3, 
    label: '4 heures',
    messages: [
      'CRITICAL ERROR 🔥 {user} needs 4 hours to recompile his life !',
      '{user} a try-catch son existence mais a oublié le catch... 4 heures ! 💻',
      'Madonna mia ! {user} s\'est fait carbonara par la roulette ! 🍝 4 heures !',
      '{user} vient de découvrir le sens du mot "segfault" IRL... 4 heures ! ⚠️',
      'Isabelle : "Some people just want to watch the world burn" 🔥 {user} : 4 heures !'
    ]
  },
  { 
    duration: 12 * 60 * 60 * 1000, 
    probability: 1.5, 
    label: '12 heures',
    messages: [
      'LEGENDARY FAIL ! 🏆 {user} entre dans le hall of fame des loosers ! 12 heures !',
      '{user} vient de rm -rf sa chance... 12 heures de recovery ! 💾',
      'Che cazzo ! {user} s\'est fait destroy par Isabelle ! 🇮🇹 12 heures !',
      'Boss fight final : {user} vs Reality - Spoiler : Reality wins ! 12 heures ! ⚔️',
      'Isabelle mode "I choose violence" activated 😈 {user} : 12 heures de souffrance !'
    ]
  },
  { 
    duration: 24 * 60 * 60 * 1000, 
    probability: 0.5, 
    label: '24 heures',
    messages: [
      'ULTRA RARE ACHIEVEMENT UNLOCKED ! 🌟 {user} : "Touched grass... NOT" - 24 heures !',
      '{user} vient de sudo rm -rf /life... 24 heures de kernel panic ! 💀',
      'PORCO DIO SANTO ! {user} s\'est fait annihiler ! 🇮🇹 24 heures de punizione !',
      'Speedrun World Record : {user} "How to lose at life%" - 24 heures ! 🏃‍♂️💨',
      'Isabelle mode final boss activated ! {user} découvre le true ending : 24 heures ! 👑'
    ]
  }
];

/**
 * Selects a random timeout duration based on weighted probabilities
 */
function getRandomTimeoutDuration(): { duration: number; label: string; message: string } {
  const random = Math.random() * 100; // 0-100
  let cumulative = 0;

  for (const option of TIMEOUT_OPTIONS) {
    cumulative += option.probability;
    if (random < cumulative) {
      // Select a random message from the available messages
      const randomMessage = option.messages[Math.floor(Math.random() * option.messages.length)];
      return { 
        duration: option.duration, 
        label: option.label,
        message: randomMessage
      };
    }
  }

  // Fallback to first option (should never happen)
  const fallbackOption = TIMEOUT_OPTIONS[0];
  const randomMessage = fallbackOption.messages[Math.floor(Math.random() * fallbackOption.messages.length)];
  return {
    duration: fallbackOption.duration,
    label: fallbackOption.label,
    message: randomMessage
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
