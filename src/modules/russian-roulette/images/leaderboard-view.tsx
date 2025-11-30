import {
  LEADERBOARD_COLUMNS,
  LEADERBOARD_COLUMN_WIDTH,
  LEADERBOARD_ROWS_COUNT,
  type LeaderboardEntry,
} from './leaderboard-data.js';
import { LeaderboardRow, PlaceholderRow } from './leaderboard-rows.js';

const RANK_COLUMN_WIDTH = 60;
const AVATAR_COLUMN_WIDTH = 48;
const AVATAR_MARGIN = 16;
const ROW_PADDING = 16;
const NAME_MARGIN = 16;

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: 1000,
    background: 'linear-gradient(180deg, #1a1c20 0%, #0f1012 100%)',
    padding: 32,
    paddingBottom: 40,
    borderRadius: 24,
    fontFamily: 'Outfit',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 32,
    fontWeight: 900,
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 8,
  },
  columnBar: {
    display: 'flex',
    alignItems: 'stretch',
    background: 'rgba(55, 65, 81, 0.3)',
    borderRadius: 12,
    marginBottom: 12,
    padding: `8px ${ROW_PADDING.toString()}px`,
    height: 56,
  },
  rows: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
} as const;

interface ColumnHeaderProps {
  column: (typeof LEADERBOARD_COLUMNS)[0];
  isFirst: boolean;
}

function ColumnHeader({ column, isFirst }: ColumnHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: LEADERBOARD_COLUMN_WIDTH,
        borderLeft: isFirst ? 'none' : '1px solid rgba(75, 85, 99, 0.5)',
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: column.color,
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {column.label}
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'rgba(156, 163, 175, 0.8)',
          marginTop: 2,
        }}
      >
        {column.sublabel}
      </div>
    </div>
  );
}

export function LeaderboardView({ entries }: { entries: LeaderboardEntry[] }) {
  const placeholderCount = Math.max(0, LEADERBOARD_ROWS_COUNT - entries.length);
  const placeholders = Array.from(
    { length: placeholderCount },
    (_, index) => entries.length + index + 1,
  );

  return (
    <div style={styles.container}>
      <header
        style={{ display: 'flex', flexDirection: 'column', marginBottom: 16 }}
      >
        <div style={styles.headerTitle}>Classement de la roulette russe</div>
        <div style={styles.headerSubtitle}>
          Top 10 des victimes par durée d'exclusion
        </div>
      </header>
      <section style={styles.columnBar}>
        <div style={{ width: RANK_COLUMN_WIDTH }} />
        <div
          style={{ width: AVATAR_COLUMN_WIDTH, marginRight: AVATAR_MARGIN }}
        />
        <div style={{ flex: 1, marginRight: NAME_MARGIN }} />
        <div
          style={{
            display: 'flex',
            width: LEADERBOARD_COLUMN_WIDTH * LEADERBOARD_COLUMNS.length,
          }}
        >
          {LEADERBOARD_COLUMNS.map((column, index) => (
            <ColumnHeader
              key={`header-${column.key}`}
              column={column}
              isFirst={index === 0}
            />
          ))}
        </div>
      </section>
      <div style={styles.rows}>
        {entries.map((entry) => (
          <LeaderboardRow key={entry.userId} entry={entry} />
        ))}
        {placeholders.map((rank) => (
          <PlaceholderRow key={`placeholder-${rank.toString()}`} rank={rank} />
        ))}
      </div>
    </div>
  );
}
