/* eslint-disable @typescript-eslint/no-non-null-assertion */
async function sendDiscordNotification() {
  const requiredEnvVars = {
    NEXT_RELEASE_VERSION: process.env.NEXT_RELEASE_VERSION,
    NEXT_RELEASE_NOTES: process.env.NEXT_RELEASE_NOTES,
    GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
    DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
  } as const;

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      console.error(
        `Erreur : La variable d'environnement ${key} n'est pas définie.`,
      );
      return;
    }
  }

  const version = requiredEnvVars.NEXT_RELEASE_VERSION!;
  const notes = requiredEnvVars.NEXT_RELEASE_NOTES!;
  const githubRepo = requiredEnvVars.GITHUB_REPOSITORY!;
  const webhookUrl = requiredEnvVars.DISCORD_WEBHOOK_URL!;

  if (!notes || notes.trim() === '') {
    console.log('Aucune note de version à envoyer. Notification annulée.');
    return;
  }

  const payload = {
    content: `# 🚀 Une nouvelle version d'Isabelle vient d'être publiée !`,
    embeds: [
      {
        title: `🎉 Version ${version}`,
        url: `https://github.com/${githubRepo}/releases/tag/v${version}`,
        description: `Voici les changements inclus dans cette nouvelle mise à jour :\n${notes}`,
        color: 5814783,
        footer: {
          text: `Notes de version pour Isabelle v${version}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const data = JSON.stringify(payload);
  const url = new URL(webhookUrl);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data,
  });

  if (!res.ok) {
    console.error(
      "Erreur lors de l'envoi de la notification Discord :",
      res.statusText,
    );
  } else {
    console.log('Notification Discord envoyée avec succès !');
  }
}

void sendDiscordNotification();
