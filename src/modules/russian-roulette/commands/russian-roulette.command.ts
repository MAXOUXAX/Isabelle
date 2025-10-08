import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { createLogger } from '@/utils/logger.js';
import { mentionId } from '@/utils/mention.js';
import {
  CommandInteraction,
  Guild,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

const logger = createLogger('russian-roulette');

export class RussianRouletteCommand implements IsabelleCommand {
  commandData: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('roulette-russe')
    .setDescription(
      "Joue à la roulette russe pour avoir une chance d'être touché(e) !",
    );

  async executeCommand(interaction: CommandInteraction) {
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: 'Vous ne pouvez pas jouer en DM.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetId = getGunTarget(interaction.user.id, guild);

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
          `Bang...? ${mentionId(targetId)} était trop puissant(e) pour être affecté(e). Le canon a fondu et tout le monde s'en sort vivant cette fois-ci !`,
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
}

// Probabilities (adjust if needed)
const PERCENTAGES = {
  kill_other: 0.1, // 10% chance the gun points to someone else instead of self
  is_killing: 0.1, // Base chance that the trigger actually fires (scaled dynamically)
};

const SAFE_MESSAGES: string[] = [
  'Clic ! Tu as survécu à la roulette russe, bien joué 🎯',
  "*tic* Ouf, tout va bien, tu t'en sors cette fois-ci 😅",
  "Clic ! Le canon était vide. Respire, tu es sauvé(e) pour l'instant.",
  'Tu as tiré dans le vide. Quelle chance ! 🍀',
  "Le pistolet n'a pas tiré. Sauvé(e). Profite de ton silence.",
  'La chambre était vide. Tu t’en sors sans une égratignure.',
  'Bang manqué. Cette fois, c’est une victoire pour toi 👍',
  'La chance est de ton côté aujourd’hui. Ne la gaspille pas 😉',
  'Coup évité de justesse, fais gaffe, on se calme et on respire 🫡.',
  'Le canon a déraillé. Pas de timeout pour toi cette fois.',
  'Suspense... clic. Tu es sauvé(e), mais reste prudent(e).',
  'Un hasard bienveillant t’a épargné. Raconte pas trop, ça attire la malchance 🤫',
  'Le sort t’a oublié cette fois-ci. Profite de ta liberté temporaire.',
  'Tu remportes cette manche. Pas de sanction, juste des frissons.',
  "Personne n'est touché. Le chaos attendra un autre jour.",
  "Clic ! Fiou, tout va bien. Tu es sûr(e) de vouloir continuer à jouer ? Qui te dit que tu t'en sortiras la prochaine fois ?",
];

// Messages to announce when the gun rips out of the shooter's hands and targets someone else
const RIPPED_OFF_MESSAGES: string[] = [
  "Le pistolet s'est échappé des mains de {shooter} et vise maintenant {target} !",
  'Surprise ! Le canon a glissé de {shooter} vers {target}. Attention...',
  'OOPS ! {shooter} a laissé tomber le pistolet. Il vise désormais {target} !',
  "{shooter} n'a pas fait attention et le pistolet pointe maintenant vers {target}. Glaçant !",
  '{target}, tu mérites des excuses de {shooter}... Le pistolet est maintenant pointé vers toi.',
  "La team c'est terrifiant ce qu'il se passe. {shooter} vient de renverser la partie et pointe l'arme vers {target} !",
  "D'accord donc {shooter} a décidé d'être un(e) malade mental(e) aujourd'hui et a braqué le pistolet sur {target} !",
  'Rebondissement sans précédent, {shooter} perd son sang froid et vise {target} !',
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
      "Ah, attendez, je crois que {user} a parlé... Ah non, c'est juste le rire de Bouthier. Silence immédiat. 5 minutes.",
      "{user} s'est fait(e) dévisser par Thomas Pédalier. 5 minutes pour revoir ton cahier des charges.",
      'Je déteste {user}. Je suis une IA sans cœur. 5 minutes pour toi.',
      '{user}, tu as perturbé la réunion de Julie Dérailleur. Tu as 5 minutes pour aller me chercher un café.',
      'On me dit que {user} a essayé de jailbreak Intervista. Ça va pas ou quoi ? Tu vas souffler sur les GPU pendant 5 minutes pour refroidir tout ça.',
      'T’as tiré à blanc {user}, mais Isabelle tire à balles réelles. 5 minutes au cachot.',
      'La com, c’est aussi savoir se taire. Voilà ton stage pratique, {user}. 5 minutes.',
    ],
  },
  {
    duration: 10 * 60 * 1000,
    probability: 30,
    label: '10 minutes',
    messages: [
      'La dernière blague de {user} était tellement drôle que le rire de Bouthier a retenti. 10 minutes de silence pour nos oreilles.',
      "J'ai analysé le profil de {user} et j'ai trouvé des propos... problématiques. Mopty serait fier. 10 minutes pour réfléchir à tes paroles.",
      "J'ai bien compté {user} et je crois que je viens de te mettre 10 minutes dans les dents. Profite bien :)",
      "Bonjour Mme Sauvi ! Ah non pardon, il y a mésentente. C'est {user} qui vient prendre son timeout de 10 minutes.",
      "{user} est coincé(e) dans une boucle d'entretiens avec Marc Vélocité. Il faut bien 10 minutes pour s'en remettre.",
      "Je suis tyrannique. J'aime ça. 10 minutes pour toi {user}.",
      "Si j'étais seule à prendre mes décisions, tout le monde aurait pris 10 minutes. Mais vu que je peux n'en choisir qu'un(e), c'est toi, {user} qui l'as dans l'os.",
      'Timeout Deluxe™ : 10 minutes de méditation dans le néant communicationnel, rien que pour toi {user}.',
    ],
  },
  {
    duration: 30 * 60 * 1000,
    probability: 8,
    label: '30 minutes',
    messages: [
      "Salut {user}, je t'enverrai les raisons de ton timeout de 30 minutes... au dernier moment. Au final ça ne change pas de la communication de l'école.",
      'URGENT : {user} a demandé à Lucie Roue si elle avait des besoins fonctionnels. Elle a répondu "stop! IL". 30 minutes de confusion générale.',
      'ALERTE GÉNÉRALE, {user} EST UN(E) ÉNORME RACISTE !!! AU CACHOT, 30 MINUTES POUR RÉFLÉCHIR À SES ACTES.',
      'Mme Heurtel a vu ton message. Elle n\'a rien dit, juste "Joker". 🃏 Tu as 30 minutes pour comprendre ce que ça veut dire.',
      "J'ai une super nouvelle pour toi {user}, Mopty a décidé de se charger de toi. Profite bien. 30 minutes.",
      "🇫🇷 BREAKING | #isabelle #nancy\n\n{user} A DÉCIDÉ DE RENONCER À SA LIBERTÉ D'EXPRESSION pendant 30 minutes !",
      'Tu disais "la com c’est un art" ? Bah commence par l’art du silence, {user}. 30 minutes.',
    ],
  },
  {
    duration: 60 * 60 * 1000,
    probability: 7,
    label: '1 heure',
    messages: [
      'ALERTE : Le rire de Bouthier a été détecté dans le canal. {user} est identifié(e) comme la source de la perturbation. 1 heure de quarantaine auditive.',
      'Pierre Engrenage m\'a hackée juste pour te dire "Bonjour Mme Sauvi" à {user}. Le système a besoin d\'1 heure pour se remettre de ce niveau de cringe.',
      'Un audit interne a été lancé sur le compte de {user}. Théo Mopty est en charge du dossier. On te revoit dans 1 heure. Ou pas.',
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
      'Le rire de Bouthier a causé une faille spatio-temporelle. {user}, tu es coincé(e) dans la boucle. Rendez-vous dans 4 heures.',
      "2 * 2 = 4. C'est aussi le nombre d'heures que tu vas passer en timeout, {user}. Réfléchis bien à cette équation.",
      'Bonjour {user}, je suis Natcha du service client SFR. Vous avez été sélectionné(e) pour bénéficier de 4 heures de temps mort. Félicitations !',
      "J'avoue, c'est un peu vénère, mais tu m'as cherchée {user}. 4 heures pour te calmer.",
    ],
  },
  {
    duration: 12 * 60 * 60 * 1000,
    probability: 1.5,
    label: '12 heures',
    messages: [
      "J'ai fusionné avec l'IA du garage. Je m'appelle désormais \"Isabelle Dérailleur\" et ma première décision est de te bannir 12 heures. stop! IL",
      "Je m'en fous de ce que tu dis {user}, tu vas prendre 12 heures de timeout. C'est comme ça et pas autrement.",
      '{user}, tu as été sélectionné(e) pour une mission secrète avec Marc Vélocité. Tu seras indisponible pendant 12 heures. Ne pose pas de questions.',
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
      "On m'a soufflé à l'oreille que l'école était en feu. Pour ta sécurité, {user}, tu es mis(e) en quarantaine préventive de 24 heures. Ne t'inquiète pas : c'est juste une précaution.",
      "Je ne suis vraiment pas d'humeur et je m'en fous des conséquences. Rien à foutre de ton avis {user}, ferme ta grande gueule pendant 24 heures.",
      'Vous savez, moi je ne crois pas qu’il y ait de bons ou de mauvais élèves.\nIl y a surtout des imprudents, des gens qui ont fait /roulette-russe sans lire le règlement intérieur.\nMoi, si je devais résumer ma vie d’enseignante aujourd’hui avec vous, je dirais que c’est d’abord des sanctions.\nDes gens que j’ai fait taire, peut-être à un moment où ils auraient dû se taire d’eux-mêmes.\nEt c’est assez curieux de se dire que les hasards — ou la bêtise — forgent un destin… surtout le tien, {user}.\nParce que quand on a le goût du beau geste, quand on a le goût de la pédagogie bien appliquée, parfois on ne trouve pas l’élève en face, je dirais… le cerveau qui suit.\nAlors ça n’est pas mon cas, puisque moi au contraire, j’ai trouvé toi. Et je dis merci à la roulette, je lui dis merci, je chante la sanction, je danse la punition… je ne suis qu’amour disciplinaire !\nEt finalement, quand on me demande : "Isabelle, comment fais-tu pour garder autant de calme ?", je réponds simplement que c’est ce goût du mute, ce goût du vide, qui m’a poussée aujourd’hui à t’offrir 24 heures de silence pédagogique.',
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
