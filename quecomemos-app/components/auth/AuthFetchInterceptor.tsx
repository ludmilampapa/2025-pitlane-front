'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { API_BASE_URL } from '@/lib/config/api';

let isPatched = false;

export function AuthFetchInterceptor() {
  useEffect(() => {
    if (isPatched || typeof window === 'undefined') return;
    isPatched = true;

    const originalFetch = window.fetch.bind(window);
    const supabase = createClient();
    const apiPrefix = API_BASE_URL.replace(/\/$/, '');

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.startsWith(apiPrefix)) {
        const headers = new Headers(
          init?.headers || (input instanceof Request ? input.headers : undefined)
        );

        if (!headers.has('Authorization')) {
          try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (token) {
              headers.set('Authorization', `Bearer ${token}`);
            }
          } catch {
            // Proceed without token if session lookup fails
          }
        }

        return originalFetch(input, { ...init, headers });
      }

      return originalFetch(input, init);
    };
  }, []);

  return null;
}
