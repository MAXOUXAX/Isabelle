# Isabelle Discord Bot

Isabelle is a TypeScript Discord bot designed for TELECOM Nancy apprentice students. The bot provides both useful modules (schedule integration, event planning) and entertaining modules (SUTOM word game, Russian Roulette, Hot Potato, automatic responses) to enhance the Discord community experience.

## Core Development Principles

### End-User Experience First
- Prioritize UX in all features - consider how students will actually interact with the bot
- Use visual feedback when beneficial (e.g., image generation for game states, clear embed formatting)
- Provide helpful error messages and guidance to users
- Design features to be intuitive without requiring explanation

### Code Quality Standards
- Write TypeScript with strict type checking enabled
- Use ESLint and Prettier for consistent code style
- Handle errors gracefully - never let the bot crash from user actions
- Use proper async/await patterns for Discord interactions

## Architecture Patterns

### Module-Based Design
All bot functionality is organized into modules that extend `IsabelleModule`. Each module encapsulates related commands and interactions.

### Creating a New Command
```typescript
import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { IsabelleCommand } from '@/manager/commands/command.interface.js';

export class MyCommand implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('mycommand')
    .setDescription('Brief description of what this command does');

  public async executeCommand(interaction: CommandInteraction): Promise<void> {
    // Always acknowledge the interaction quickly
    await interaction.reply('Response message');
    
    // For longer operations, use deferReply() first
    // await interaction.deferReply();
    // await longRunningOperation();
    // await interaction.editReply('Final result');
  }
}
```

### Creating a New Module
```typescript
import { IsabelleModule } from '@/modules/bot-module.js';
import { MyCommand } from './commands/my-command.js';

export class MyModule extends IsabelleModule {
  readonly name = 'my-module';

  init(): void {
    // Register all commands for this module
    this.registerCommands([new MyCommand()]);
    
    // Register interaction handlers if needed
    // this.registerInteractionHandlers([new MyModalHandler()]);
  }
}
```

Then add your module to the `MODULES` array in `src/index.ts`.

### Database Integration
Use Drizzle ORM for database operations:

```typescript
import { db } from '@/db/index.js';
import { myTable } from '@/db/schema.js';

// Always handle database errors gracefully
try {
  const result = await db.select().from(myTable).where(eq(myTable.id, userId));
  return result[0];
} catch (error) {
  console.error('Database operation failed:', error);
  return null;
}
```

### Resource Management
Store static resources in `public/resources/` and access them via the resource utility:

```typescript
import { resolveResourcePath } from '@/utils/resources.js';

// Resolve path to resource file
const wordListPath = resolveResourcePath('sutom', 'mots.filtered.txt');
```

## Discord Integration Best Practices

### Interaction Handling
- Always respond to interactions within 3 seconds
- Use `deferReply()` for operations that might take longer
- Provide meaningful error messages to users
- Use embeds for rich formatting when appropriate

### Command Design
- Keep command names short and memorable
- Use subcommands for related functionality
- Provide clear descriptions and parameter hints
- Consider both success and error scenarios

### Modal and Button Interactions
For complex user input, use modals:

```typescript
const modal = new ModalBuilder()
  .setCustomId('my-modal')
  .setTitle('User Input Form');

const textInput = new TextInputBuilder()
  .setCustomId('text-field')
  .setLabel('Enter your text')
  .setStyle(TextInputStyle.Short)
  .setPlaceholder('Type here...')
  .setRequired(true);

modal.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(textInput));
await interaction.showModal(modal);
```

## Development Workflow

### Setup and Building
```bash
npm install
npm run build  # Verify TypeScript compilation
npm run prettier  # Format code
```

### Testing Changes
- Use `npm run dev` for development with file watching
- Test with a Discord server in development mode (single server only)
- Verify error handling by testing edge cases

### Code Style
- Use single quotes for strings
- Include trailing commas in multi-line structures  
- Use 2-space indentation
- Add semicolons consistently

## Common Patterns

### Error Handling
```typescript
try {
  await riskyOperation();
} catch (error) {
  console.error('Operation failed:', error);
  await interaction.reply({ 
    content: 'Sorry, something went wrong. Please try again later.',
    ephemeral: true 
  });
}
```

### User Feedback
```typescript
// For success
await interaction.reply({
  embeds: [new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle('Success')
    .setDescription('Operation completed successfully')]
});

// For errors  
await interaction.reply({
  content: 'Unable to complete that action. Please check your input and try again.',
  ephemeral: true
});
```

### Configuration Management
Access environment variables through the config module:
```typescript
import { config } from '@/config.js';

// config.DISCORD_TOKEN, config.DISCORD_CLIENT_ID, etc.
```

## UX Considerations

### Visual Design
- Use consistent embed colors across the bot
- Include relevant emojis to make responses more engaging
- Consider image generation for visual feedback (games, charts, etc.)
- Use formatting (bold, italics, code blocks) appropriately

### User Guidance
- Provide help commands or information when users are confused
- Use ephemeral replies for error messages to avoid channel clutter
- Give clear next steps when an action requires follow-up

### Performance
- Respond quickly to user interactions
- Use caching for frequently accessed data
- Optimize image generation and file operations

Remember: Build features that TELECOM Nancy apprentice students will actually find useful and enjoyable. Focus on creating a positive community experience through thoughtful design and reliable functionality.