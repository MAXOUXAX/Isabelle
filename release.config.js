import { DEFAULT_COMMIT_TYPES } from 'conventional-changelog-conventionalcommits';

const types = DEFAULT_COMMIT_TYPES.map((t) => {
  if (t.type === 'chore') {
    return { ...t, hidden: false, section: 'Chores' };
  }
  return t;
});

export default {
  branches: ['main'],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [{ type: 'chore', release: 'patch' }],
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types,
        },
      },
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'package-lock.json'],
        message:
          'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
    [
      '@semantic-release/github',
      {
        successComment:
          ":tada: This ${issue.pull_request ? 'PR' : 'issue'} was just released in version ${nextRelease.version}!\nCheck out the [GitHub release here!](<github_release_url>)",
      },
    ],
    [
      '@semantic-release/exec',
      {
        successCmd:
          'tmp=$(mktemp)\ntrap \'rm -f "$tmp"\' EXIT\ncat <<\'EOF\' > "$tmp"\n${nextRelease.notes}\nEOF\nNEXT_RELEASE_VERSION=${nextRelease.version} NEXT_RELEASE_NOTES_FILE="$tmp" GITHUB_REPOSITORY=${process.env.GITHUB_REPOSITORY} npx tsx ./bin/send-discord-notification.ts',
      },
    ],
  ],
};
