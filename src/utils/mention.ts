import { GuildMember, User } from 'discord.js';

export function mentionId(userId: string) {
  return `<@${userId}>`;
}

export function mention(user: User | GuildMember) {
  return mentionId(user.id);
}
