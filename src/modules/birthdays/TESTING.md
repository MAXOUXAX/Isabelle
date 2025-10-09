# Tests du Module Anniversaires

Ce document décrit les scénarios de test pour valider le fonctionnement du module anniversaires.

## Prérequis

1. Le bot doit être déployé sur un serveur Discord de test
2. Au moins 2-3 utilisateurs différents pour tester les fonctionnalités
3. Accès aux logs du bot pour vérifier les messages du scheduler

## Tests des Commandes

### Test 1: Enregistrer un anniversaire valide

**Commande:**
```
/anniversaire set jour:15 mois:3 annee:2000
```

**Résultat attendu:**
- ✅ Message de confirmation : "Ton anniversaire a été enregistré le 15 mars 2000 ! 🎂"
- Message visible uniquement par l'utilisateur (ephemeral)
- Entrée créée dans la base de données

### Test 2: Enregistrer un anniversaire sans année

**Commande:**
```
/anniversaire set jour:25 mois:12
```

**Résultat attendu:**
- ✅ Message de confirmation : "Ton anniversaire a été enregistré le 25 décembre ! 🎂"
- Pas d'âge affiché dans les listes

### Test 3: Mettre à jour un anniversaire existant

**Actions:**
1. Enregistrer un anniversaire
2. Réexécuter la commande avec des valeurs différentes

**Résultat attendu:**
- ✅ Le nouvel anniversaire remplace l'ancien
- Pas de doublon dans la base de données

### Test 4: Date invalide

**Commande:**
```
/anniversaire set jour:31 mois:2
```

**Résultat attendu:**
- ❌ Message d'erreur : "Date invalide. Vérifie les valeurs saisies."

### Test 5: Lister les anniversaires (liste vide)

**Commande:**
```
/anniversaire list
```

**Résultat attendu:**
- Message : "Aucun anniversaire n'est enregistré pour le moment. 😢"

### Test 6: Lister les anniversaires (avec données)

**Prérequis:**
- Plusieurs utilisateurs ont enregistré leurs anniversaires

**Commande:**
```
/anniversaire list
```

**Résultat attendu:**
- Embed avec titre "🎂 Prochains anniversaires"
- Liste triée par ordre chronologique (le plus proche en premier)
- Affichage du nombre de jours restants
- Affichage de l'âge si l'année a été fournie
- Maximum 10 anniversaires affichés
- Si plus de 10, footer avec le nombre d'anniversaires supplémentaires

### Test 7: Voir l'anniversaire d'un utilisateur (existant)

**Commande:**
```
/anniversaire voir utilisateur:@User
```

**Résultat attendu:**
- Message : "🎂 L'anniversaire de User est le [date] - dans X jour(s)"
- Si c'est aujourd'hui : "🎉 C'est aujourd'hui !"

### Test 8: Voir l'anniversaire d'un utilisateur (non enregistré)

**Commande:**
```
/anniversaire voir utilisateur:@NewUser
```

**Résultat attendu:**
- Message : "NewUser n'a pas encore enregistré son anniversaire. 😢"

## Tests du Scheduler

### Test 9: Vérification au démarrage (dev mode)

**Actions:**
1. Configurer `NODE_ENV=development`
2. Enregistrer un anniversaire avec la date du jour
3. Redémarrer le bot

**Résultat attendu:**
- Après 5 secondes, le bot doit envoyer un message d'anniversaire dans un salon approprié
- Log dans la console : "Running birthday check immediately (development mode)"
- Log : "Found X birthday(s) today"
- Log : "Birthday message sent"

### Test 10: Vérification du canal de message

**Prérequis:**
- Serveur avec plusieurs salons textuels

**Résultat attendu:**
Le bot doit chercher dans cet ordre :
1. Un salon contenant "général" ou "general"
2. Un salon contenant "annonces" ou "announcements"
3. Un salon contenant "bot" ou "bots"
4. Le premier salon textuel disponible

### Test 11: Messages multiples le même jour

**Actions:**
1. Enregistrer 2-3 anniversaires pour le même jour
2. Déclencher la vérification

**Résultat attendu:**
- Un seul message contenant tous les utilisateurs
- Format : "@User1 et @User2" ou "@User1, @User2 et @User3"
- Message choisi aléatoirement parmi les templates disponibles

### Test 12: Planification à minuit

**Vérification dans les logs:**
```
Birthday checker will run at midnight (in X minutes)
```

**Résultat attendu:**
- Le bot doit calculer correctement le temps jusqu'à minuit
- Le premier check doit se déclencher exactement à 00:00
- Les vérifications suivantes doivent se répéter toutes les 24h

## Tests de Sécurité et Limites

### Test 13: Utilisateur unique par anniversaire

**Actions:**
1. Utilisateur A enregistre un anniversaire
2. Le même utilisateur A tente d'enregistrer un autre anniversaire

**Résultat attendu:**
- Le second anniversaire remplace le premier
- Pas d'erreur de contrainte de base de données

### Test 14: Commandes en serveur uniquement

**Action:**
Essayer d'exécuter `/anniversaire set` en message privé au bot

**Résultat attendu:**
- Message d'erreur : "Cette commande ne peut être utilisée que dans un serveur."

### Test 15: Confidentialité des réponses

**Vérification:**
- Toutes les réponses des commandes doivent être ephemeral (visibles uniquement par l'utilisateur)
- Les messages d'anniversaire automatiques sont publics (comportement attendu)

## Checklist de Validation

- [ ] Test 1: Enregistrement valide
- [ ] Test 2: Enregistrement sans année
- [ ] Test 3: Mise à jour d'anniversaire
- [ ] Test 4: Date invalide
- [ ] Test 5: Liste vide
- [ ] Test 6: Liste avec données
- [ ] Test 7: Voir anniversaire existant
- [ ] Test 8: Voir anniversaire non enregistré
- [ ] Test 9: Vérification dev mode
- [ ] Test 10: Sélection du canal
- [ ] Test 11: Anniversaires multiples
- [ ] Test 12: Planification minuit
- [ ] Test 13: Contrainte unicité
- [ ] Test 14: Serveur uniquement
- [ ] Test 15: Confidentialité

## Notes de Débogage

### Logs importants à surveiller

```
[birthday-checker] Checking for birthdays today
[birthday-checker] Found X birthday(s) today
[birthday-checker] Birthday message sent
[birthdays] Birthday registered
```

### Commandes SQL utiles

```sql
-- Voir tous les anniversaires
SELECT * FROM birthdays;

-- Anniversaires d'aujourd'hui
SELECT * FROM birthdays WHERE day = [jour] AND month = [mois];

-- Supprimer un anniversaire pour re-tester
DELETE FROM birthdays WHERE user_id = '[USER_ID]';
```

### Forcer un test d'anniversaire aujourd'hui

Pour tester rapidement, modifiez temporairement `birthday-checker.ts` :

```typescript
// Remplacer temporairement pour tester
const currentDay = 15;  // Votre jour de test
const currentMonth = 3; // Votre mois de test
```

Puis redémarrez le bot et vérifiez les logs.
