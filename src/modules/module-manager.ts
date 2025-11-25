import { commandManager } from '@/manager/commands/command.manager.js';
import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import {
  ApplicationCommandOptionType,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

/**
 * Result of a module initialization attempt.
 */
export interface ModuleLoadResult {
  status: 'loaded' | 'failed';
  loadTimeMs: number;
  errorMessage?: string;
}

/**
 * Complete module data for presentation purposes.
 * Extends ModuleLoadResult to avoid field duplication.
 */
export interface ModuleData extends ModuleLoadResult {
  name: string;
  slug: string;
  commandCount: number;
  commandEntryCount: number;
  interactionCount: number;
  commands: RESTPostAPIChatInputApplicationCommandsJSONBody[];
  contributors: ModuleContributor[];
}

/**
 * Manages the registration and initialization of Isabelle modules.
 *
 * Uses a single Map to track both registered modules and their load results,
 * where `null` indicates a module is registered but not yet initialized.
 *
 * @example
 * ```typescript
 * const manager = new ModuleManager();
 * manager.registerModule(myModule);
 * manager.initializeModules();
 * ```
 */
export class ModuleManager {
  private moduleLoadResults = new Map<
    IsabelleModule,
    ModuleLoadResult | null
  >();

  get modules(): IsabelleModule[] {
    return Array.from(this.moduleLoadResults.keys());
  }

  registerModule(module: IsabelleModule): void {
    this.moduleLoadResults.set(module, null);
  }

  registerModules(modules: IsabelleModule[]): void {
    for (const module of modules) {
      this.registerModule(module);
    }
  }

  initializeModules(): void {
    for (const module of this.moduleLoadResults.keys()) {
      const startTime = performance.now();
      try {
        module.init();
        commandManager.registerCommandsFromModule(module);
        this.moduleLoadResults.set(module, {
          status: 'loaded',
          loadTimeMs: performance.now() - startTime,
        });
      } catch (error) {
        this.moduleLoadResults.set(module, {
          status: 'failed',
          loadTimeMs: performance.now() - startTime,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    }
  }

  getModuleDescriptors(): { slug: string; name: string }[] {
    return this.modules.map((module) => ({
      slug: this.generateSlug(module.name),
      name: module.name,
    }));
  }

  getModuleData(): ModuleData[] {
    return this.modules.map((module) => this.buildModuleData(module));
  }

  getModuleDataBySlug(slug: string): ModuleData | null {
    const module = this.modules.find((m) => this.generateSlug(m.name) === slug);
    return module ? this.buildModuleData(module) : null;
  }

  private buildModuleData(module: IsabelleModule): ModuleData {
    const loadResult = this.moduleLoadResults.get(module);

    return {
      name: module.name,
      slug: this.generateSlug(module.name),
      status: loadResult?.status ?? 'loaded',
      loadTimeMs: loadResult?.loadTimeMs ?? 0,
      errorMessage: loadResult?.errorMessage,
      commandCount: module.commands.length,
      commandEntryCount: this.countCommandEntries(module),
      interactionCount: module.interactionHandlers.length,
      commands: module.commands.map((cmd) => cmd.commandData.toJSON()),
      contributors: module.contributors,
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private countCommandEntries(module: IsabelleModule): number {
    let count = 0;
    for (const command of module.commands) {
      const json = command.commandData.toJSON();
      const subcommandCount = this.countSubcommands(json.options);
      count += subcommandCount > 0 ? subcommandCount : 1;
    }
    return count;
  }

  private countSubcommands(
    options: RESTPostAPIChatInputApplicationCommandsJSONBody['options'],
  ): number {
    if (!options) return 0;

    let count = 0;
    for (const option of options) {
      if (option.type === ApplicationCommandOptionType.Subcommand) {
        count++;
      } else if (
        option.type === ApplicationCommandOptionType.SubcommandGroup &&
        'options' in option
      ) {
        count += this.countSubcommands(
          option.options as RESTPostAPIChatInputApplicationCommandsJSONBody['options'],
        );
      }
    }
    return count;
  }
}

export const moduleManager = new ModuleManager();
