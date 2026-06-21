import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';

/**
 * Permission required to manage other members' birthdays (setting them for
 * someone else, removing them) and to configure the module.
 */
export const BIRTHDAY_ADMIN_PERMISSION = PermissionFlagsBits.ManageGuild;

export function isBirthdayAdmin(
  interaction: ChatInputCommandInteraction,
): boolean {
  return interaction.memberPermissions?.has(BIRTHDAY_ADMIN_PERMISSION) ?? false;
}
