import { supabase } from '../lib/supabase'

export default function Auth() {
  const handleSocialLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) throw error
    } catch (error) {
      alert('소셜 로그인 오류: ' + error.message)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#050508', color: '#fff' }}>
      <div style={{ padding: '40px', background: '#14141c', borderRadius: '20px', border: '1px solid #2e2e3e', width: '380px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }}>
        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '8px', letterSpacing: '1px' }}>NOIR STUDIO</h2>
        <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginBottom: '28px' }}>구글 계정으로 로그인하여 크리에이티브 서비스를 시작하세요.</p>
        
        {/* 구글 소셜 로그인 단일 버튼 */}
        <button
          type="button"
          onClick={handleSocialLogin}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            border: '1px solid #444',
            background: '#fff',
            color: '#000',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'transform 0.2s'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.19v3.14C3.15 21.36 7.22 24 12 24z"/>
            <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.62H1.19C.43 8.15 0 9.89 0 11.75s.43 3.6 1.19 5.13l4.08-3.14z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.15 2.64 1.19 6.62l4.08 3.14c.95-2.85 3.6-4.96 6.73-4.96z"/>
          </svg>
          Google 계정으로 계속하기
        </button>
      </div>
    </div>
  )
}

