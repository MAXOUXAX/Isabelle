import { legalManager } from '@/modules/legal/legal.manager.js';
import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorSpacingSize,
} from 'discord.js';

// Register the generative AI consent scope
export const generativeAi = Object.freeze({
  scope: 'generative-ai',
  displayName: 'IA Générative',
  commandName: 'ia-générative',
  commandDescription:
    "Donner ou retirer votre consentement à l'utilisation de l'IA générative.",
  buildPrompt: () => {
    return new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          "# 🚀 Débloquez les fonctionnalités IA d'Isabelle !\n\n" +
            "Pour accéder aux commandes utilisant l'IA générative, et pour que les autres puissent les utiliser sur vous, votre autorisation est nécessaire.",
        ),
      )
      .addSeparatorComponents((separator) =>
        separator.setSpacing(SeparatorSpacingSize.Large).setDivider(true),
      )
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          '## 🧐 Comment ça marche ?\n\n' +
            '- Les messages récents envoyés sur ce serveur Discord peuvent être transmis\n' +
            '- Aucun message privé ne sera transmis, ni les messages en dehors de ce serveur\n' +
            '- Ils ne seront jamais stockés par Isabelle\n' +
            '- Ils sont uniquement utilisés pour générer des réponses\n' +
            "- Les conditions des services tiers s'appliquent\n\n" +
            "Pour plus de détails, consultez les [conditions d'utilisation de l'API Gemini](https://ai.google.dev/gemini-api/terms?hl=fr#data-use-unpaid)",
        ),
      )
      .addSeparatorComponents((separator) =>
        separator.setSpacing(SeparatorSpacingSize.Large).setDivider(true),
      )
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          '## 🔑 Votre consentement\n\n' +
            "Sans votre accord, vous ne pourrez **ni utiliser les fonctionnalités d'IA, ni être ciblé par elles**.\n\n" +
            "Vous pourrez retirer votre consentement à tout moment avec cette même commande. Refuser n'impactera pas les autres fonctions du bot.",
        ),
      )
      .addActionRowComponents((actionRow) =>
        actionRow
          .addComponents(
            new ButtonBuilder()
              .setCustomId(
                legalManager.buildConsentButtonId('generative-ai', 'accept'),
              )
              .setLabel("J'accepte et je débloque les fonctionnalités d'IA")
              .setStyle(ButtonStyle.Success),
          )
          .addComponents(
            new ButtonBuilder()
              .setCustomId(
                legalManager.buildConsentButtonId('generative-ai', 'decline'),
              )
              .setLabel('Je refuse')
              .setStyle(ButtonStyle.Danger),
          ),
      );
  },
  buildConfirmation: (accepted: boolean) => {
    return new ContainerBuilder()
      .setAccentColor(accepted ? 0x57f287 : 0xed4245)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          accepted
            ? '# ✅ Consentement enregistré\n\n' +
                "Merci ! Vous avez accepté l'utilisation des fonctionnalités d'IA générative.\n\n" +
                "Vous pouvez maintenant profiter de toutes les fonctionnalités d'Isabelle, y compris celles utilisant l'IA générative.\n\n" +
                '_Vous pouvez modifier ce choix à tout moment en utilisant à nouveau la commande `/légal consentir ia-générative`._'
            : '# ❌ Refus enregistré\n\n' +
                "Votre refus a été enregistré. Vous ne pourrez pas utiliser les fonctionnalités d'IA générative.\n\n" +
                "Toutes les autres fonctionnalités d'Isabelle restent disponibles pour vous.\n\n" +
                "_Vous pouvez changer d'avis à tout moment en utilisant la commande `/légal consentir ia-générative`._",
        ),
      );
  },
});
