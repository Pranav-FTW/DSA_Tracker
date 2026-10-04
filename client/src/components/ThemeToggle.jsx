import { useTheme } from '../context/ThemeContext';
import { IconMoon, IconSun } from './Icons';

// One-tap dark / light switch. The choice is remembered on this device.
export default function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button type="button" className={`icon-btn theme-toggle ${className}`} onClick={toggle} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
    </button>
  );
}
