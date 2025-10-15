import { legalManager } from '@/modules/legal/legal.manager.js';
import {
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
            "Pour accéder aux commandes spéciales (roasts, génération d'images, etc.) et pour que les autres puissent les utiliser sur vous, votre autorisation est nécessaire.",
        ),
      )
      .addSeparatorComponents((separator) =>
        separator.setSpacing(SeparatorSpacingSize.Large).setDivider(true),
      )
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          '## 🧐 Comment ça marche ?\n\n' +
            '**1. Quelles données sont utilisées ?**\n' +
            "Pour fonctionner, l'IA analysera le contenu de vos messages ou les images que vous postez, **uniquement quand une commande est utilisée**.\n\n" +
            '**2. Où vont vos données ?**\n' +
            'Le contenu est envoyé à des services tiers (comme Google Gemini) pour générer une réponse. **Isabelle ne stocke JAMAIS vos messages** : tout est traité à la volée puis immédiatement oublié.\n\n' +
            '**3. Conditions des services tiers**\n' +
            "En acceptant, vous reconnaissez que les conditions d'utilisation de ces services externes s'appliquent lors du traitement.",
        ),
      )
      .addSeparatorComponents((separator) =>
        separator.setSpacing(SeparatorSpacingSize.Large).setDivider(true),
      )
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              '## 🔑 Votre consentement est la clé\n\n' +
                "Sans votre accord, vous ne pourrez **ni utiliser les fonctionnalités d'IA, ni être ciblé par elles**.",
            ),
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId(
                legalManager.buildConsentButtonId('generative-ai', 'accept'),
              )
              .setLabel("J'accepte et je débloque les fonctionnalités")
              .setStyle(ButtonStyle.Success),
          ),
      )
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              "Vous pourrez retirer votre consentement à tout moment avec cette même commande. Refuser n'impactera pas les autres fonctions du bot.",
            ),
          )
          .setButtonAccessory((button) =>
            button
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
