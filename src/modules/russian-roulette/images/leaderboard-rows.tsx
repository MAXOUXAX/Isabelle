import {
  LEADERBOARD_COLUMNS,
  LEADERBOARD_COLUMN_WIDTH,
  type LeaderboardEntry,
} from './leaderboard-data.js';
import { getRankStyle } from './leaderboard-theme.js';

const RANK_COLUMN_WIDTH = 60;
const AVATAR_MARGIN = 16;
const NAME_MARGIN = 16;
const ROW_PADDING = 16;

const placeholderStyles = {
  avatar: {
    display: 'flex',
    width: 48,
    height: 48,
    borderRadius: '50%',
    marginRight: AVATAR_MARGIN,
    background: '#374151',
    flexShrink: 0,
  },
  line: {
    display: 'flex',
    height: 20,
    width: 144,
    borderRadius: 4,
    background: '#374151',
  },
} as const;

function StatsColumns({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: LEADERBOARD_COLUMN_WIDTH * LEADERBOARD_COLUMNS.length,
        height: '100%',
      }}
    >
      {LEADERBOARD_COLUMNS.map((column, index) => (
        <div
          key={column.key}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: LEADERBOARD_COLUMN_WIDTH,
            height: '100%',
            fontWeight: 800,
            fontSize: 20,
            color: column.color,
            borderLeft: index > 0 ? '1px solid rgba(75, 85, 99, 0.5)' : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {column.format(entry)}
        </div>
      ))}
    </div>
  );
}

export function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const rankStyle = getRankStyle(entry.rank);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: rankStyle.rowHeight,
        marginBottom: 8,
        borderRadius: 12,
        padding: `0 ${ROW_PADDING.toString()}px`,
        background: rankStyle.rowBg,
        border: rankStyle.rowBorder,
      }}
    >
      <div
        style={{
          width: RANK_COLUMN_WIDTH,
          display: 'flex',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: rankStyle.rankSize,
          color: rankStyle.rankColor,
          flexShrink: 0,
        }}
      >
        #{entry.rank}
      </div>
      {entry.avatarUrl ? (
        <img
          src={entry.avatarUrl}
          width={rankStyle.avatarSize}
          height={rankStyle.avatarSize}
          style={{
            borderRadius: '50%',
            marginRight: AVATAR_MARGIN,
            border: rankStyle.avatarBorder,
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            width: rankStyle.avatarSize,
            height: rankStyle.avatarSize,
            borderRadius: '50%',
            marginRight: AVATAR_MARGIN,
            background: '#4b5563',
            border: rankStyle.avatarBorder,
            flexShrink: 0,
          }}
        />
      )}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          fontWeight: 700,
          fontSize: rankStyle.nameSize,
          color: '#ffffff',
          marginRight: NAME_MARGIN,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {entry.displayName}
      </div>
      <StatsColumns entry={entry} />
    </div>
  );
}

export function PlaceholderRow({ rank }: { rank: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: 72,
        marginBottom: 8,
        borderRadius: 12,
        padding: `0 ${ROW_PADDING.toString()}px`,
        border: '2px dashed #374151',
        opacity: 0.5,
      }}
    >
      <div
        style={{
          width: RANK_COLUMN_WIDTH,
          display: 'flex',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 20,
          color: '#6b7280',
          flexShrink: 0,
        }}
      >
        #{rank}
      </div>
      <div style={placeholderStyles.avatar} />
      <div style={placeholderStyles.line} />
    </div>
  );
}
