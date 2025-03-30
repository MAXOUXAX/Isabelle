import { Interaction } from 'discord.js';
import { IsabelleCommand } from '../manager/commands/command.interface.js';
export abstract class IsabelleModule {
  commands: IsabelleCommand[] = [];
  interactionHandlers: InteractionHandler[] = [];

  abstract init(): void;

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
