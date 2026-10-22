// Despertador da ETI LEITURA (Cloudflare Worker, plano grátis).
// O Render Free adormece após 15 min sem acesso; este Worker chama /api/health a cada 10 min
// (Cron Trigger "*/10 * * * *") para o servidor continuar enviando notificações e o lembrete das 19h.
// Endereço padrão: https://eti-leitura.onrender.com (para trocar, crie a variável SITE_URL no Worker).
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(ping(env));
  },
  // Abrir o endereço do Worker no navegador mostra se o site respondeu.
  async fetch(request, env) {
    const result = await ping(env);
    return Response.json(result, { status: result.ok ? 200 : 502 });
  }
};

async function ping(env) {
  const started = Date.now();
  try {
    const site = env.SITE_URL || 'https://eti-leitura.onrender.com';
    const response = await fetch(`${site}/api/health`, { headers: { 'User-Agent': 'eti-despertador' } });
    return { ok: response.ok, status: response.status, ms: Date.now() - started };
  } catch (error) {
    return { ok: false, error: String(error), ms: Date.now() - started };
  }
}
