export interface RankStyle {
  rowBg: string;
  rowBorder: string;
  rowHeight: number;
  rankColor: string;
  rankSize: number;
  avatarSize: number;
  avatarBorder: string;
  nameSize: number;
}

const BASE_STYLE: RankStyle = {
  rowBg: '#1a1d21',
  rowBorder: 'none',
  rowHeight: 72,
  rankColor: '#6b7280',
  rankSize: 20,
  avatarSize: 48,
  avatarBorder: '2px solid #333',
  nameSize: 16,
};

const RANK_STYLES: Record<number, RankStyle> = {
  1: {
    rowBg: 'rgba(255, 215, 0, 0.1)',
    rowBorder: '1px solid rgba(255, 215, 0, 0.25)',
    rowHeight: 96,
    rankColor: 'rgba(255, 215, 0, 1)',
    rankSize: 24,
    avatarSize: 64,
    avatarBorder: '3px solid rgba(255, 215, 0, 1)',
    nameSize: 20,
  },
  2: {
    rowBg: 'rgba(220, 220, 220, 0.1)',
    rowBorder: '1px solid rgba(240, 240, 240, 0.25)',
    rowHeight: 88,
    rankColor: 'rgba(240, 240, 240, 1)',
    rankSize: 22,
    avatarSize: 56,
    avatarBorder: '3px solid rgba(192, 192, 192, 1)',
    nameSize: 18,
  },
  3: {
    rowBg: 'rgba(217, 131, 46, 0.1)',
    rowBorder: '1px solid rgba(241, 143, 46, 0.25)',
    rowHeight: 80,
    rankColor: 'rgba(241, 143, 46, 1)',
    rankSize: 22,
    avatarSize: 52,
    avatarBorder: '3px solid rgba(241, 143, 46, 1)',
    nameSize: 17,
  },
};

export function getRankStyle(rank: number): RankStyle {
  if (rank in RANK_STYLES) {
    return RANK_STYLES[rank];
  }

  const isEven = rank % 2 === 0;
  return {
    ...BASE_STYLE,
    rowBg: isEven ? '#15171b' : BASE_STYLE.rowBg,
  };
}
