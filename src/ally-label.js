// Name-based approximation for the greeting; ambiguous names keep the neutral label.
export function allyLabel(nombre) {
  const firstName = String(nombre || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[\s-]+/)[0];
  const feminine = new Set(['maria', 'ana', 'carmen', 'luz', 'belen', 'raquel', 'ruth', 'rut', 'isabel', 'beatriz', 'ines', 'mercedes', 'pilar', 'dolores', 'rosario', 'consuelo', 'angeles', 'guadalupe', 'lourdes', 'soledad', 'esther', 'ester', 'abril', 'liz', 'edith', 'judith', 'mabel', 'karen', 'jennifer', 'nicole', 'michelle', 'gabrielle', 'noemi', 'naomi', 'iris', 'zoe']);
  const masculine = new Set(['jose', 'juan', 'luis', 'carlos', 'miguel', 'manuel', 'jesus', 'david', 'daniel', 'gabriel', 'rafael', 'samuel', 'angel', 'andres', 'javier', 'jorge', 'enrique', 'felipe', 'vicente', 'martin', 'ruben', 'ivan', 'joaquin', 'agustin', 'benjamin', 'sebastian', 'cristian', 'christian', 'victor', 'cesar', 'oscar', 'hector', 'omar', 'edgar', 'alexander', 'walter', 'henry', 'eloy', 'matias', 'elias', 'tomas', 'nicolas', 'lucas', 'marcos', 'moises', 'jonas', 'josue', 'ismael', 'noe', 'bautista', 'borja', 'luca', 'nikita']);
  const ambiguous = new Set(['alex', 'alexis', 'ariel', 'andrea', 'andrey', 'rene', 'noah', 'noa', 'sasha', 'sacha', 'dana', 'denis', 'deniz', 'francis', 'dominique', 'jean', 'jessie', 'leslie', 'robin', 'sam', 'taylor', 'trinidad', 'reyes', 'cruz', 'paz', 'socorro', 'concepcion', 'asuncion']);
  if (ambiguous.has(firstName)) return 'Aliad@';
  if (feminine.has(firstName)) return 'Aliada';
  if (masculine.has(firstName)) return 'Aliado';
  if (firstName.length > 2 && firstName.endsWith('a')) return 'Aliada';
  if (firstName.length > 2 && firstName.endsWith('o')) return 'Aliado';
  return 'Aliad@';
}
