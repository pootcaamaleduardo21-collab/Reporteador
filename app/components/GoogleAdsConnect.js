'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function GoogleAdsConnect() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user);

      if (session?.user) {
        const { data } = await supabase
          .from('google_ads_tokens')
          .select('id')
          .eq('user_id', session.user.id)
          .single();

        setConnected(!!data);
      }
    } catch (error) {
      console.log('Not connected yet');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = '/api/oauth/google-ads/login';
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h3>Google Ads</h3>
      {connected ? (
        <div style={{ color: 'green' }}>
          ✅ Conectado
        </div>
      ) : (
        <button
          onClick={handleConnect}
          style={{
            padding: '10px 20px',
            backgroundColor: '#1f2937',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Conectar Google Ads
        </button>
      )}
    </div>
  );
}