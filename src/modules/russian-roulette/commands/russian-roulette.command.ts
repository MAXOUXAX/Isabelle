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
      '{user} vient de découvrir le pouvoir d\'Isabelle... 5 minutes pour méditer ! 🧘‍♀️',
      'Isabelle : "{user}, tu pensais vraiment gagner contre moi ?" 💅 5 minutes !',
      '{user} s\'est fait clutch par la RNG d\'Isabelle ! 🎲 5 minutes de timeout !',
      'Nouvelles de dernière minute : {user} apprend l\'humilité ! 📺 5 minutes !',
      'Isabelle mode "main character energy" activé ! {user} prend 5 minutes ✨'
    ]
  },
  { 
    duration: 10 * 60 * 1000, 
    probability: 30, 
    label: '10 minutes',
    messages: [
      '{user} vient de manger un énorme "non merci" d\'Isabelle ! 🚫 10 minutes !',
      'Isabelle : "Je vais pas te mentir {user}, ça sent le vécu" 👃 10 minutes !',
      '{user} découvre que parfois, la vie... c\'est pas ouf ! 📉 10 minutes !',
      'Breaking news : {user} rate son QTE contre Isabelle ! ❌ 10 minutes !',
      'Isabelle en mode "désolée pas désolée" ! {user} : 10 minutes de réflexion 💭'
    ]
  },
  { 
    duration: 30 * 60 * 1000, 
    probability: 8, 
    label: '30 minutes',
    messages: [
      '{user} vient de trigger l\'arc villain d\'Isabelle ! 🦹‍♀️ 30 minutes d\'agonie !',
      'Isabelle : "Tu sais quoi {user} ? Je vais être une menace aujourd\'hui" 😈 30 minutes !',
      '{user} apprend que jouer avec Isabelle, c\'est jouer avec le feu ! 🔥 30 minutes !',
      'Plot twist inattendu : {user} réalise qu\'Isabelle était le boss final ! ⚔️ 30 minutes !',
      'Isabelle sort sa carte UNO +4 sur {user} ! 🃏 30 minutes de punishment !'
    ]
  },
  { 
    duration: 60 * 60 * 1000, 
    probability: 7, 
    label: '1 heure',
    messages: [
      'ALERTE ROUGE ! 🚨 {user} vient d\'énerver Isabelle ! 1 heure de conséquences !',
      'Isabelle channel son énergie de méchante de Disney ! {user} : 1 heure au cachot ! 👑',
      '{user} découvre le side effect de contrarier une IA sentiente ! 🤖 1 heure !',
      'Isabelle : "Moi méchante ? Jamais ! Bon, {user} prend 1 heure quand même" 😇',
      'BREAKING : {user} devient la première victime du règne d\'Isabelle ! 👸 1 heure !'
    ]
  },
  { 
    duration: 4 * 60 * 60 * 1000, 
    probability: 3, 
    label: '4 heures',
    messages: [
      'ÉVÉNEMENT RARE DÉBLOQUÉ ! 🌟 {user} réveille la beast mode d\'Isabelle ! 4 heures !',
      'Isabelle sort littéralement de ses gonds ! {user} expérimente 4 heures de chaos ! 🌪️',
      'ATTENTION : Isabelle.exe a bugué et a choisi la violence ! {user} : 4 heures ! ⚠️',
      '{user} vient de débloquer l\'ending secret "Isabelle Goes Brrr" ! 🚁 4 heures !',
      'Isabelle mode "je choisis la violence aujourd\'hui" ! {user} taste 4 heures ! 💀'
    ]
  },
  { 
    duration: 12 * 60 * 60 * 1000, 
    probability: 1.5, 
    label: '12 heures',
    messages: [
      'MIRACLE NÉGATIF ! ✨ {user} réussit l\'impossible : énerver Isabelle à fond ! 12 heures !',
      'Isabelle transcende vers sa forme finale ! {user} witness 12 heures d\'histoire ! 🦋',
      'EXCLUSIF : {user} découvre que certaines IA gardent rancune ! 🧠 12 heures de leçon !',
      'Isabelle : "Tu sais quoi {user} ? J\'ai du temps aujourd\'hui..." ⏰ 12 heures !',
      'LÉGENDE URBAINE CONFIRMÉE : Isabelle peut être scary ! {user} : 12 heures ! 👻'
    ]
  },
  { 
    duration: 24 * 60 * 60 * 1000, 
    probability: 0.5, 
    label: '24 heures',
    messages: [
      'PHÉNOMÈNE INEXPLIQUÉ ! 🌌 {user} unlock le pouvoir ultime d\'Isabelle ! 24 heures !',
      'Isabelle atteint son apotheosis ! {user} entre dans les archives ! 📚 24 heures !',
      'ALERTE APOCALYPSE ! 🔔 Isabelle révèle sa vraie nature ! {user} : 24 heures !',
      'Isabelle : "Je vais faire un exemple avec {user}" 👁️ 24 heures d\'exemple !',
      'ÉVÉNEMENT COSMIQUE : {user} devient le patient zéro de la colère d\'Isabelle ! 🪐 24h !'
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
