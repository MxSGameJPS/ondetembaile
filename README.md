<div align="center">

<img src="./public/logos/Logo_03_Horizontal_Transparente.png" alt="Aonde Tem Baile" width="420" />

# Aonde Tem Baile

**Plataforma para descobrir, divulgar e organizar bailes, festas, shows e eventos culturais.**

[![Site](https://img.shields.io/badge/site-aondetembaile.com.br-ff6a00?style=for-the-badge&logo=googlechrome&logoColor=white)](https://aondetembaile.com.br)

</div>

---

## Tecnologias

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.3.5-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.2.8-61DAFB?style=for-the-badge&logo=react&logoColor=000000)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-7EBC6F?style=for-the-badge&logo=openstreetmap&logoColor=white)
![Apify](https://img.shields.io/badge/Apify-97D700?style=for-the-badge&logo=apify&logoColor=111111)
![Groq](https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logoColor=white)
![Brave Search](https://img.shields.io/badge/Brave_Search-FF2000?style=for-the-badge&logo=brave&logoColor=white)
![Resend](https://img.shields.io/badge/Resend-000000?style=for-the-badge&logo=resend&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)

</div>

---

## Sobre o projeto

O **Aonde Tem Baile** é uma plataforma digital criada para facilitar a descoberta e divulgação de eventos.

O projeto reúne eventos cadastrados por produtores e eventos encontrados em fontes públicas, sempre com uma camada de revisão administrativa antes da publicação quando necessário.

Além da busca tradicional por cidade, a plataforma possui uma busca geográfica capaz de considerar eventos próximos à cidade pesquisada, tornando a descoberta mais útil para regiões formadas por municípios vizinhos.

### Principais objetivos

- centralizar bailes, festas, shows e eventos culturais;
- facilitar a descoberta de eventos por cidade e proximidade;
- permitir que produtores cadastrem seus próprios eventos;
- oferecer um painel administrativo para revisão e publicação;
- descobrir eventos em fontes públicas para alimentar a plataforma;
- manter a origem do conteúdo rastreável por meio da fonte original.

---

## Funcionalidades

### Para visitantes

- listagem pública de eventos aprovados;
- pesquisa por cidade;
- busca geográfica em um raio de aproximadamente **20 km**;
- filtros por categoria;
- filtros de período;
- suporte a eventos de um único dia ou vários dias;
- página individual de evento;
- mapa e localização do evento;
- link para a fonte original;
- compartilhamento em redes sociais;
- contato via WhatsApp quando disponível;
- interface responsiva para desktop e dispositivos móveis;
- hero com carrossel visual.

### Para produtores

- autenticação com Supabase;
- cadastro de eventos;
- upload/URL de imagem;
- endereço, cidade e localização;
- data e hora de início;
- data e hora de término opcional;
- categoria;
- WhatsApp;
- links de Facebook e Instagram;
- envio do evento para revisão administrativa;
- notificações por e-mail sobre o status do evento.

> O campo de valor do ingresso permanece no modelo de dados para uso futuro, mas atualmente não é exibido na interface pública.

### Para administradores

- painel administrativo protegido por perfil;
- papéis de `admin` e `superadmin`;
- aprovação e recusa de eventos;
- edição de candidatos antes da publicação;
- gerenciamento de categorias;
- gerenciamento de usuários;
- visualização de todos os eventos;
- fila de eventos descobertos automaticamente;
- rastreamento da fonte original do evento.

---

## Descoberta de eventos

O projeto possui um pipeline de descoberta para ajudar a alimentar a plataforma enquanto a base de produtores cresce.

### Facebook

A descoberta no Facebook utiliza a **Apify**.

Fluxo atual:

```text
Apify Facebook Posts Search
        ↓
posts públicos encontrados
        ↓
fila de revisão administrativa
        ↓
admin confere e completa os dados
        ↓
aprovação e publicação
```

O Facebook não depende de IA para decidir automaticamente se um post deve ser publicado. Os resultados coletados são enviados para revisão humana.

O projeto também controla internamente o consumo da Apify para evitar gastos acima do orçamento configurado para o plano utilizado.

### Web, Reddit, Sympla e Rolê Agora

A descoberta automática dessas fontes utiliza **Brave Search** para localizar URLs públicas e snippets.

O backend aplica validações para reduzir falsos positivos, incluindo:

- domínio permitido;
- formato da URL;
- páginas individuais de evento;
- período do evento;
- data e horário;
- deduplicação por URL;
- bloqueio de páginas de guia/listagem em fontes específicas.

### Groq

A Groq é utilizada em fluxos assistidos de interpretação/classificação quando necessário.

A pesquisa web automática não depende do Web Search interno da Groq, evitando payloads excessivos e erros `413` observados durante o desenvolvimento.

---

## Busca por proximidade

Ao pesquisar uma cidade, a plataforma tenta resolver suas coordenadas geográficas e calcula a distância até os eventos disponíveis.

Exemplo:

```text
Busca: Ivoti / RS
Raio: 20 km

Ivoti
├── eventos de Ivoti
├── eventos de Dois Irmãos dentro do raio
└── outros municípios próximos dentro do limite
```

Quando um evento possui latitude e longitude próprias, essas coordenadas são utilizadas.

Para eventos antigos sem coordenadas salvas, o sistema pode utilizar o centro geográfico da cidade como fallback.

O cálculo de distância utiliza a fórmula de **Haversine**.

---

## Geocodificação e mapas

A localização dos eventos utiliza:

- **OpenStreetMap / Nominatim** para geocodificação;
- **Leaflet/OpenStreetMap** para mapas quando há coordenadas confiáveis;
- fallback para **Google Maps por endereço textual** quando necessário.

O backend tenta salvar latitude e longitude automaticamente durante o cadastro ou publicação do evento.

Coordenadas inválidas ou valores de fallback genéricos não são utilizados como localização real do evento.

---

## Arquitetura

```text
┌──────────────────────────────────────┐
│              Next.js                 │
│         App Router + React           │
└──────────────────┬───────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
  Interface pública       Painel admin
        │                     │
        └──────────┬──────────┘
                   ▼
            Server Actions
                   │
        ┌──────────┼───────────────┐
        │          │               │
        ▼          ▼               ▼
    Supabase    APIs externas    Resend
        │          │
        │      ┌───┼──────────┐
        │      │   │          │
        │    Apify Brave     Groq
        │
        ▼
 Auth + Database
```

---

## Stack técnica

| Área | Tecnologia |
|---|---|
| Framework | Next.js 16 |
| UI | React 19 |
| Linguagem | TypeScript |
| Runtime | Node.js 22 |
| Banco de dados | Supabase / PostgreSQL |
| Autenticação | Supabase Auth |
| SSR Supabase | `@supabase/ssr` |
| Mapas | Leaflet + OpenStreetMap |
| Geocodificação | Nominatim |
| Descoberta web | Brave Search API |
| Facebook | Apify |
| IA | Groq |
| E-mails | Resend |
| Ícones | Lucide React |
| Deploy | Netlify |
| Qualidade | ESLint |

---

## Estrutura principal

```text
ondetembaile/
├── app/
│   ├── actions/                 # Server Actions
│   ├── admin/                   # Painel administrativo
│   ├── api/                     # Rotas HTTP internas
│   ├── evento/[id]/             # Página individual de evento
│   ├── produtor/                # Área do produtor
│   ├── page.tsx                 # Home pública
│   └── layout.tsx
│
├── components/
│   ├── admin/                   # Componentes administrativos
│   ├── EventCard.tsx
│   ├── EventMap.tsx
│   └── SocialShare.tsx
│
├── lib/
│   ├── apify/                   # Integração Facebook/Apify
│   ├── brave/                   # Brave Search API
│   ├── event-discovery/         # Pipeline de descoberta
│   ├── geocoding/               # Geocodificação
│   ├── groq/                    # Cliente Groq
│   ├── resend/                  # E-mails
│   └── supabase/                # Clientes Supabase
│
├── public/
│   ├── img_hero/
│   └── logos/
│
├── supabase/
│   ├── event_discovery_setup.sql
│   └── event_moderation_setup.sql
│
├── netlify.toml
├── package.json
└── tsconfig.json
```

---

## Variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY= # somente servidor; nunca use NEXT_PUBLIC_

# E-mail
RESEND_API_KEY=

# Brave Search
BRAVE_API_KEY=

# Groq
API_GROQ_KEY=

# Apify
API_KEY_APIFY=
APIFY_USER_ID=
```

A aplicação também aceita `GROQ_API_KEY` como fallback para a chave da Groq.

> Nunca envie o arquivo `.env.local` ou chaves privadas para o repositório.

---

## Banco de dados

O projeto utiliza **Supabase/PostgreSQL**.

Os scripts SQL versionados ficam em:

```text
supabase/event_discovery_setup.sql
supabase/event_moderation_setup.sql
```

O primeiro contém estruturas do fluxo de descoberta de eventos. O segundo adiciona o estado de recusa permanente utilizado pela moderação.

Antes de publicar esta versão, execute `supabase/event_moderation_setup.sql` no projeto Supabase correto. Sempre revise o SQL antes de executar em produção.

---

## Executando localmente

### Pré-requisitos

- Node.js 22;
- npm;
- projeto Supabase configurado;
- arquivo `.env.local` preenchido.

### Instalação

```bash
git clone https://github.com/MxSGameJPS/ondetembaile.git
cd ondetembaile
npm install
```

### Desenvolvimento

```bash
npm run dev
```

Acesse:

```text
http://localhost:3000
```

### Build de produção

```bash
npm run build
npm run start
```

### Lint

```bash
npm run lint
```

---

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | inicia o ambiente de desenvolvimento |
| `npm run build` | gera o build otimizado de produção |
| `npm run start` | inicia o servidor de produção |
| `npm run lint` | executa o ESLint |

---

## Deploy

O projeto está preparado para deploy na **Netlify** usando o plugin oficial do Next.js.

Configuração atual:

```toml
[build]
  command = "rm -rf .next && npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "22"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

A remoção de `.next` antes do build evita inconsistências de cache do Turbopack entre deploys.

---

## Fluxo de publicação de eventos

```text
Produtor / Descoberta
        ↓
Evento ou candidato
        ↓
Painel administrativo
        ↓
Revisão
   ┌────┴────┐
   │         │
 Aprovar   Recusar
   │        ├── normal → produtor pode corrigir e reenviar
   │        └── permanente → edição do produtor bloqueada
   ▼
Evento publicado
   │
   ▼
Home + busca + mapa + compartilhamento
```

---

## Segurança

Alguns cuidados adotados no projeto:

- ações administrativas verificam autenticação e papel do usuário;
- chaves de APIs externas são usadas somente no servidor;
- `SUPABASE_SERVICE_ROLE_KEY` é usada somente no servidor para localizar o e-mail do produtor no Supabase Auth;
- variáveis públicas do Supabase utilizam o prefixo `NEXT_PUBLIC_`;
- candidatos externos passam por revisão administrativa;
- URLs e dados de fontes públicas passam por normalização e validação;
- RLS do Supabase é utilizado nas estruturas configuradas para descoberta.

---

## Site

🌐 **https://aondetembaile.com.br**

---

<div align="center">

Desenvolvido para aproximar pessoas dos eventos que acontecem perto delas.

**Aonde Tem Baile — A Diversão começa aqui.**

</div>
