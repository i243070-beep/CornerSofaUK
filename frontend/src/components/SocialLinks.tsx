import { Users } from 'lucide-react';

function InstagramIcon({ size = 23 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>;
}
function TikTokIcon({ size = 23 }: { size?: number }) {
  const note = 'M14 3h3c.4 2.3 1.7 3.6 4 3.9v3a8 8 0 0 1-4-1.3v7.1a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3V3Z';
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d={note} fill="#25f4ee" transform="translate(-.7 -.4)" /><path d={note} fill="#fe2c55" transform="translate(.7 .4)" /><path d={note} fill="white" /></svg>;
}

export default function SocialLinks({ compact = false }: { compact?: boolean }) {
  const profiles = [
    { name: 'Instagram', url: process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/cornersofa2026/', Icon: InstagramIcon },
    { name: 'TikTok', url: process.env.NEXT_PUBLIC_TIKTOK_URL || 'https://www.tiktok.com/@corner.sofa.online.uk', Icon: TikTokIcon },
    { name: 'Facebook', url: process.env.NEXT_PUBLIC_FACEBOOK_URL, Icon: Users },
  ].filter(profile => profile.url && /^https:\/\//.test(profile.url));
  if (!profiles.length) return null;
  return <nav aria-label="Corner Sofa social profiles" className={compact ? "home-social-links" : "flex flex-wrap gap-3 py-5"}>{profiles.map(({ name, url, Icon }) => <a key={name} aria-label={`Corner Sofa on ${name}`} title={name} href={url} target="_blank" rel="noopener noreferrer" className={compact ? "home-social-link" : "inline-flex items-center gap-2 rounded-full border border-current/20 px-4 py-2 text-xs"}><Icon size={compact ? 23 : 17} aria-hidden="true" />{!compact && name}</a>)}</nav>;
}
