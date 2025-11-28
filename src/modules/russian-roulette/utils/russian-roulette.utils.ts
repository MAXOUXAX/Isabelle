import {
  PERCENTAGES,
  TIMEOUT_OPTIONS,
} from '@/modules/russian-roulette/russian-roulette.config.js';
import { createLogger } from '@/utils/logger.js';
import { Guild } from 'discord.js';

const logger = createLogger('russian-roulette-utils');

let numberOfGamesSinceLastKill = 0;

export function getNumberOfGamesSinceLastKill(): number {
  return numberOfGamesSinceLastKill;
}

export function increaseGamesSinceLastKill(): void {
  numberOfGamesSinceLastKill++;
}

export function resetNumberOfGamesSinceLastKill(): void {
  numberOfGamesSinceLastKill = 0;
}

/**
 * Selects a random timeout duration based on weighted probabilities
 */
export function getRandomTimeoutDuration(): {
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

/**
 * Determines who (if anyone) is hit by the roulette.
 * Returns null when nobody is hit.
 */
export function getGunTarget(userID: string, guild: Guild) {
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

// Increases the chance that someone will be killed; the longer the streak of commands without a kill, the higher the chance becomes.
export function increasePercentageWithLog(
  maxPercentage: number,
  base: number,
): number {
  return Math.min(
    maxPercentage,
    base + mapNumber(Math.log(numberOfGamesSinceLastKill + 1), 0, 4, 0, 1),
  );
}

/**
 * Maps a number from one range to another.
 * Example: number: 5, in_min: 0, in_max: 10, out_min: 10, out_max: 20, returns: 15
 */
export function mapNumber(
  number: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
) {
  return ((number - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}
