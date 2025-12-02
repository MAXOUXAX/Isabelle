import { commandManager } from '@/manager/commands/command.manager.js';
import { interactionManager } from '@/manager/interaction.manager.js';
import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { countSubcommands } from '@/utils/commands.js';
import { createLogger } from '@/utils/logger.js';
import { type RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';

const logger = createLogger('module-manager');

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

const SLOW_MODULE_LOAD_TIME_TRESHOLD = 1000;

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

  private checkModuleHealth(module: IsabelleModule): boolean {
    return module.commands.length > 0 || module.interactionHandlers.length > 0;
  }

  async initializeModules(): Promise<void> {
    logger.info(
      `Initializing ${String(this.moduleLoadResults.size)} modules...`,
    );

    const startOverallTime = performance.now();

    for (const module of this.moduleLoadResults.keys()) {
      logger.info(`Initializing module ${module.name}...`);

      const startTime = performance.now();

      try {
        module.init();
        await commandManager.registerCommandsFromModule(module);
        interactionManager.registerInteractionHandlers(
          module.interactionHandlers,
        );

        const endTime = performance.now();
        const loadTime = endTime - startTime;

        if (!this.checkModuleHealth(module)) {
          logger.warn(
            `The module ${module.name} has registered no commands or interaction handlers. Is this intended?`,
          );
        }

        if (loadTime > SLOW_MODULE_LOAD_TIME_TRESHOLD) {
          logger.warn(
            `Module ${module.name} took ${loadTime.toFixed(2)}ms to initialize!`,
          );
        } else {
          logger.info(
            `Module ${module.name} initialized in ${loadTime.toFixed(2)}ms`,
          );
        }

        this.moduleLoadResults.set(module, {
          status: 'loaded',
          loadTimeMs: loadTime,
        });
      } catch (error) {
        const endTime = performance.now();
        const loadTime = endTime - startTime;

        this.moduleLoadResults.set(module, {
          status: 'failed',
          loadTimeMs: loadTime,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        });
        // Log a warning and continue initializing other modules
        logger.warn(
          { error, moduleName: module.name },
          `Failed to initialize module "${module.name}"`,
        );
      }
    }

    const endOverallTime = performance.now();
    const overallLoadTime = endOverallTime - startOverallTime;
    const meanLoadTime = overallLoadTime / (this.moduleLoadResults.size || 1);

    let loadedCount = 0;
    let failedCount = 0;
    for (const result of this.moduleLoadResults.values()) {
      if (result?.status === 'loaded') loadedCount++;
      else if (result?.status === 'failed') failedCount++;
    }

    logger.info(
      `Module initialization complete in ${overallLoadTime.toFixed(2)}ms (mean: ${meanLoadTime.toFixed(2)}ms per module, loaded: ${String(loadedCount)}, failed: ${String(failedCount)})`,
    );
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

  private buildModuleData(module: IsabelleModule): ModuleData {
    const loadResult = this.moduleLoadResults.get(module);

    return {
      name: module.name,
      slug: this.generateSlug(module.name),
      status: loadResult?.status ?? 'failed',
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
      const subcommandCount = countSubcommands(json.options);
      count += subcommandCount > 0 ? subcommandCount : 1;
    }
    return count;
  }
}

export const moduleManager = new ModuleManager();
