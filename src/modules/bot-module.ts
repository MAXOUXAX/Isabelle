import { Interaction } from 'discord.js';
import { IsabelleCommand } from '../manager/commands/command.interface.js';

export interface ModuleContributor {
  displayName: string;
  githubUsername: string;
}

export abstract class IsabelleModule {
  commands: IsabelleCommand[] = [];
  interactionHandlers: InteractionHandler[] = [];

  abstract init(): void;

  /**
   * List of contributors to this module.
   *
   * Each contributor should include their display name and GitHub username.
   * This information may be used by the bot to display module credits,
   * acknowledge contributors in help or info commands, or for other attribution purposes.
   *
   * Example:
   * [
   *   { displayName: "Alice Smith", githubUsername: "alice-smith" },
   *   { displayName: "Bob Jones", githubUsername: "bob-jones" }
   * ]
   */
  abstract get contributors(): ModuleContributor[];

  registerCommands(commands: IsabelleCommand[]): void {
    for (const command of commands) {
      this.registerCommand(command);
    }
  }

  registerCommand(command: IsabelleCommand): void {
    this.commands.push(command);
  }

  registerInteractionHandlers(interactionHandlers: InteractionHandler[]): void {
    for (const handler of interactionHandlers) {
      this.registerInteractionHandler(handler);
    }
  }

  registerInteractionHandler(handler: InteractionHandler): void {
    this.interactionHandlers.push(handler);
  }

  abstract get name(): string;
}

export interface InteractionHandler {
  customId: string;
  handle(interaction: Interaction): Promise<void>;
}
