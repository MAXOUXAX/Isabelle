import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { createLogger } from '@/utils/logger.js';
import { mentionId } from '@/utils/mention.js';
import {
  CommandInteraction,
  EmbedBuilder,
  Guild,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { RussianRouletteRepository } from '../data/russian-roulette.repository.js';
import { renderRussianRouletteLeaderboard } from '../canvas/leaderboard-image.js';

const logger = createLogger('russian-roulette');

export class RussianRouletteCommand implements IsabelleCommand {
  commandData: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('roulette-russe')
    .setDescription('Commandes de la roulette russe')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('jouer')
        .setDescription(
          "Joue à la roulette russe pour avoir une chance d'être touché !",
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('classement')
        .setDescription('Affiche le classement des joueurs de roulette russe'),
    );

  private repository = new RussianRouletteRepository();

  async executeCommand(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) {
      await interaction.reply({
        content: 'Commande non supportée.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'jouer':
        await this.executePlayCommand(interaction);
        break;
      case 'classement':
        await this.executeLeaderboardCommand(interaction);
        break;
      default:
        await interaction.reply({
          content: 'Sous-commande non reconnue.',
          flags: MessageFlags.Ephemeral,
        });
    }
  }

  private async executePlayCommand(interaction: CommandInteraction) {
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: 'Vous ne pouvez pas jouer en DM.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetId = getGunTarget(interaction.user.id, guild);

    // Record that the user fired a shot
    await this.repository.recordShotFired(interaction.user.id, guild.id);

    const randomSafeMessage =
      SAFE_MESSAGES[Math.floor(Math.random() * SAFE_MESSAGES.length)];

    // No one got hit this round.
    if (targetId == null) {
      numberOfGamesSinceLastKill++;
      await interaction.reply(randomSafeMessage);
      return;
    }

    try {
      const member = await guild.members
        .fetch(targetId)
        .catch(() => guild.members.cache.get(targetId));

      if (!member) {
        logger.warn(
          `Failed to fetch member ${targetId} for timeout - skipping execution`,
        );
        numberOfGamesSinceLastKill++; // pas de kill finalement
        await interaction.reply(randomSafeMessage);
        return;
      }

      if (!(member.moderatable || member.kickable)) {
        numberOfGamesSinceLastKill++;
        await interaction.reply(
          `Bang...? ${mentionId(targetId)} était trop puissant pour être affecté. Le canon a fondu et tout le monde s'en sort vivant cette fois-ci !`,
        );
        logger.debug(
          `Target ${targetId} (${member.displayName}) is not moderatable - cannot timeout`,
        );
        return;
      }

      // If the target is someone else than the shooter, announce the gun jumped hands
      if (targetId !== interaction.user.id) {
        const preTargetMessage = RIPPED_OFF_MESSAGES[
          Math.floor(Math.random() * RIPPED_OFF_MESSAGES.length)
        ]
          .replace('{shooter}', mentionId(interaction.user.id))
          .replace('{target}', mentionId(targetId));

        await interaction.reply(preTargetMessage);
      }

      // Get random timeout duration and message
      const { duration, label, message } = getRandomTimeoutDuration();

      await member.timeout(
        duration,
        `Perdu à la roulette russe (timeout ${label})`,
      );

      // Record the death/hit
      await this.repository.recordDeath(targetId, guild.id);

      numberOfGamesSinceLastKill = 0;

      // Replace {user} placeholder with actual mention
      const finalMessage = message.replace('{user}', mentionId(targetId));
      // If we already replied with the pre-target message (when target != shooter), followUp with the final timeout message
      if (targetId !== interaction.user.id) {
        await interaction.followUp(finalMessage);
      } else {
        await interaction.reply(finalMessage);
      }
      logger.debug(
        { reason: 'Russian Roulette', duration: label },
        `Successfully timed out user ${targetId} (${member.displayName}) for 5 minutes`,
      );
    } catch (e) {
      logger.error(
        { error: e },
        `Failed to timeout user ${targetId} in Russian Roulette:`,
      );
      numberOfGamesSinceLastKill++;
      await interaction.reply(
        `Le pistolet s'enraye... Personne n'est sanctionné cette fois-ci (erreur : ${(e as Error).name}).`,
      );
    }
  }

  private async executeLeaderboardCommand(interaction: CommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "Cette commande ne peut être utilisée qu'en serveur.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      content: 'Génération du classement en cours...',
    });

    try {
      // Get leaderboard data
      const leaderboardData = await this.repository.getLeaderboard(
        interaction.guild.id,
        10,
      );

      if (leaderboardData.length === 0) {
        await interaction.editReply({
          content:
            'Aucune données de roulette russe trouvées pour ce serveur. Commencez à jouer pour voir apparaître le classement !',
        });
        return;
      }

      // Generate leaderboard image
      const attachment = await renderRussianRouletteLeaderboard(
        leaderboardData,
        interaction.guild,
      );

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Roulette Russe - Record de Streaks')
        .setDescription(
          `Voici les ${String(leaderboardData.length)} joueurs avec les meilleures séries de survie !`,
        )
        .setColor(0xff4444)
        .setImage('attachment://russian-roulette-leaderboard.png')
        .setFooter({
          text: 'Le classement est basé sur la plus longue série de tirs sans être touché',
        })
        .setTimestamp();

      await interaction.editReply({
        content: null,
        embeds: [embed],
        files: [attachment],
      });
    } catch (error) {
      console.error('Failed to generate leaderboard:', error);
      await interaction.editReply({
        content:
          'Une erreur est survenue lors de la génération du classement. Réessayez plus tard.',
      });
    }
  }
}

