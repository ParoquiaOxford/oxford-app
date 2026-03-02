# Oxford App (Frontend)

Frontend React + Vite publicado no GitHub Pages.

## Desenvolvimento local

No diretório `docs/`:

```bash
npm install
npm run dev
```

Por padrão, em desenvolvimento, a API é `http://localhost:4000/api`.

Opcionalmente, você pode definir `docs/.env.development`:

- `VITE_API_BASE_URL_DEV=http://localhost:4000/api`

## Produção (GitHub Pages)

O frontend **não** conecta no MongoDB diretamente. Em produção ele precisa de um backend publicado (API Node/Express) que faz a conexão com o MongoDB.

Defina a variável abaixo no build de produção:

- `VITE_API_BASE_URL_PRD=https://SEU_BACKEND_PUBLICO/api`

Compatibilidade (legado):

- `VITE_API_BASE_URL` também é aceito como fallback.

Exemplo:

- `https://seu-backend.onrender.com/api`
- `https://api.seudominio.com/api`

Não use a URL do GitHub Pages (ex.: `https://paroquiaoxford.github.io/oxford-app/api`), pois o Pages hospeda apenas arquivos estáticos e não executa API Node/Express.

Sem essa variável, o login exibirá erro de API não configurada para produção.

No GitHub Actions, configure em **Settings > Secrets and variables > Actions**:

- `VITE_API_BASE_URL_PRD` (recomendado)

## Build

```bash
npm run build
```

O `postbuild` gera `dist/404.html` para fallback de rotas da SPA no GitHub Pages.

## Deploy

O deploy é feito por GitHub Actions em `.github/workflows/deploy-gh-pages.yml`.
