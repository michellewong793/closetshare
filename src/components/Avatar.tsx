'use client';

import Image from 'next/image';
import clsx from 'clsx';

interface AvatarProps {
  profile: { full_name: string; avatar_color: string; avatar_url?: string };
  /** Tailwind size classes, e.g. "w-10 h-10". Must form a square. */
  className?: string;
  textClassName?: string;
}

export default function Avatar({ profile, className, textClassName = 'text-sm' }: AvatarProps) {
  const initial = profile.full_name?.charAt(0) ?? '?';

  if (profile.avatar_url) {
    return (
      <div className={clsx('relative rounded-full overflow-hidden flex-shrink-0', className)}>
        <Image
          src={profile.avatar_url}
          alt={profile.full_name}
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>
    );
  }

  return (
    <div className={clsx(
      'rounded-full flex items-center justify-center font-bold text-gray-900 flex-shrink-0',
      profile.avatar_color,
      textClassName,
      className,
    )}>
      {initial}
    </div>
  );
}
