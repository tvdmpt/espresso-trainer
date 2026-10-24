
import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  ChevronRight,
  CircleAlert,
  Coffee,
  Moon,
  Sun,
  Timer,
  Scale,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';

import {
  diagnose,
  diagnoseCustom,
  parseDecimal,
  type Diagnosis,
} from './diagnose';

type Theme = 'light' | 'dark';
type Tab = 'standart' | 'custom';
type FieldErrors = Record<string, string | undefined>;

function readSaved(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('standart');

  const [dose, setDose] = useState('16,0');
  const [seconds, setSeconds] = useState('23');
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [targetDose, setTargetDose] = useState(() =>
    readSaved('espresso-custom-target-dose', '18,0')
  );
  const [targetSeconds, setTargetSeconds] = useState(() =>
    readSaved('espresso-custom-target-seconds', '30')
  );

  const [actualDose, setActualDose] = useState('18,0');
  const [actualSeconds, setActualSeconds] = useState('30');
  const [customResult, setCustomResult] = useState<Diagnosis | null>(null);
  const [customErrors, setCustomErrors] = useState<FieldErrors>({});

  const [theme, setTheme] = useState<Theme>(() =>
    window.Telegram?.WebApp?.colorScheme === 'dark' ? 'dark' : 'light'
  );

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    webApp.ready();
    webApp.expand();

    const updateTheme = () =>
      setTheme(webApp.colorScheme === 'dark' ? 'dark' : 'light');

    webApp.onEvent('themeChanged', updateTheme);
    return () => webApp.offEvent('themeChanged', updateTheme);
  }, []);

  useEffect(() => {
    const dark = theme === 'dark';
    document.documentElement.dataset.theme = theme;

    const webApp = window.Telegram?.WebApp;
    webApp?.setHeaderColor?.(dark ? '#101010' : '#f5f5f5');
    webApp?.setBackgroundColor?.(dark ? '#101010' : '#f5f5f5');
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('espresso-custom-target-dose', targetDose);
      localStorage.setItem('espresso-custom-target-seconds', targetSeconds);
    } catch {
      // Приложение продолжает работать, даже если хранилище недоступно.
    }
  }, [targetDose, targetSeconds]);

  function checkStandard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedDose = parseDecimal(dose);
    const parsedTime = parseDecimal(seconds);
    const nextErrors: FieldErrors = {};

    if (parsedDose === null) {
      nextErrors.dose = 'Введи вес числом, например 16,0.';
    }
    if (parsedTime === null) {
      nextErrors.time = 'Введи время числом, например 23.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      setResult(null);
      return;
    }

    setResult(diagnose(parsedDose!, parsedTime!));
  }

  function checkCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const goalDose = parseDecimal(targetDose);
    const goalTime = parseDecimal(targetSeconds);
    const measuredDose = parseDecimal(actualDose);
    const measuredTime = parseDecimal(actualSeconds);

    const nextErrors: FieldErrors = {};

    if (goalDose === null || goalDose <= 0) {
      nextErrors.targetDose = 'Укажи целевую дозу больше нуля.';
    }
    if (goalTime === null || goalTime <= 0) {
      nextErrors.targetSeconds = 'Укажи целевое время больше нуля.';
    }
    if (measuredDose === null) {
      nextErrors.actualDose = 'Введи фактическую дозу.';
    }
    if (measuredTime === null) {
      nextErrors.actualSeconds = 'Введи фактическое время.';
    }

    setCustomErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      setCustomResult(null);
      return;
    }

    setCustomResult(
      diagnoseCustom(
        measuredDose!,
        measuredTime!,
        goalDose!,
        goalTime!,
      )
    );
  }

  function changeTab(nextTab: Tab) {
    setTab(nextTab);
  }

  function updateStandardDose(value: string) {
    setDose(value);
    setErrors(current => ({ ...current, dose: undefined }));
  }

  function updateStandardTime(value: string) {
    setSeconds(value);
    setErrors(current => ({ ...current, time: undefined }));
  }

  function updateCustomField(
    field: string,
    setter: (value: string) => void,
    value: string,
  ) {
    setter(value);
    setCustomErrors(current => ({ ...current, [field]: undefined }));
  }

  function renderResult(value: Diagnosis | null, emptyText: string) {
    if (!value) {
      return (
        <section className="empty-state" aria-live="polite">
          <div className="empty-icon"><Check size={19} /></div>
          <div>
            <h2>Готов к проверке</h2>
            <p>{emptyText}</p>
          </div>
        </section>
      );
    }

    return (
      <section
        className={`result-card result-${value.kind}`}
        aria-live="polite"
        aria-atomic="true"
        key={`${value.kind}-${value.title}`}
      >
        <div className="result-topline">
          <span className="result-kicker">РЕЗУЛЬТАТ ПРОВЕРКИ</span>
          {value.kind === 'ok' && (
            <span className="range-badge">
              <Check size={12} /> В ДИАПАЗОНЕ
            </span>
          )}
        </div>

        <h1>{value.title}</h1>
        <p className="recommendation">{value.recommendation}</p>

        {value.explanation && (
          <p className="explanation">{value.explanation}</p>
        )}

        {value.badge && value.kind !== 'ok' && (
          <div className="direction-chip">
            <span className="direction-symbol">↔</span> {value.badge}
          </div>
        )}

        <div className="next-step">
          <span className="step-number">→</span>
          <div>
            <span className="step-label">СЛЕДУЮЩЕЕ ДЕЙСТВИЕ</span>
            <p>{value.nextAction}</p>
          </div>
        </div>
      </section>
    );
  }

  function renderField(
    id: string,
    label: string,
    value: string,
    setter: (value: string) => void,
    unit: string,
    error?: string,
    help?: string,
    icon: 'scale' | 'timer' = 'scale',
  ) {
    const Icon = icon === 'scale' ? Scale : Timer;

    return (
      <div className={`measure-card ${error ? 'has-error' : ''}`}>
        <div className="measure-label">
          <Icon size={15} strokeWidth={1.8} />
          <label htmlFor={id}>{label}</label>
        </div>

        <div className="input-line">
          <input
            id={id}
            name={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={value}
            onChange={event => setter(event.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : `${id}-help`}
          />
          <span className="unit">{unit}</span>
        </div>

        <div className="measure-help" id={`${id}-help`}>
          {help && <span>{help}</span>}
        </div>

        {error && (
          <p className="field-error" id={`${id}-error`}>
            <CircleAlert size={13} /> {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">
          <Coffee size={19} strokeWidth={1.7} />
        </div>

        <div className="brand-copy">
          <p className="eyebrow">ESPRESSO TRAINER</p>
          <p className="subtitle">
            {tab === 'standart' ? 'Рабочий стандарт' : 'Твой личный стандарт'}
          </p>
        </div>

        <button
          className="theme-toggle"
          type="button"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
          title="Сменить тему"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      {tab === 'standart' ? (
        <>
          <section className="intro" aria-label="Рабочие параметры">
            <span className="status-dot" /> РАБОЧИЙ СТАНДАРТ
            <p>Следуй утверждённым параметрам приготовления.</p>
          </section>

          <form onSubmit={checkStandard} noValidate>
            <div className="measure-grid">
              {renderField(
                'dose',
                'ДОЗА',
                dose,
                updateStandardDose,
                'г',
                errors.dose,
                'Цель: 16,0 г · Допуск: ±0,2 г',
              )}

              {renderField(
                'seconds',
                'ВРЕМЯ ПРОЛИВА',
                seconds,
                updateStandardTime,
                'сек',
                errors.time,
                'Цель: 20–25 секунд',
                'timer',
              )}
            </div>

            <button className="check-button" type="submit">
              ПРОВЕРИТЬ <ChevronRight size={17} />
            </button>
          </form>

          {renderResult(
            result,
            'Введи фактический вес и время пролива, затем нажми «Проверить».',
          )}

          <section className="grind-guide" aria-label="Направления настройки помола">
            <div className="guide-heading">КОЛЕСО ПОМОЛА</div>
            <div className="guide-track">
              <span>FINE <i>·</i> МЕЛЬЧЕ</span>
              <div className="track-line"><span /></div>
              <span>GROSSO <i>·</i> КРУПНЕЕ</span>
            </div>
            <p>Меняй помол небольшими шагами. После изменения повтори пролив.</p>
          </section>
        </>
      ) : (
        <>
          <section className="intro" aria-label="Личный стандарт">
            <span className="status-dot" /> ТВОИ ПАРАМЕТРЫ
            <p>Настрой собственный рецепт и проверяй каждый пролив относительно него.</p>
          </section>

          <section className="custom-section">
            <div className="section-heading">
              <Settings2 size={17} />
              <div>
                <h2>Мой стандарт</h2>
                <p>Целевые параметры твоего рецепта</p>
              </div>
            </div>

            <div className="measure-grid">
              {renderField(
                'target-dose',
                'ЦЕЛЕВАЯ ДОЗА',
                targetDose,
                value => updateCustomField('targetDose', setTargetDose, value),
                'г',
                customErrors.targetDose,
                'Твой желаемый вес кофе',
              )}

              {renderField(
                'target-seconds',
                'ЦЕЛЕВОЕ ВРЕМЯ',
                targetSeconds,
                value => updateCustomField('targetSeconds', setTargetSeconds, value),
                'сек',
                customErrors.targetSeconds,
                'Твоё желаемое время пролива',
                'timer',
              )}
            </div>

            <p className="custom-note">
              Цели сохраняются на этом устройстве. Допуск проверки: ±0,2 г и ±2 секунды.
            </p>
          </section>

          <form onSubmit={checkCustom} noValidate>
            <div className="section-heading actual-heading">
              <SlidersHorizontal size={17} />
              <div>
                <h2>Фактический пролив</h2>
                <p>Введи измеренные значения после приготовления</p>
              </div>
            </div>

            <div className="measure-grid">
              {renderField(
                'actual-dose',
                'ФАКТИЧЕСКАЯ ДОЗА',
                actualDose,
                value => updateCustomField('actualDose', setActualDose, value),
                'г',
                customErrors.actualDose,
                'Сколько кофе получилось',
              )}

              {renderField(
                'actual-seconds',
                'ВРЕМЯ ПРОЛИВА',
                actualSeconds,
                value => updateCustomField('actualSeconds', setActualSeconds, value),
                'сек',
                customErrors.actualSeconds,
                'Сколько длился пролив',
                'timer',
              )}
            </div>

            <button className="check-button" type="submit">
              ПРОВЕРИТЬ МОЙ СТАНДАРТ <ChevronRight size={17} />
            </button>
          </form>

          {renderResult(
            customResult,
            'Сначала задай свои целевые параметры, затем введи фактические значения и нажми «Проверить».',
          )}

          <section className="grind-guide" aria-label="Направления настройки помола">
            <div className="guide-heading">НАСТРОЙКА ПОМОЛА</div>
            <div className="guide-track">
              <span>FINE <i>·</i> МЕЛЬЧЕ</span>
              <div className="track-line"><span /></div>
              <span>GROSSO <i>·</i> КРУПНЕЕ</span>
            </div>
            <p>
              Рекомендации учитывают твой стандарт. Меняй помол постепенно и
              оценивай вкус напитка.
            </p>
          </section>
        </>
      )}

      <footer className="workflow" aria-label="Порядок настройки">
        <span className="workflow-item active"><b>01</b> Вес</span>
        <span className="workflow-line" />
        <span className="workflow-item"><b>02</b> Помол</span>
        <span className="workflow-line" />
        <span className="workflow-item"><b>03</b> Проверка</span>
      </footer>

      <p className="footnote">
        Время и вес — ориентиры. Финальное решение зависит и от вкуса.
      </p>

      <nav className="bottom-nav" aria-label="Разделы приложения">
        <button
          type="button"
          className={`nav-tab ${tab === 'standart' ? 'selected' : ''}`}
          aria-current={tab === 'standart' ? 'page' : undefined}
          onClick={() => changeTab('standart')}
        >
          <SlidersHorizontal size={19} />
          <span>standart</span>
        </button>

        <button
          type="button"
          className={`nav-tab ${tab === 'custom' ? 'selected' : ''}`}
          aria-current={tab === 'custom' ? 'page' : undefined}
          onClick={() => changeTab('custom')}
        >
          <Settings2 size={19} />
          <span>custom</span>
        </button>
      </nav>
    </main>
  );
}
