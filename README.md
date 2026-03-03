# aparecida-oxford-app

Aplicativo web estático para gestão de repertório de missas, com login local, filtro de músicas por categoria litúrgica e geração de arquivo PowerPoint.

## Stack
- Vite (multi-page)
- JavaScript (Vanilla)
- Tailwind CSS
- PptxGenJS

## Estrutura
- Código do app: `docs/`
- Dados JSON locais: `docs/public/data/`
- Build para deploy: `docs/dist/`

## Executar localmente
1. Acesse o diretório do app:
	- `cd docs`
2. Instale dependências:
	- `yarn install`
3. Inicie o ambiente de desenvolvimento:
	- `yarn dev`

## Build de produção
No diretório `docs/`:
- `yarn build`
- `yarn preview`

## Login de teste
- Usuário: `admin`
- Senha: `123456`

## Deploy (GitHub Pages)
O workflow em `.github/workflows/deploy-gh-pages.yml` já instala dependências em `docs/`, executa `yarn build` e publica `docs/dist`.