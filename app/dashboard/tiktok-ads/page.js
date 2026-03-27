'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function TikTokAdsPage() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [tokenData, setTokenData] = useState(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user);

      if (session?.user) {
        const { data } = await supabase
          .from('tiktok_ads_tokens')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (data) {
          setConnected(true);
          setTokenData(data);
        }
      }
    } catch (error) {
      console.log('No connection yet');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Placeholder for TikTok OAuth connection
    alert('Conectar TikTok Ads - Próximamente');
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
        <div>Cargando...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: 'var(--text)' }}>
          ⟲ TikTok Ads
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text4)', marginBottom: '32px' }}>
          Conecta tu cuenta de TikTok Ads para ver tus campañas, métricas y rendimiento
        </p>

        <div style={{
          background: 'var(--sidebar)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center'
        }}>
          {connected ? (
            <div>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#6ee7b7', marginBottom: '8px' }}>
                Conectado
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text4)', marginBottom: '24px' }}>
                Tu cuenta de TikTok Ads está conectada correctamente.
              </p>
              <div style={{
                background: 'rgba(110,231,183,.08)',
                border: '1px solid rgba(110,231,183,.2)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#6ee7b7'
              }}>
                ID: {tokenData?.advertiser_id}
              </div>
              <button
                onClick={handleConnect}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                Reconectar
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>○</div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>
                No conectado
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text4)', marginBottom: '24px' }}>
                Haz clic en el botón para conectar tu cuenta de TikTok Ads
              </p>
              <button
                onClick={handleConnect}
                style={{
                  padding: '12px 32px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '700'
                }}
              >
                Conectar TikTok Ads
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
