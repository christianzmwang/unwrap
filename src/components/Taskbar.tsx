'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type TaskbarProps = {
  className?: string;
  innerClassName?: string;
  showTopBorder?: boolean;
};

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/chat', label: 'Chat' },
];

const isActiveRoute = (pathname: string, href: string) => {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname.startsWith(href);
};

export default function Taskbar({
  className = '',
  innerClassName = '',
  showTopBorder = false,
}: TaskbarProps) {
  const pathname = usePathname();

  const outerClasses = [
    'w-full',
    showTopBorder ? 'border-t border-gray-800' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const innerClasses = [
    'max-w-3xl mx-auto w-full px-6 py-4 flex items-center gap-6 text-lg',
    innerClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <nav className={outerClasses} aria-label="Primary">
      <div className={innerClasses}>
        {links.map(({ href, label }, index) => {
          const isActive = isActiveRoute(pathname, href);
          const linkClasses = [
            'transition-colors',
            isActive ? 'text-red-500 font-semibold' : 'text-white hover:text-gray-300',
          ].join(' ');

          return (
            <Fragment key={href}>
              <Link href={href} className={linkClasses}>
                {label}
              </Link>
              {index !== links.length - 1 ? <div className="h-6 w-px bg-gray-700" aria-hidden="true" /> : null}
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
}