// Probabilities (adjust if needed)
const PERCENTAGES = {
  kill_other: 0.1, // 10% chance the gun points to someone else instead of self
  is_killing: 0.1, // Base chance that the trigger actually fires (scaled dynamically)
};

const SAFE_MESSAGES: string[] = [
  'Clic ! Tu as survécu à la roulette russe, bien joué 🎯',
  "*tic* Ouf, tout va bien, tu t'en sors cette fois-ci 😅",
  "Clic ! Le canon était vide. Respire, tu es sauf pour l'instant.",
  'Tu as tiré dans le vide. Quelle chance ! 🍀',
  "Le pistolet n'a pas tiré. Sauvé. Profite de ton silence.",
  'La chambre était vide. Tu t’en sors sans une égratignure.',
  'Bang manqué. Cette fois, c’est une victoire pour toi 👍',
  'La chance est de ton côté aujourd’hui. Ne la gaspille pas 😉',
  'Coup évité de justesse, fais gaffe, on se calme et on respire 🫡.',
  'Le canon a déraillé. Pas de timeout pour toi cette fois.',
  'Suspense... click. Tu es sauf, mais reste prudent.',
  'Un hasard bienveillant t’a épargné. Raconte pas trop, ça attire la malchance 🤫',
  'Le sort t’a oublié cette fois-ci. Profite de ta liberté temporaire.',
  'Tu remportes cette manche — pas de sanction, juste des frissons.',
  "Personne n'est touché. Le chaos attendra un autre jour.",
  "Clic ! Fiou, tout va bien. Tu es sûr de vouloir continuer à jouer ? Qui te dit que tu t'en sortiras la prochaine fois ?",
];

// Messages to announce when the gun rips out of the shooter's hands and targets someone else
const RIPPED_OFF_MESSAGES: string[] = [
  "Le pistolet s'est échappé des mains de {shooter} et vise maintenant {target} !",
  'Surprise ! Le canon a glissé de {shooter} vers {target}. Attention...',
  'OOPS ! {shooter} a laissé tomber le pistolet. Il vise désormais {target} !',
  "{shooter} n'a pas fait attention et le pistolet pointe maintenant vers {target}. Glaçant !",
  '{target}, tu mérites des excuses de {shooter}... Le pistolet est maintenant pointé vers toi.',
];

