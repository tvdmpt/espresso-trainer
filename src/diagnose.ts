export type DiagnosisKind = 'dose-high' | 'dose-low' | 'fast' | 'slow' | 'ok';
export type Diagnosis = { kind: DiagnosisKind; title: string; recommendation: string; explanation?: string; nextAction: string; badge?: string };

/** Parse a decimal entered with either comma or dot, without accepting partial numeric strings. */
export function parseDecimal(raw: string): number | null {
  const value = raw.trim();
  if (!value || !/^(?:\d+|\d+[.,]\d+|[.,]\d+)$/.test(value)) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Dose is compared as integer tenths to avoid floating-point boundary mistakes. */
export function diagnose(dose: number, seconds: number): Diagnosis {
  // Do not round the input: 15.79 and 16.21 must remain out of range.
  const low = dose < 15.8;
  const high = dose > 16.2;

  // Dose takes priority: never recommend grind changes until the dose is in range.
  if (high) return {
    kind: 'dose-high', title: 'Слишком много кофе',
    recommendation: 'Уменьши время работы кофемолки. Взвесь кофе ещё раз и добейся 16,0 г. Колесо Fine/Grosso пока не трогай.',
    nextAction: 'Исправь вес и проверь снова',
  };
  if (low) return {
    kind: 'dose-low', title: 'Слишком мало кофе',
    recommendation: 'Увеличь время работы кофемолки. Взвесь кофе ещё раз и добейся 16,0 г. Колесо Fine/Grosso пока не трогай.',
    nextAction: 'Исправь вес и проверь снова',
  };
  if (seconds < 20) return {
    kind: 'fast', title: 'Пролив слишком быстрый',
    recommendation: 'Сделай помол мельче — в сторону Fine. Поверни колесо на небольшую величину, приготовь следующий эспрессо и снова проверь время.',
    explanation: 'Более мелкий помол обычно замедляет пролив.',
    nextAction: 'Следующий шаг: Fine · мельче', badge: 'FINE · МЕЛЬЧЕ',
  };
  if (seconds > 25) return {
    kind: 'slow', title: 'Пролив слишком медленный',
    recommendation: 'Сделай помол крупнее — в сторону Grosso. Поверни колесо на небольшую величину, приготовь следующий эспрессо и снова проверь время.',
    explanation: 'Более крупный помол обычно ускоряет пролив.',
    nextAction: 'Следующий шаг: Grosso · крупнее', badge: 'GROSSO · КРУПНЕЕ',
  };
  return {
    kind: 'ok', title: 'Отлично! Всё в норме',
    recommendation: 'Ты попал в целевой диапазон. Не меняй текущие настройки. Теперь проверь вкус эспрессо.',
    nextAction: 'Сохрани настройки и оцени вкус', badge: 'В ДИАПАЗОНЕ',
  };
}
