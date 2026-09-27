import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const dark = theme === 'dark';
  return <button type="button" className="theme-toggle" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'} title={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}><span aria-hidden="true">{dark ? <Sun size={17}/> : <Moon size={17}/>}</span><span className="hidden sm:inline">{dark ? 'Tema claro' : 'Tema escuro'}</span></button>;
}
