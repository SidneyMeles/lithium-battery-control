// ============================================================================
// LITHIUM BATTERY CONTROL - CLOUDFLARE WORKER (ES MODULES) - COM AUTENTICAÇÃO
// ============================================================================

export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    try {
      // =====================================================================
      // AUTENTICAÇÃO - POST (Validar senha)
      // =====================================================================
      if (path === '/api/auth' && method === 'POST') {
        const body = await request.json()

        if (!body.password) {
          return new Response(
            JSON.stringify({ error: 'Senha é obrigatória', authenticated: false }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        try {
          // Buscar senha do banco D1
          const result = await env.DB.prepare(
            'SELECT password_hash FROM auth LIMIT 1'
          ).first()

          if (!result) {
            return new Response(
              JSON.stringify({ error: 'Configuração de autenticação não encontrada', authenticated: false }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Validar senha (comparação direta - em produção use bcrypt)
          const isValid = body.password === result.password_hash

          if (isValid) {
            return new Response(
              JSON.stringify({ authenticated: true, message: 'Autenticação bem-sucedida' }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          } else {
            return new Response(
              JSON.stringify({ authenticated: false, error: 'Senha incorreta' }),
              { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        } catch (error: any) {
          return new Response(
            JSON.stringify({ error: 'Erro ao validar autenticação', details: error.message, authenticated: false }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // =====================================================================
      // CORES - GET (Listar todas as cores)
      // =====================================================================
      if (path === '/api/colors' && method === 'GET') {
        const result = await env.DB.prepare(
          'SELECT id, hex_value FROM colors ORDER BY created_at DESC'
        ).all()

        return new Response(JSON.stringify(result.results || []), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // =====================================================================
      // CORES - POST (Criar nova cor)
      // =====================================================================
      if (path === '/api/colors' && method === 'POST') {
        const body = await request.json()

        if (!body.hex_value) {
          return new Response(
            JSON.stringify({ error: 'hex_value é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        try {
          const result = await env.DB.prepare(
            'INSERT INTO colors (hex_value) VALUES (?) RETURNING id, hex_value'
          ).bind(body.hex_value).first()

          return new Response(JSON.stringify(result), {
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Cor já cadastrada' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // =====================================================================
      // CORES - DELETE (Deletar cor)
      // =====================================================================
      if (path.match(/^\/api\/colors\/\d+$/) && method === 'DELETE') {
        const id = path.split('/').pop()
        
        const result = await env.DB.prepare(
          'DELETE FROM colors WHERE id = ?'
        ).bind(id).run()

        if (result.success) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        } else {
          return new Response(
            JSON.stringify({ error: 'Cor não encontrada' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // =====================================================================
      // MEDIÇÕES - GET (Listar todas as medições)
      // =====================================================================
      if (path === '/api/measurements' && method === 'GET') {
        const result = await env.DB.prepare(
          'SELECT * FROM measurements ORDER BY created_at DESC'
        ).all()

        return new Response(JSON.stringify(result.results || []), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // =====================================================================
      // MEDIÇÕES - POST (Criar nova medição)
      // =====================================================================
      if (path === '/api/measurements' && method === 'POST') {
        const body = await request.json()

        try {
          const result = await env.DB.prepare(
            `INSERT INTO measurements (code, date, voltage, internal_resistance, color, status, observation)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             RETURNING *`
          ).bind(
            body.code,
            body.date || new Date().toISOString().split('T')[0],
            body.voltage || null,
            body.internalResistance || null,
            body.color || null,
            body.status || 'Estoque',
            body.observation || null
          ).first()

          return new Response(JSON.stringify(result), {
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        } catch (error: any) {
          return new Response(
            JSON.stringify({ error: 'Erro ao criar medição', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // =====================================================================
      // MEDIÇÕES - PUT (Atualizar medição)
      // =====================================================================
      if (path.match(/^\/api\/measurements\/\d+$/) && method === 'PUT') {
        const id = path.split('/').pop()
        const body = await request.json()

        try {
          const result = await env.DB.prepare(
            `UPDATE measurements 
             SET code = ?, date = ?, voltage = ?, internal_resistance = ?, color = ?, status = ?, observation = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?
             RETURNING *`
          ).bind(
            body.code,
            body.date,
            body.voltage || null,
            body.internalResistance || null,
            body.color || null,
            body.status || 'Estoque',
            body.observation || null,
            id
          ).first()

          if (!result) {
            return new Response(
              JSON.stringify({ error: 'Medição não encontrada' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        } catch (error: any) {
          return new Response(
            JSON.stringify({ error: 'Erro ao atualizar medição', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // =====================================================================
      // MEDIÇÕES - DELETE (Deletar medição)
      // =====================================================================
      if (path.match(/^\/api\/measurements\/\d+$/) && method === 'DELETE') {
        const id = path.split('/').pop()

        try {
          const result = await env.DB.prepare(
            'DELETE FROM measurements WHERE id = ?'
          ).bind(id).run()

          if (result.success) {
            return new Response(JSON.stringify({ success: true }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          } else {
            return new Response(
              JSON.stringify({ error: 'Medição não encontrada' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        } catch (error: any) {
          return new Response(
            JSON.stringify({ error: 'Erro ao deletar medição', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // =====================================================================
      // TESTES - GET (Listar todos os testes)
      // =====================================================================
      if (path === '/api/tests' && method === 'GET') {
        const result = await env.DB.prepare(
          'SELECT * FROM tests ORDER BY created_at DESC'
        ).all()

        return new Response(JSON.stringify(result.results || []), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // =====================================================================
      // TESTES - POST (Criar novo teste)
      // =====================================================================
      if (path === '/api/tests' && method === 'POST') {
        const body = await request.json()

        try {
          const result = await env.DB.prepare(
            `INSERT INTO tests (code, date, initial_voltage, final_voltage, internal_resistance, capacity, color, status, observation)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING *`
          ).bind(
            body.code,
            body.date || new Date().toISOString().split('T')[0],
            body.initialVoltage || null,
            body.finalVoltage || null,
            body.internalResistance || null,
            body.capacity || null,
            body.color || null,
            body.status || 'Estoque',
            body.observation || null
          ).first()

          return new Response(JSON.stringify(result), {
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        } catch (error: any) {
          return new Response(
            JSON.stringify({ error: 'Erro ao criar teste', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // =====================================================================
      // TESTES - PUT (Atualizar teste)
      // =====================================================================
      if (path.match(/^\/api\/tests\/\d+$/) && method === 'PUT') {
        const id = path.split('/').pop()
        const body = await request.json()

        try {
          const result = await env.DB.prepare(
            `UPDATE tests 
             SET code = ?, date = ?, initial_voltage = ?, final_voltage = ?, internal_resistance = ?, capacity = ?, color = ?, status = ?, observation = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?
             RETURNING *`
          ).bind(
            body.code,
            body.date,
            body.initialVoltage || null,
            body.finalVoltage || null,
            body.internalResistance || null,
            body.capacity || null,
            body.color || null,
            body.status || 'Estoque',
            body.observation || null,
            id
          ).first()

          if (!result) {
            return new Response(
              JSON.stringify({ error: 'Teste não encontrado' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        } catch (error: any) {
          return new Response(
            JSON.stringify({ error: 'Erro ao atualizar teste', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // =====================================================================
      // TESTES - DELETE (Deletar teste)
      // =====================================================================
      if (path.match(/^\/api\/tests\/\d+$/) && method === 'DELETE') {
        const id = path.split('/').pop()

        try {
          const result = await env.DB.prepare(
            'DELETE FROM tests WHERE id = ?'
          ).bind(id).run()

          if (result.success) {
            return new Response(JSON.stringify({ success: true }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          } else {
            return new Response(
              JSON.stringify({ error: 'Teste não encontrado' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        } catch (error: any) {
          return new Response(
            JSON.stringify({ error: 'Erro ao deletar teste', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // =====================================================================
      // ROTA NÃO ENCONTRADA
      // =====================================================================
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (error: any) {
      console.error('Worker error:', error)
      return new Response(
        JSON.stringify({ error: 'Internal server error', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  },
}
