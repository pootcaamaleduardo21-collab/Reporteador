'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function GoogleAdsPage() {
  const [accounts, setAccounts] = useState([]);
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
          .from('google_ads_tokens_v2')
          .select('customer_id, customer_display_name, added_at')
          .eq('user_id', session.user.id);

        if (data && data.length > 0) {
          setAccounts(data);
        }
      }
    } catch (error) {
      console.log('Error checking connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/google-ads/callback`;
    const scopes = [
      'https://www.googleapis.com/auth/adwords',
      'openid',
      'email',
      'profile',
    ].join(' ');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `access_type=offline&` +
      `prompt=consent`;

    window.location.href = authUrl;
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888', fontFamily: 'monospace', fontSize: '12px' }}>
        Cargando...
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: 'var(--text)' }}>
        G Google Ads
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--text4)', marginBottom: '32px' }}>
        Conecta tus cuentas de Google Ads para ver campañas, métricas y rendimiento en tiempo real
      </p>

      {accounts.length > 0 ? (
        <div>
          <div style={{
            background: 'rgba(99,102,241,.08)',
            border: '1px solid rgba(99,102,241,.2)',
            borderRadius: '9px',
            padding: '10px 14px',
            marginBottom: '24px',
            fontSize: '11px',
            color: '#a5b4fc',
            fontFamily: 'monospace'
          }}>
            ✓ Tienes {accounts.length} cuenta(s) de Google Ads conectada(s)
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '12px',
            marginBottom: '24px'
          }}>
            {accounts.map((acc, i) => (
              <div key={i} style={{
                background: '#17171d',
                border: '1px solid rgba(99,102,241,.2)',
                borderRadius: '9px',
                padding: '16px',
              }}>
                <div style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace', marginBottom: '4px' }}>
                  Customer ID
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
                  {acc.customer_display_name || acc.customer_id}
                </div>
                <div style={{ fontSize: '10px', color: '#555', fontFamily: 'monospace' }}>
                  {acc.customer_id}
                </div>
                <div style={{ fontSize: '9px', color: '#333', marginTop: '8px' }}>
                  Conectado: {new Date(acc.added_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleConnect}
            style={{
              padding: '10px 24px',
              background: 'rgba(99,102,241,.12)',
              border: '1px solid rgba(99,102,241,.25)',
              color: '#a5b4fc',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: 'inherit'
            }}
          >
            Agregar otra cuenta
          </button>
        </div>
      ) : (
        <div style={{
          background: '#17171d',
          border: '1px solid #2a2a35',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', fontWeight: 'bold' }}>○</div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>
            No hay cuentas conectadas
          </h2>
          <p style={{ fontSize: '13px', color: '#555', marginBottom: '24px' }}>
            Haz clic en el botón para conectar tu primera cuenta de Google Ads
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
              fontWeight: '700',
              fontFamily: 'inherit'
            }}
          >
            Conectar Google Ads
          </button>
        </div>
      )}

      {/* Requisitos */}
      <div style={{
        background: 'rgba(248,113,113,.05)',
        border: '1px solid rgba(248,113,113,.15)',
        borderRadius: '9px',
        padding: '16px',
        marginTop: '32px',
        fontSize: '11px',
        color: '#f87171',
      }}>
        <div style={{ fontWeight: '700', marginBottom: '8px' }}>Requisitos:</div>
        <ul style={{ margin: '0 0 0 20px', color: '#888' }}>
          <li>Cuenta de Google Ads activa</li>
          <li>Google Ads Developer Token configurado</li>
          <li>Permisos de acceso a Google Ads API</li>
        </ul>
      </div>
    </div>
  );
}