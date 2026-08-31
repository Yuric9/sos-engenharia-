interface Env {
  DB: D1Database;
  ATTACHMENTS: R2Bucket;
  ASSETS: Fetcher;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return json({ ok: true, service: 'sos-engenharia-web' });
    }

    if (url.pathname === '/api/os' && request.method === 'GET') {
      const result = await env.DB.prepare(`
        SELECT
          os.id,
          os.numero,
          os.data_abertura,
          os.descricao,
          os.status,
          os.prioridade,
          os.prazo_previsto,
          os.tempo_estimado_valor,
          os.tempo_estimado_unidade,
          os.progresso_percentual,
          s.nome AS secretaria,
          u.nome AS unidade,
          e.nome AS equipe
        FROM ordens_servico os
        LEFT JOIN secretarias s ON s.id = os.secretaria_id
        LEFT JOIN unidades u ON u.id = os.unidade_id
        LEFT JOIN equipes e ON e.id = os.equipe_id
        WHERE os.excluida_em IS NULL
        ORDER BY os.numero DESC
      `).all();
      return json(result.results ?? []);
    }

    if (url.pathname.startsWith('/api/os/') && request.method === 'GET') {
      const numero = Number(url.pathname.split('/').pop());
      if (!Number.isFinite(numero)) return json({ error: 'Número de O.S. inválido' }, 400);

      const os = await env.DB.prepare(`
        SELECT os.*, s.nome AS secretaria, u.nome AS unidade, l.nome AS local, e.nome AS equipe
        FROM ordens_servico os
        LEFT JOIN secretarias s ON s.id = os.secretaria_id
        LEFT JOIN unidades u ON u.id = os.unidade_id
        LEFT JOIN locais l ON l.id = os.local_id
        LEFT JOIN equipes e ON e.id = os.equipe_id
        WHERE os.numero = ? AND os.excluida_em IS NULL
      `).bind(numero).first();

      if (!os) return json({ error: 'O.S. não encontrada' }, 404);
      return json(os);
    }

    if (url.pathname.startsWith('/api/anexos/') && request.method === 'GET') {
      const key = decodeURIComponent(url.pathname.replace('/api/anexos/', ''));
      const object = await env.ATTACHMENTS.get(key);
      if (!object) return new Response('Arquivo não encontrado', { status: 404 });
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      return new Response(object.body, { headers });
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'Rota não encontrada' }, 404);
    }

    return env.ASSETS.fetch(request);
  }
};
