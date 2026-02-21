# DYHouse - Em Breve

Projeto com duas versões da landing e backend Firebase para captação de waitlist.

## 1) Preview visual imediato (`/static`)

Use a versão estática para validar visual e UX rapidamente.

### Rodar

```bash
# opção 1
open static/index.html

# opção 2
npx serve static
```

Arquivos:
- `/static/index.html`
- `/static/styles.css`
- `/static/app.js`

## 2) Web pronta para GitHub Pages (`/apps/web`)

Versão em Vite vanilla, mantendo HTML/CSS/JS simples.

### Rodar local

```bash
npm i
npm run dev --workspace apps/web
```

### Build

```bash
npm run build --workspace apps/web
```

### Variável de ambiente

Crie `apps/web/.env` com:

```bash
VITE_WAITLIST_ENDPOINT=https://us-central1-SEU_PROJETO.cloudfunctions.net/submitWaitlist
```

## 3) Firebase (Firestore + Cloud Function)

Código em `/apps/firebase-functions`.

### Passo a passo

1. Crie um projeto no Firebase Console.
2. Habilite Firestore.
3. Instale Firebase CLI e faça login:
```bash
npm i -g firebase-tools
firebase login
```
4. Ajuste o projeto no arquivo `/.firebaserc` (troque `SEU_PROJECT_ID`).
5. Gere a chave de criptografia (32 bytes base64), por exemplo:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
6. Defina `WAITLIST_ENC_KEY` no ambiente das Functions (Secret Manager ou env vars do deploy).
7. Deploy:
```bash
npm run deploy --workspace apps/firebase-functions
```
8. Copie a URL pública da function `submitWaitlist` e coloque em `VITE_WAITLIST_ENDPOINT`.

## 4) GitHub Pages deploy

Workflow: `/.github/workflows/deploy-pages.yml`.

### Configuração necessária no repositório GitHub

1. Ative GitHub Pages com fonte `GitHub Actions`.
2. Configure `VITE_WAITLIST_ENDPOINT` em `Repository Variables` (ou `Secrets`).
3. Faça push na `main` para disparar build e deploy.

## 5) Domínio customizado (instrução geral)

1. Adicione o domínio nas configurações do GitHub Pages.
2. Crie/ajuste os registros DNS (`CNAME`/`A` ou `ALIAS`) conforme o provedor.
3. Aguarde propagação e valide HTTPS automático do GitHub Pages.
