async function sendDiscordNotification() {
  const version = process.env.NEXT_RELEASE_VERSION;
  const notes = process.env.NEXT_RELEASE_NOTES;
  const githubRepo = process.env.GITHUB_REPOSITORY;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!version) {
    console.error(
      "Erreur : La variable d'environnement NEXT_RELEASE_VERSION n'est pas définie.",
    );
    return;
  }

  if (!notes) {
    console.error(
      "Erreur : La variable d'environnement NEXT_RELEASE_NOTES n'est pas définie.",
    );
    return;
  }

  if (!githubRepo) {
    console.error(
      "Erreur : La variable d'environnement GITHUB_REPOSITORY n'est pas définie.",
    );
    return;
  }

  if (!webhookUrl) {
    console.error(
      "Erreur : La variable d'environnement DISCORD_WEBHOOK_URL n'est pas définie.",
    );
    return;
  }

  if (!notes || notes.trim() === '') {
    console.log('Aucune note de version à envoyer. Notification annulée.');
    return;
  }

  // Construction du message en français avec un "embed" pour une belle mise en forme
  const payload = {
    content: `# 🚀 Une nouvelle version de \`${githubRepo}\` vient d'être publiée !`,
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
