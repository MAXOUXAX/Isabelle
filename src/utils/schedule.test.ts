import { extractTeacherName, getLessonColor } from './schedule.js';
import assert from 'node:assert';

console.log('Running tests for src/utils/schedule.ts');

// Tests for extractTeacherName
console.log('Testing extractTeacherName...');

const summary = 'Cours de Maths';

// Case 1: Simple teacher name extraction
const desc1 = `
M. Dupont
`;
assert.strictEqual(extractTeacherName(desc1, summary), 'M. Dupont', 'Should extract simple teacher name');

// Case 2: Explicit teacher tag
const desc2 = `
Enseignant: Mme. Martin
`;
assert.strictEqual(extractTeacherName(desc2, summary), 'Mme. Martin', 'Should extract explicit teacher tag');

// Case 3: Explicit teacher tag with different spacing
const desc3 = `
Enseignant : M. Smith
`;
assert.strictEqual(extractTeacherName(desc3, summary), 'M. Smith', 'Should extract explicit teacher tag with space');

// Case 4: Ignore patterns
const desc4 = `
(Modifié le: 2023-10-01)
12345
TELECOM Nancy
Apprentis
FISEA
M. Durant
(Exporté le: 2023-10-01)
`;
assert.strictEqual(extractTeacherName(desc4, summary), 'M. Durant', 'Should ignore metadata and groups');

// Case 5: Summary matches line (ignore)
const desc5 = `
Cours de Maths
M. Le Prof
`;
assert.strictEqual(extractTeacherName(desc5, summary), 'M. Le Prof', 'Should ignore line matching summary');

// Case 6: No teacher found
const desc6 = `
(Modifié le: 2023-10-01)
TELECOM Nancy
`;
assert.strictEqual(extractTeacherName(desc6, summary), '', 'Should return empty string if no teacher found');

console.log('extractTeacherName tests passed!');

// Tests for getLessonColor
console.log('Testing getLessonColor...');

assert.strictEqual(getLessonColor('Examen de Maths'), '#e60000', 'Examen should be red');
assert.strictEqual(getLessonColor('Contrôle noté'), '#e60000', 'Noté should be red');
assert.strictEqual(getLessonColor('Cours CM'), '#ff8000', 'CM should be orange');
assert.strictEqual(getLessonColor('Travaux Dirigés TD'), '#008000', 'TD should be green');
assert.strictEqual(getLessonColor('TP Informatique'), '#0066cc', 'TP should be blue');
assert.strictEqual(getLessonColor('Période bloquée'), '#663300', 'Période should be brown');
assert.strictEqual(getLessonColor('Cours d\'Anglais'), '#9966ff', 'Anglais should be purple');
assert.strictEqual(getLessonColor('Autre cours'), '#660066', 'Other should be default purple');

console.log('getLessonColor tests passed!');

console.log('All tests passed successfully.');
