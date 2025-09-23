# Isabelle Discord Bot

Isabelle is a TypeScript Discord bot designed for TELECOM Nancy students. It features various game modules (SUTOM word game, Russian Roulette, Hot Potato), automatic responses, event planning, and schedule integration.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Initial Setup
- Bootstrap, build, and test the repository:
  - `npm install` -- takes 15-40 seconds depending on network. Requires Node.js >=22 but works on Node.js 20 with warnings.
  - `npm run build` -- takes <1 second using tsup (builds to dist/index.mjs)
  - `npm run lint` -- takes ~5 seconds using ESLint with TypeScript strict config
  - `npm run prettier` -- takes <1 second for code formatting
  - `npm run db:migrate` -- takes <1 second to apply database migrations using Drizzle ORM

### Environment Setup
- Copy `.env.example` to `.env` and configure required variables:
  - `DISCORD_TOKEN` - Get from Discord Developer Portal
  - `DISCORD_CLIENT_ID` - Application ID from Discord Developer Portal
  - `DB_FILE_NAME` - Database file path (e.g., `file:local.db`)
  - `SCHEDULE_URL` - URL to .ics calendar file for schedule module
- Database migrations are applied automatically via `npm run dev`

### Development Mode
- Run development server: `npm run dev` -- runs database migrations then starts dev server with file watching
- Alternative: `npm run start:dev` -- starts dev server only (assumes DB is migrated)
- Development mode requires `NODE_ENV=development` environment variable
- Bot will only work with a single Discord server in development mode

### Production Mode
- Build: `npm run build` -- creates dist/index.mjs
- Run: `node dist/index.mjs` -- runs in production mode (deploys global Discord commands)
- Production mode runs when `NODE_ENV` is undefined or not set to "development"

## Validation

### Build and Test Validation
- ALWAYS run `npm run build` to verify TypeScript compilation
- Run `npm run prettier` to format code consistently
- No unit tests exist in this repository
- WARNING: `npm run lint` has pre-existing errors in hot-potato module and eslint config deprecation - these are not your responsibility to fix unless working on those specific files

### Manual Application Testing
- The bot cannot be fully tested without valid Discord credentials
- With valid credentials, test the Discord slash commands:
  - `/ping` - Basic connectivity test
  - `/bonjour` - Simple greeting command
  - `/sutom start` - Start SUTOM word game
  - `/roulette-russe` - Russian roulette game
  - `/planifier` - Event planning modal
- Application startup should show "Isabelle is ready to serve! 🚀" message

### Code Quality Checks
- Husky pre-commit hooks run lint-staged (ESLint + Prettier) automatically
- ESLint configuration is strict TypeScript with recommended rules but has pre-existing errors
- Prettier enforces single quotes, trailing commas, 2-space tabs, semicolons
- Focus on fixing lint errors only for code you modify, not pre-existing issues

## Build System and Timing

### Command Timing Expectations (measured on standard CI environment)
- `npm install`: 15-40 seconds (network dependent, requires Node.js >=22 but works on 20 with warnings)
- `npm run build`: <1 second (tsup is extremely fast)
- `npm run lint`: ~5-6 seconds (but has pre-existing errors - ignore unless working on affected files)
- `npm run prettier`: <1 second
- `npm run db:migrate`: <1 second
- `npm run dev`: <2 seconds to start (includes migration + attempts Discord connection)

### Build Artifacts
- TypeScript compiled to `dist/index.mjs` (ESM module)
- Source maps generated as `dist/index.mjs.map`
- Resources copied to `dist/resources/` from `public/resources/`

## Common Tasks

### Repository Structure
```
src/
├── config.ts          # Environment configuration
├── db/                # Drizzle ORM database setup
├── index.ts           # Main application entry point
├── manager/           # Command, interaction, and config managers
├── modules/           # Discord bot modules (games, utilities)
└── utils/             # Shared utilities (cache, dates, mentions, etc.)

public/resources/      # Static resources (word lists, etc.)
drizzle/              # Database migration files
.github/workflows/    # CI/CD pipelines
```

### Key Modules
- `CoreModule`: Basic commands (ping, bonjour)
- `SutomModule`: French word guessing game with canvas rendering
- `RussianRouletteModule`: Timeout-based roulette game
- `PlanifierModule`: Event planning with Discord forum integration
- `AutomaticResponsesModule`: Configurable auto-responses
- `ScheduleModule`: Calendar integration via .ics files
- `HotPotato`: Role-passing game

### Database Operations
- Uses Drizzle ORM with SQLite via libSQL
- Schema defined in `src/db/schema.ts`
- Migrations in `drizzle/` directory
- Two main tables: `automatic_responses`, `guild_configs`

### Discord Integration Details
- Uses discord.js v14 with slash commands
- Supports both guild-specific (development) and global (production) command deployment
- Module-based architecture for organizing commands and interactions
- Canvas-based image generation for games using @napi-rs/canvas

### Development Tips
- Bot requires Discord server invite with appropriate permissions
- Development mode limits bot to single server to prevent accidental deployments
- Production global command deployment can take up to 1 hour to propagate
- TypeScript paths configured: `@/*` maps to `src/*`, `@modules/*` maps to `src/modules/*`

### Common File Locations
- Main entry: `src/index.ts`
- Command interfaces: `src/manager/commands/command.interface.ts`
- Module base class: `src/modules/bot-module.ts`
- Resource utilities: `src/utils/resources.ts`
- Database connection: `src/db/index.ts`

Remember: This is a Discord bot requiring external API credentials. Most functionality cannot be tested without proper Discord server setup and bot permissions.