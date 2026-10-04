'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function ThemeToggle() {
  const [theme,setTheme]=useState('dark');
  const pathname = usePathname();
  const aboutOnly = ['/about', '/room-planner'].includes(pathname.replace(/\/$/, ''));
  useEffect(()=>{
    const previous = document.documentElement.dataset.theme || 'dark';
    if (aboutOnly) {
      document.documentElement.dataset.theme = 'dark';
      return () => { document.documentElement.dataset.theme = previous; };
    }
    setTheme(previous);
  },[aboutOnly]);
  function toggle(){const next=theme==='light'?'dark':'light';setTheme(next);document.documentElement.dataset.theme=next;try{localStorage.setItem('sofa-theme',next);}catch{}}
  if (aboutOnly) return null;
  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={`Switch to ${theme==='light'?'dark':'light'} theme`} title={`Switch to ${theme==='light'?'dark':'light'} theme`}>
    {theme==='light'?<Moon size={18}/>:<Sun size={18}/>}<span>{theme==='light'?'Dark':'Light'}</span>
  </button>;
}
