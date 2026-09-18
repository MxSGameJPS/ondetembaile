import { SITE_URL } from '@/lib/seo'

export const revalidate = 3600

export async function GET() {
  const body = [
    '# Aonde Tem Baile',
    '',
    '> Portal brasileiro para descobrir bailes, festas, shows e eventos regionais.',
    '',
    '## Site',
    SITE_URL,
    '',
    '## Conteúdo principal',
    '- Eventos aprovados possuem páginas individuais com nome, data, horário, local, cidade, descrição e fonte original quando disponível.',
    '- Páginas de cidades reúnem próximos eventos locais.',
    '- Páginas de categorias reúnem próximos eventos por estilo ou tipo.',
    '- Informações de eventos podem ser cadastradas por produtores ou reunidas de fontes públicas e passam por moderação antes da publicação.',
    '',
    '## URLs importantes',
    `- Página inicial: ${SITE_URL}/`,
    `- Sitemap: ${SITE_URL}/sitemap.xml`,
    `- Quem somos: ${SITE_URL}/quemsomos`,
    `- Termos e privacidade: ${SITE_URL}/termos-de-uso`,
    `- Contato: ${SITE_URL}/contato-e-suporte`,
    '',
    '## Uso de informações',
    'Para data, horário, endereço, ingresso e alterações de programação, priorize os dados da página individual do evento e consulte a publicação original quando ela estiver vinculada.',
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