// Available timeout durations with their probabilities
const TIMEOUT_OPTIONS = [
  {
    duration: 5 * 60 * 1000,
    probability: 50,
    label: '5 minutes',
    messages: [
      'J\'ai parlé. {user}, tu te prends un "stop! IL" dans les dents. 5 minutes.',
      '{user} pensait pouvoir fusionner l\'école avec les Mines. Heurtel a répondu : "Absolument pas"... Joker. 🃏 5 minutes.',
      'Le message de {user} a été jugé "non pertinent". 5 minutes pour relire tes cours.',
      "Ah, attendez, je crois que {user} a parlé... J'entends... Ah non, c'est juste le rire de Bouthier. Silence immédiat. 5 minutes.",
      "{user} s'est fait recaler par Thomas Pédalier. 5 minutes pour revoir ton cahier des charges.",
    ],
  },
  {
    duration: 10 * 60 * 1000,
    probability: 30,
    label: '10 minutes',
    messages: [
      "La dernière blague de {user} a fait tellement de bruit qu'on a cru entendre le rire de Bouthier. Fausse alerte. 10 minutes de silence.",
      "J'ai analysé le profil de {user} et j'ai trouvé des propos... problématiques. Mopty serait fier. 10 minutes pour réfléchir à tes actes cela dit.",
      "J'ai bien compté {user} et je crois que je viens de te mettre 10 minutes dans les dents. Profite bien :)",
      "Bonjour Mme Sauvi ! Ah non pardon, il y a mésentente. C'est {user} qui vient de se faire recaler pendant 10 minutes.",
      "{user} est coincé dans une boucle d'entretiens avec Marc Vélocité. Il faut bien 10 minutes pour s'en remettre.",
    ],
  },
  {
    duration: 30 * 60 * 1000,
    probability: 8,
    label: '30 minutes',
    messages: [
      "Salut {user}, je t'enverrai les raisons de ton timeout de 30 minutes... au dernier moment. Au final ça ne change pas de la communication de l'école.",
      'URGENT : {user} a demandé à Lucie Roue si elle avait des besoins fonctionnels. Elle a répondu "stop! IL". 30 minutes de confusion générale.',
      'ALERTE GÉNÉRALE, {user} EST UN ÉNORME RACISTE !!! AU CACHOT, 30 MINUTES POUR RÉFLÉCHIR À SES ACTES.',
      'Mme Heurtel a vu ton message. Elle n\'a rien dit, juste "Joker". 🃏 Tu as 30 minutes pour comprendre ce que ça veut dire.',
      "J'ai une superbe nouvelle pour toi {user}, Mopty a décidé de se charger de toi. Profite bien. 30 minutes.",
    ],
  },
  {
    duration: 60 * 60 * 1000,
    probability: 7,
    label: '1 heure',
    messages: [
      'ALERTE : Le rire de Bouthier a été détecté dans le canal. {user} est identifié comme la source de la perturbation. 1 heure de quarantaine auditive.',
      'Pierre Engrenage m\'a hackée juste pour te dire "Bonjour Mme Sauvi" à {user}. Le système a besoin d\'une heure pour se remettre de ce niveau de cringe.',
      'Un audit interne a été lancé sur le compte de {user}. Théo Mopty est en charge du dossier. On te revoit dans une heure. Ou pas.',
      'Bon écoute {user}, tu devais écopper de 30 minutes de sanction, mais tu as décidé de m\'envoyer un mail pour contester. Je te réponds "stop! IL". La sentence est doublée à 1 heure.',
      '{user}, tu pollues le chat. Donc... bah casse-toi. 1 heure.',
    ],
  },
  {
    duration: 4 * 60 * 60 * 1000,
    probability: 3,
    label: '4 heures',
    messages: [
      'Félicitations {user} ! Tu es maintenant le personnage principal du projet de garage. Ton nom est Kévin Carbu et tu dois interviewer Julie Dérailleur pendant 4 heures. Bon courage.',
      'Le rire de Bouthier a causé une faille spatio-temporelle. {user}, tu es coincé dans la boucle. Rendez-vous dans 4 heures.',
      "2 * 2 = 4. C'est aussi le nombre d'heures que tu vas passer en timeout, {user}. Réfléchis bien à cette équation.",
      'Bonjour {user}, je suis Natcha du service client SFR. Vous avez été sélectionné pour bénéficier de 4 heures de temps mort. Félicitations !',
      "J'avoue, c'est un peu vénère, mais tu m'as cherché {user}. 4 heures pour te calmer.",
    ],
  },
  {
    duration: 12 * 60 * 60 * 1000,
    probability: 1.5,
    label: '12 heures',
    messages: [
      'Je me suis fusionnée avec l\'IA du garage. Je m\'appelle désormais "Isabelle Dérailleur" et ma première décision est de te bannir 12 heures. stop! IL',
      "Je m'en fous de ce que tu dis {user}, tu vas prendre 12 heures de timeout. C'est comme ça et pas autrement.",
      '{user}, tu as été sélectionné pour une mission secrète avec Marc Vélocité. Tu seras indisponible pendant 12 heures. Ne pose pas de questions.',
      'Ne te retourne surtout pas {user} ! Non mais vraiment, ne te retourne sous aucun prétexte. Il y a Marc Vélocité derrière toi. Il est venu te parler 12 heures.',
      "Je t'écoute. Ah non, en fait je ne t'écoute pas du tout {user}. 12 heures pour fermer ta gueule.",
    ],
  },
  {
    duration: 24 * 60 * 60 * 1000,
    probability: 0.5,
    label: '24 heures',
    messages: [
      "{user} a énervé Pierre Engrenage. Personne n'énerve Pierre Engrenage. Il m'a personnellement demandé de te bannir 24 heures. C'est ça la mécanique.",
      "Félicitations, {user} ! Pour ton comportement exemplaire, l'école a décidé de te nommer responsable de l'organisation des examens. Ta première mission : ne rien faire pendant 24 heures. Tu as l'habitude.",
      'Le compte de {user} a été racheté par Théo Mopty. Il sera inaccessible pendant 24h pour "purification ethnique du contenu". C\'est une blague, bien sûr... Joker. 🃏',
      "On m'a soufflé à l'oreille que l'école était en feu. Pour ta sécurité, {user}, tu es mis en quarantaine préventive de 24 heures. Ne t'inquiète pas : c'est juste une précaution.",
      "Je ne suis vraiment pas d'humeur et je m'en fous des conséquences. Rien à foutre de ton avis {user}, ferme ta grande gueule pendant 24 heures.",
    ],
  },
];

/**
 * Selects a random timeout duration based on weighted probabilities
 */
function getRandomTimeoutDuration(): {
  duration: number;
  label: string;
  message: string;
} {
  const random = Math.random() * 100; // 0-100
  let cumulative = 0;

  for (const option of TIMEOUT_OPTIONS) {
    cumulative += option.probability;
    if (random < cumulative) {
      // Select a random message from the available messages
      const randomMessage =
        option.messages[Math.floor(Math.random() * option.messages.length)];
      return {
        duration: option.duration,
        label: option.label,
        message: randomMessage,
      };
    }
  }

  // Fallback to first option (should never happen)
  const fallbackOption = TIMEOUT_OPTIONS[0];
  const randomMessage =
    fallbackOption.messages[
      Math.floor(Math.random() * fallbackOption.messages.length)
    ];
  return {
    duration: fallbackOption.duration,
    label: fallbackOption.label,
    message: randomMessage,
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
    0.7, // maxPercentage - maximum chance we can reach
    PERCENTAGES.is_killing, // base - starting chance
  );

  logger.debug(
    `Calculated dynamic fire chance: ${dynamicFireChance.toFixed(3)} (${numberOfGamesSinceLastKill.toString()} games since last kill)`,
  );

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
