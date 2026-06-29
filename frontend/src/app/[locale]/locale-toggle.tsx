import Link from 'next/link';

// Simple EN/FR switch for the day-one page (a proper toggle lands with the shell).
export function LocaleToggle({current}: {current: string}) {
  const cls = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm font-bold ${
      active ? 'bg-[#8FD3BE] text-[#14302B]' : 'text-[#2E8B6F]'
    }`;

  return (
    <nav className="flex gap-2" aria-label="Language">
      <Link href="/en" className={cls(current === 'en')}>
        EN
      </Link>
      <Link href="/fr" className={cls(current === 'fr')}>
        FR
      </Link>
    </nav>
  );
}
