import { useEffect, useState, type FormEvent } from 'react';
import { Check, ChevronRight, CircleAlert, Coffee, Moon, Sun, Timer, Scale } from 'lucide-react';
import { diagnose, parseDecimal, type Diagnosis } from './diagnose';

type Theme = 'light' | 'dark';
type FieldErrors = { dose?: string; time?: string };

export default function App() {
  const [dose, setDose] = useState('16,0');
  const [seconds, setSeconds] = useState('23');
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [theme, setTheme] = useState<Theme>(() => window.Telegram?.WebApp?.colorScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;
    webApp.ready();
    webApp.expand();
    const updateTheme = () => setTheme(webApp.colorScheme === 'dark' ? 'dark' : 'light');
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

  function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedDose = parseDecimal(dose);
    const parsedTime = parseDecimal(seconds);
    const nextErrors: FieldErrors = {};
    if (parsedDose === null) nextErrors.dose = 'Введи вес числом, например 16,0.';
    if (parsedTime === null) nextErrors.time = 'Введи время числом, например 23.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setResult(null); return; }
    setResult(diagnose(parsedDose!, parsedTime!));
  }

  function editDose(value: string) { setDose(value); setErrors(current => ({ ...current, dose: undefined })); }
  function editSeconds(value: string) { setSeconds(value); setErrors(current => ({ ...current, time: undefined })); }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true"><Coffee size={19} strokeWidth={1.7} /></div>
        <div className="brand-copy"><p className="eyebrow">ESPRESSO TRAINER</p><p className="subtitle">Настройка эспрессо</p></div>
        <button className="theme-toggle" type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'} title="Сменить тему">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      <section className="intro" aria-label="Целевые параметры">
        <span className="status-dot" /> <span>ЦЕЛЕВЫЕ ПАРАМЕТРЫ</span>
        <p>Сначала точный вес. Затем — настройка помола.</p>
      </section>

      <form onSubmit={check} noValidate>
        <div className="measure-grid">
          <div className={`measure-card ${errors.dose ? 'has-error' : ''}`}>
            <div className="measure-label"><Scale size={15} strokeWidth={1.8} /><label htmlFor="dose">ДОЗА</label></div>
            <div className="input-line"><input id="dose" name="dose" type="text" inputMode="decimal" autoComplete="off" value={dose} onChange={e => editDose(e.target.value)} aria-invalid={!!errors.dose} aria-describedby={errors.dose ? 'dose-error' : 'dose-help'} /><span className="unit">г</span></div>
            <div className="measure-help" id="dose-help"><span>Цель: 16,0 г</span><span>Допуск: ±0,2 г</span></div>
            {errors.dose && <p className="field-error" id="dose-error"><CircleAlert size={13} />{errors.dose}</p>}
          </div>
          <div className={`measure-card ${errors.time ? 'has-error' : ''}`}>
            <div className="measure-label"><Timer size={15} strokeWidth={1.8} /><label htmlFor="seconds">ВРЕМЯ ПРОЛИВА</label></div>
            <div className="input-line"><input id="seconds" name="seconds" type="text" inputMode="decimal" autoComplete="off" value={seconds} onChange={e => editSeconds(e.target.value)} aria-invalid={!!errors.time} aria-describedby={errors.time ? 'time-error' : 'time-help'} /><span className="unit">сек</span></div>
            <div className="measure-help" id="time-help"><span>Цель: 20–25 сек</span></div>
            {errors.time && <p className="field-error" id="time-error"><CircleAlert size={13} />{errors.time}</p>}
          </div>
        </div>
        <button className="check-button" type="submit">ПРОВЕРИТЬ <ChevronRight size={17} /></button>
      </form>

      {result ? <section className={`result-card result-${result.kind}`} aria-live="polite" aria-atomic="true" key={`${result.kind}-${result.title}`}>
        <div className="result-topline"><span className="result-kicker">РЕЗУЛЬТАТ ПРОВЕРКИ</span>{result.kind === 'ok' && <span className="range-badge"><Check size={12} />В ДИАПАЗОНЕ</span>}</div>
        <h1>{result.title}</h1>
        <p className="recommendation">{result.recommendation}</p>
        {result.explanation && <p className="explanation">{result.explanation}</p>}
        {result.badge && result.kind !== 'ok' && <div className="direction-chip"><span className="direction-symbol">↔</span> {result.badge}</div>}
        <div className="next-step"><span className="step-number">→</span><div><span className="step-label">СЛЕДУЮЩЕЕ ДЕЙСТВИЕ</span><p>{result.nextAction}</p></div></div>
      </section> : <section className="empty-state" aria-live="polite"><div className="empty-icon"><Check size={19} strokeWidth={1.5} /></div><div><h2>Готов к проверке</h2><p>Введи фактический вес и время пролива, затем нажми «Проверить».</p></div></section>}

      <section className="grind-guide" aria-label="Направления настройки помола">
        <div className="guide-heading">КОЛЕСО ПОМОЛА</div>
        <div className="guide-track"><span>FINE <i>·</i> МЕЛЬЧЕ</span><div className="track-line"><span /></div><span>GROSSO <i>·</i> КРУПНЕЕ</span></div>
        <p>Меняй помол небольшими шагами. Не ориентируйся на направление вращения.</p>
      </section>

      <footer className="workflow" aria-label="Порядок настройки"><span className="workflow-item active"><b>01</b> Вес</span><span className="workflow-line" /><span className="workflow-item"><b>02</b> Помол</span><span className="workflow-line" /><span className="workflow-item"><b>03</b> Проверка</span></footer>
      <p className="footnote">Время и вес — ориентиры. Финальное решение зависит и от вкуса.</p>
    </main>
  );
}
