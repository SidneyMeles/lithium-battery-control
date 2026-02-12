# Guia de Implementação - Autenticação com D1

## Problema Identificado

O worker atual **não possui endpoint de autenticação**. A senha está sendo validada localmente no frontend (hardcoded no JavaScript), o que é inseguro pois qualquer pessoa pode ver o código fonte.

## Solução Implementada

Criei uma solução completa que move a autenticação para o backend (worker + D1):

### 1. Nova Tabela no Banco D1

**Arquivo:** `migrations/0002_create_auth_table.sql`

Esta migração cria:
- Tabela `auth` para armazenar a senha
- Insere a senha padrão `bateria123`

### 2. Worker Atualizado

**Arquivo:** `src/index-updated.ts`

Adicionei o endpoint de autenticação:
- **POST** `/api/auth` - Valida a senha enviada pelo frontend

**Funcionamento:**
1. Frontend envia: `{ "password": "bateria123" }`
2. Worker busca a senha do banco D1
3. Compara as senhas
4. Retorna: `{ "authenticated": true/false }`

## Passos para Implementar

### Passo 1: Aplicar a Migração no D1

Execute no terminal (na pasta do projeto):

```bash
npx wrangler d1 migrations apply lithium-battery-control --remote
```

Isso criará a tabela `auth` e inserirá a senha no banco.

### Passo 2: Atualizar o Worker

**Opção A - Substituir o arquivo atual:**
```bash
cp src/index-updated.ts src/index.ts
```

**Opção B - Copiar manualmente:**
1. Abra `src/index-updated.ts`
2. Copie todo o conteúdo
3. Cole no editor do Worker na Cloudflare Dashboard

### Passo 3: Deploy do Worker

```bash
npx wrangler deploy
```

### Passo 4: Atualizar o Frontend

No código do frontend (React/Vue/etc), substitua a validação local por uma chamada à API:

**ANTES (validação local - INSEGURA):**
```javascript
const handleLogin = (password) => {
  if (password === 'bateria123') {
    setAuthenticated(true)
  }
}
```

**DEPOIS (validação via API - SEGURA):**
```javascript
const handleLogin = async (password) => {
  try {
    const response = await fetch('https://control-batery.pages.dev/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    
    const data = await response.json()
    
    if (data.authenticated) {
      setAuthenticated(true)
      localStorage.setItem('authenticated', 'true')
    } else {
      alert('Senha incorreta')
    }
  } catch (error) {
    console.error('Erro ao autenticar:', error)
    alert('Erro ao conectar com o servidor')
  }
}
```

## Testando a API

Você pode testar o endpoint com curl:

```bash
# Teste com senha correta
curl -X POST https://control-batery.pages.dev/api/auth \
  -H "Content-Type: application/json" \
  -d '{"password":"bateria123"}'

# Resposta esperada:
# {"authenticated":true,"message":"Autenticação bem-sucedida"}

# Teste com senha incorreta
curl -X POST https://control-batery.pages.dev/api/auth \
  -H "Content-Type: application/json" \
  -d '{"password":"senhaerrada"}'

# Resposta esperada:
# {"authenticated":false,"error":"Senha incorreta"}
```

## Melhorias Futuras (Recomendadas)

### 1. Usar Hash de Senha (bcrypt)

Atualmente a senha está em texto plano no banco. Para produção, use bcrypt:

```typescript
// Instalar: npm install bcryptjs
import bcrypt from 'bcryptjs'

// Ao criar/atualizar senha:
const hashedPassword = await bcrypt.hash('bateria123', 10)

// Ao validar:
const isValid = await bcrypt.compare(body.password, result.password_hash)
```

### 2. Implementar JWT para Sessões

Em vez de apenas validar a senha, retorne um token JWT:

```typescript
// Instalar: npm install jsonwebtoken
import jwt from 'jsonwebtoken'

// Após validar senha:
const token = jwt.sign({ authenticated: true }, env.JWT_SECRET, { expiresIn: '24h' })
return { authenticated: true, token }
```

### 3. Adicionar Múltiplos Usuários

Expanda a tabela `auth` para suportar múltiplos usuários:

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Rate Limiting

Adicione proteção contra força bruta limitando tentativas de login.

## Estrutura do Banco D1

Após aplicar as migrações, seu banco terá:

```
lithium-battery-control (D1 Database)
├── comments (tabela de exemplo)
├── colors (cores das baterias)
├── measurements (medições)
├── tests (testes)
└── auth (autenticação) ← NOVA TABELA
    └── password_hash: "bateria123"
```

## Verificando se Funcionou

1. Aplique a migração
2. Deploy do worker
3. Teste o endpoint `/api/auth`
4. Se retornar `{"authenticated":true}`, está funcionando!
5. Atualize o frontend para usar a API

## Suporte

Se tiver problemas:
1. Verifique os logs do Worker: `npx wrangler tail`
2. Confirme que a migração foi aplicada: `npx wrangler d1 execute lithium-battery-control --command "SELECT * FROM auth"`
3. Teste o endpoint diretamente com curl

---

**Importante:** Após implementar, remova qualquer senha hardcoded do código frontend!
