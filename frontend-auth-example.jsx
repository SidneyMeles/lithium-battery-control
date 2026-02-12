// ============================================================================
// EXEMPLO DE COMPONENTE DE LOGIN PARA O FRONTEND
// ============================================================================
// Este é um exemplo de como implementar a autenticação via API no frontend
// Substitua a validação local pela chamada ao endpoint /api/auth
// ============================================================================

import React, { useState } from 'react'

function LoginComponent() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Chamada ao endpoint de autenticação
      const response = await fetch('https://control-batery.pages.dev/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (response.ok && data.authenticated) {
        // Autenticação bem-sucedida
        localStorage.setItem('authenticated', 'true')
        localStorage.setItem('authTime', new Date().getTime().toString())
        
        // Redirecionar ou atualizar estado
        window.location.reload() // ou use seu gerenciador de estado
      } else {
        // Senha incorreta
        setError(data.error || 'Senha incorreta')
      }
    } catch (err) {
      console.error('Erro ao autenticar:', err)
      setError('Erro ao conectar com o servidor. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-icon">🔒</div>
        <h1>LITHIUM BATTERY CONTROL</h1>
        <p>Acesso Protegido</p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="password">SENHA</label>
            <input
              id="password"
              type="password"
              placeholder="Insira a senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Verificando...' : 'Acessar'}
          </button>
        </form>

        <p className="info-text">
          Senha armazenada de forma segura no banco de dados
        </p>
      </div>
    </div>
  )
}

export default LoginComponent

// ============================================================================
// VERIFICAÇÃO DE AUTENTICAÇÃO EM OUTRAS PÁGINAS
// ============================================================================

// Hook personalizado para verificar autenticação
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  React.useEffect(() => {
    const authenticated = localStorage.getItem('authenticated')
    const authTime = localStorage.getItem('authTime')

    if (authenticated === 'true' && authTime) {
      // Verificar se a autenticação não expirou (24 horas)
      const now = new Date().getTime()
      const elapsed = now - parseInt(authTime)
      const hours24 = 24 * 60 * 60 * 1000

      if (elapsed < hours24) {
        setIsAuthenticated(true)
      } else {
        // Sessão expirada
        localStorage.removeItem('authenticated')
        localStorage.removeItem('authTime')
        setIsAuthenticated(false)
      }
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('authenticated')
    localStorage.removeItem('authTime')
    setIsAuthenticated(false)
    window.location.reload()
  }

  return { isAuthenticated, logout }
}

// ============================================================================
// COMPONENTE PRINCIPAL COM PROTEÇÃO
// ============================================================================

function App() {
  const { isAuthenticated, logout } = useAuth()

  if (!isAuthenticated) {
    return <LoginComponent />
  }

  return (
    <div className="app">
      <header>
        <h1>Controle de Bateria</h1>
        <button onClick={logout}>Sair</button>
      </header>
      
      {/* Seu conteúdo principal aqui */}
      <main>
        {/* Componentes do sistema */}
      </main>
    </div>
  )
}

// ============================================================================
// ALTERNATIVA: VALIDAÇÃO COM REVALIDAÇÃO PERIÓDICA
// ============================================================================

// Se você quiser revalidar a autenticação periodicamente:
export function useAuthWithRevalidation() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const validateAuth = async () => {
    const authenticated = localStorage.getItem('authenticated')
    
    if (authenticated !== 'true') {
      setIsAuthenticated(false)
      return
    }

    // Opcional: fazer uma chamada à API para verificar se ainda está válido
    // Por exemplo, um endpoint GET /api/auth/verify
    setIsAuthenticated(true)
  }

  React.useEffect(() => {
    validateAuth()
    
    // Revalidar a cada 5 minutos
    const interval = setInterval(validateAuth, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  return { isAuthenticated }
}
