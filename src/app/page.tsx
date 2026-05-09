'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function Home() {
  const { currentUser } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (currentUser) router.replace('/dashboard');
    else router.replace('/login');
  }, [currentUser, router]);

  return null;
}
