# Module Anniversaires

Ce module permet aux utilisateurs de gérer les anniversaires des membres du serveur Discord et d'envoyer automatiquement des messages de félicitations le jour J.

## Fonctionnalités

### Commandes disponibles

#### `/anniversaire set`
Permet à un utilisateur d'enregistrer son propre anniversaire.

**Paramètres :**
- `jour` (requis) : Jour de naissance (1-31)
- `mois` (requis) : Mois de naissance (1-12)
- `annee` (optionnel) : Année de naissance (pour afficher l'âge)

**Exemple :**
```
/anniversaire set jour:15 mois:3 annee:2000
```

#### `/anniversaire list`
Affiche la liste des prochains anniversaires du serveur, triés par ordre chronologique.

**Exemple :**
```
/anniversaire list
```

La commande affiche :
- Le nom de l'utilisateur
- La date de l'anniversaire
- L'âge (si l'année a été fournie)
- Le nombre de jours restants

#### `/anniversaire voir`
Permet de consulter l'anniversaire d'un utilisateur spécifique.

**Paramètres :**
- `utilisateur` (requis) : L'utilisateur dont on veut voir l'anniversaire

**Exemple :**
```
/anniversaire voir utilisateur:@JohnDoe
```

### Messages automatiques

Le bot vérifie automatiquement chaque jour à minuit s'il y a des anniversaires et envoie un message de félicitations dans un salon approprié du serveur.

Les messages sont envoyés dans l'ordre de priorité suivant :
1. Un salon contenant "général" ou "general"
2. Un salon contenant "annonces" ou "announcements"
3. Un salon contenant "bot" ou "bots"
4. Le premier salon textuel disponible

**Exemples de messages :**
- 🎂 C'est l'anniversaire de @User aujourd'hui ! Joyeux anniversaire ! 🎉
- 🎉 Bon anniversaire à @User ! Que cette journée soit remplie de bonheur ! 🎂
- 🥳 @User fête son anniversaire aujourd'hui ! On lui souhaite plein de bonnes choses ! 🎊

## Architecture technique

### Structure des fichiers

```
src/modules/birthdays/
├── birthdays.module.ts              # Module principal
├── commands/
│   └── anniversaire.command.ts      # Commande /anniversaire avec sous-commandes
└── utils/
    └── birthday-checker.ts          # Vérification quotidienne et envoi de messages
```

### Base de données

Table `birthdays` :
- `id` : Identifiant auto-incrémenté
- `user_id` : ID Discord de l'utilisateur
- `guild_id` : ID du serveur Discord
- `day` : Jour de naissance (1-31)
- `month` : Mois de naissance (1-12)
- `year` : Année de naissance (optionnel)
- `created_at` : Date de création
- `updated_at` : Date de dernière mise à jour

### Planification

Le système utilise `setTimeout` et `setInterval` pour :
1. Calculer le temps jusqu'à minuit
2. Exécuter une vérification à minuit
3. Répéter l'opération toutes les 24 heures

En mode développement (`NODE_ENV=development`), une vérification est également effectuée 5 secondes après le démarrage du bot pour faciliter les tests.

## Sécurité et confidentialité

- Les anniversaires sont stockés par serveur (`guild_id`)
- Un utilisateur ne peut enregistrer qu'un seul anniversaire (contrainte unique sur `user_id`)
- Les commandes sont éphémères (seul l'utilisateur qui exécute la commande voit la réponse)
- L'année de naissance est optionnelle pour préserver la vie privée

## Maintenance

### Ajouter un nouveau message d'anniversaire

Modifiez le tableau `messages` dans `birthday-checker.ts` :

```typescript
const messages = [
  "🎂 C'est l'anniversaire de {users} aujourd'hui ! Joyeux anniversaire ! 🎉",
  // Ajoutez vos nouveaux messages ici
];
```

Le placeholder `{users}` sera remplacé par les mentions des utilisateurs.

### Modifier l'heure de vérification

Par défaut, la vérification est effectuée à minuit (00:00). Pour modifier l'heure, ajustez le calcul dans la fonction `startBirthdayChecker()` dans `birthday-checker.ts`.
