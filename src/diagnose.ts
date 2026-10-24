
export type DiagnosisKind = 'dose-high' | 'dose-low' | 'fast' | 'slow' | 'ok';

export type Diagnosis = {
  kind: DiagnosisKind;
  title: string;
  recommendation: string;
  explanation?: string;
  nextAction: string;
  badge?: string;
};

/** Поддерживает десятичную запятую и точку. */
export function parseDecimal(raw: string): number | null {
  const value = raw.trim();
  if (!value || !/^(?:\d+|\d+[.,]\d+|[.,]\d+)$/.test(value)) {
    return null;
  }

  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Проверка утверждённого рабочего стандарта. */
export function diagnose(dose: number, seconds: number): Diagnosis {
  if (dose > 16.2) {
    return {
      kind: 'dose-high',
      title: 'Слишком много кофе',
      recommendation:
        'Уменьши время работы кофемолки. Взвесь кофе ещё раз и добейся 16,0 г. Колесо Fine/Grosso пока не трогай.',
      nextAction: 'Исправь вес и проверь снова',
    };
  }

  if (dose < 15.8) {
    return {
      kind: 'dose-low',
      title: 'Слишком мало кофе',
      recommendation:
        'Увеличь время работы кофемолки. Взвесь кофе ещё раз и добейся 16,0 г. Колесо Fine/Grosso пока не трогай.',
      nextAction: 'Исправь вес и проверь снова',
    };
  }

  if (seconds < 20) {
    return {
      kind: 'fast',
      title: 'Пролив слишком быстрый',
      recommendation:
        'Попробуй сделать помол мельче — в сторону Fine. Меняй его небольшими шагами и повтори пролив.',
      explanation: 'Более мелкий помол обычно замедляет пролив.',
      nextAction: 'Следующий шаг: Fine · мельче',
      badge: 'FINE · МЕЛЬЧЕ',
    };
  }

  if (seconds > 25) {
    return {
      kind: 'slow',
      title: 'Пролив слишком медленный',
      recommendation:
        'Попробуй сделать помол крупнее — в сторону Grosso. Меняй его небольшими шагами и повтори пролив.',
      explanation: 'Более крупный помол обычно ускоряет пролив.',
      nextAction: 'Следующий шаг: Grosso · крупнее',
      badge: 'GROSSO · КРУПНЕЕ',
    };
  }

  return {
    kind: 'ok',
    title: 'Отлично! Всё в норме',
    recommendation:
      'Ты попал в целевой диапазон. Не меняй текущие настройки без необходимости и оцени вкус эспрессо.',
    nextAction: 'Сохрани настройки и оцени вкус',
    badge: 'В ДИАПАЗОНЕ',
  };
}

/**
 * Персональная проверка.
 * Допуск по дозе: ±0,2 г.
 * Допуск по времени: ±2 секунды.
 */
export function diagnoseCustom(
  actualDose: number,
  actualSeconds: number,
  targetDose: number,
  targetSeconds: number,
): Diagnosis {
  const doseTolerance = 0.2;
  const timeTolerance = 2;

  if (actualDose > targetDose + doseTolerance) {
    return {
      kind: 'dose-high',
      title: 'Дозировка выше твоего стандарта',
      recommendation:
        `Твоя цель — ${targetDose} г. Сейчас кофе больше нормы. Уменьши дозу до целевого значения, прежде чем менять помол.`,
      explanation:
        `Допустимый диапазон: ${formatNumber(targetDose - doseTolerance)}–${formatNumber(targetDose + doseTolerance)} г.`,
      nextAction: 'Скорректируй дозу и проверь снова',
    };
  }

  if (actualDose < targetDose - doseTolerance) {
    return {
      kind: 'dose-low',
      title: 'Дозировка ниже твоего стандарта',
      recommendation:
        `Твоя цель — ${targetDose} г. Добавь кофе до целевого значения. Пока не меняй помол.`,
      explanation:
        `Допустимый диапазон: ${formatNumber(targetDose - doseTolerance)}–${formatNumber(targetDose + doseTolerance)} г.`,
      nextAction: 'Скорректируй дозу и проверь снова',
    };
  }

  if (actualSeconds < targetSeconds - timeTolerance) {
    return {
      kind: 'fast',
      title: 'Пролив быстрее твоего стандарта',
      recommendation:
        `Твоя цель — ${targetSeconds} секунд. Попробуй немного сделать помол мельче, чтобы замедлить пролив.`,
      explanation:
        `Твой ориентир с допуском: ${targetSeconds - timeTolerance}–${targetSeconds + timeTolerance} секунд. На время также влияют распределение кофе и трамбовка.`,
      nextAction: 'Попробуй Fine · мельче',
      badge: 'FINE · МЕЛЬЧЕ',
    };
  }

  if (actualSeconds > targetSeconds + timeTolerance) {
    return {
      kind: 'slow',
      title: 'Пролив медленнее твоего стандарта',
      recommendation:
        `Твоя цель — ${targetSeconds} секунд. Попробуй немного сделать помол крупнее, чтобы ускорить пролив.`,
      explanation:
        `Твой ориентир с допуском: ${targetSeconds - timeTolerance}–${targetSeconds + timeTolerance} секунд. На время также влияют распределение кофе и трамбовка.`,
      nextAction: 'Попробуй Grosso · крупнее',
      badge: 'GROSSO · КРУПНЕЕ',
    };
  }

  return {
    kind: 'ok',
    title: 'Ты в своём диапазоне!',
    recommendation:
      'Фактические параметры соответствуют твоему стандарту. Не меняй настройки без необходимости и оцени вкус напитка.',
    explanation:
      `Твоя цель: ${targetDose} г и ${targetSeconds} секунд.`,
    nextAction: 'Сохрани настройки и оцени вкус',
    badge: 'В ТВОЁМ ДИАПАЗОНЕ',
  };
}

function formatNumber(value: number): string {
  return String(Number(value.toFixed(2))).replace('.', ',');
}
