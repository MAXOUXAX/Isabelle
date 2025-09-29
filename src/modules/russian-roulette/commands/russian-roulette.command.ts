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
      'Bang ! {user} a été mis en timeout pendant 5 minutes.',
      'Clac ! {user} s\'est pris une petite pause de 5 minutes.',
      'Oups ! {user} fait une sieste forcée de 5 minutes.',
      'Bim ! {user} prend un petit temps mort de 5 minutes.',
      'Paf ! {user} va réfléchir 5 minutes à ses actions.'
    ]
  },
  { 
    duration: 10 * 60 * 1000, 
    probability: 30, 
    label: '10 minutes',
    messages: [
      'Bang ! {user} a été mis en timeout pendant 10 minutes.',
      'Badaboum ! {user} fait une pause de 10 minutes pour se calmer.',
      'Plouf ! {user} s\'offre 10 minutes de méditation forcée.',
      'Tchac ! {user} va compter jusqu\'à 600... lentement.',
      'Vlan ! {user} prend 10 minutes pour réfléchir à sa vie.'
    ]
  },
  { 
    duration: 30 * 60 * 1000, 
    probability: 8, 
    label: '30 minutes',
    messages: [
      'BANG ! {user} a été mis en timeout pendant 30 minutes.',
      'Oh là là ! {user} va avoir le temps de faire une vraie sieste de 30 minutes !',
      'Aïe aïe aïe ! {user} a touché le mauvais numéro... 30 minutes de réflexion !',
      'Saperlipopette ! {user} va pouvoir regarder un épisode entier en attendant ses 30 minutes.',
      'Ma foi ! {user} a décroché le gros lot... 30 minutes de silence radio !'
    ]
  },
  { 
    duration: 60 * 60 * 1000, 
    probability: 7, 
    label: '1 heure',
    messages: [
      'BOOM ! {user} a été mis en timeout pendant 1 heure entière !',
      'Sacrée déveine ! {user} va avoir le temps de préparer le dîner... 1 heure de pause !',
      'Quel malheur ! {user} vient de gagner 1 heure de contemplation existentielle !',
      'Par tous les diables ! {user} a tiré le mauvais numéro... 1 heure de pénitence !',
      'Tonnerre de Brest ! {user} va pouvoir faire une longue promenade... dans sa tête, pendant 1 heure !'
    ]
  },
  { 
    duration: 4 * 60 * 60 * 1000, 
    probability: 3, 
    label: '4 heures',
    messages: [
      'EXPLOSION ! {user} a été mis en timeout pendant 4 HEURES ! Quelle catastrophe !',
      'Nom d\'une pipe ! {user} vient de gagner un demi-journée de vacances... forcées ! 4 heures !',
      'Sacré tonnerre ! {user} a décroché le jackpot de la malchance... 4 heures de silence !',
      'Mille sabords ! {user} va avoir le temps de lire un livre entier... 4 heures de timeout !',
      'Crénom de crénom ! {user} vient de découvrir ce que ça fait de vraiment perdre à la roulette... 4 heures !'
    ]
  },
  { 
    duration: 12 * 60 * 60 * 1000, 
    probability: 1.5, 
    label: '12 heures',
    messages: [
      'CATACLYSME ! {user} a été mis en timeout pendant 12 HEURES ! Isabelle n\'en revient pas !',
      'Grands dieux ! {user} vient de battre le record de la malchance... 12 heures de solitude !',
      'Fichtre et foutre ! {user} va pouvoir dormir, manger, et dormir encore... 12 heures de pénitence !',
      'Ventrebleu ! {user} vient de découvrir le vrai sens du mot "timeout"... 12 heures !',
      'Sacré mille millions de mille sabords ! {user} a touché le gros lot de la déveine... 12 heures !'
    ]
  },
  { 
    duration: 24 * 60 * 60 * 1000, 
    probability: 0.5, 
    label: '24 heures',
    messages: [
      'APOCALYPSE ! {user} a été mis en timeout pendant 24 HEURES COMPLÈTES ! Isabelle est en état de choc !',
      'Par la barbe de Neptune ! {user} vient de gagner une journée entière de réflexion... 24 heures !',
      'Sapristi de sapristi ! {user} va avoir le temps de réviser toute sa vie... 24 heures de timeout !',
      'Jarnidieu ! {user} vient de découvrir ce que veut dire "malchance légendaire"... 24 heures !',
      'Corbleu et palsambleu ! {user} entre dans les annales de la roulette russe... 24 heures de bannissement temporaire !'
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
