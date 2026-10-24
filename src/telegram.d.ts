interface TelegramWebApp {
  colorScheme: 'light' | 'dark';
  themeParams?: { bg_color?: string; text_color?: string; secondary_bg_color?: string; hint_color?: string; section_bg_color?: string };
  isExpanded?: boolean;
  ready(): void;
  expand(): void;
  onEvent(eventType: 'themeChanged', eventHandler: () => void): void;
  offEvent(eventType: 'themeChanged', eventHandler: () => void): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
}
interface Window { Telegram?: { WebApp?: TelegramWebApp } }
