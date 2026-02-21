# DYHouse - Em Breve

Monorepo consolidado com uma única landing real em `/apps/web` e backend Firebase em `/apps/firebase-functions`.

## Estrutura final

- `/apps/web` -> landing única (HTML/CSS/JS estático)
- `/apps/firebase-functions` -> Cloud Function `submitWaitlist` + Firestore + criptografia
- `/.github/workflows/pages.yml` -> deploy da landing no GitHub Pages
- `/firebase.json` -> configuração do Firebase

## 1) Preview local da landing

### Opção A (abrir direto)

```bash
open apps/web/index.html
```

### Opção B (servidor local recomendado)

```bash
npm i
npm run serve:web
```

Depois acesse: `http://localhost:8080`

## 2) Endpoint configurável (sem build)

Arquivo: `/apps/web/config.js`

```js
window.DYHOUSE_WAITLIST_ENDPOINT = "http://localhost:5001/<project-id>/us-central1/submitWaitlist";
```

Para produção (Pages/domínio), você pode:
1. Editar esse mesmo `config.js`, ou
2. Criar `config-prod.js` e trocar a referência no `index.html`.

Sem Vite e sem etapa de build.

## 3) Setup Firebase

1. Crie um projeto no Firebase.
2. Habilite Firestore.
3. Instale a CLI e faça login:

```bash
npm i -g firebase-tools
firebase login
```

4. Ajuste o projeto em `/.firebaserc`.
5. Defina `WAITLIST_ENC_KEY` (base64 de 32 bytes).
6. Faça deploy da function:

```bash
npm run deploy:functions
```

7. Copie a URL pública de `submitWaitlist` e atualize `/apps/web/config.js`.

### CORS

A function já aceita:
- `http://localhost:<port>`
- `https://<usuario>.github.io`

Para liberar mais origens, use `WAITLIST_ALLOWED_ORIGINS` (lista separada por vírgula).

## 4) Deploy no GitHub Pages

Workflow: `/.github/workflows/pages.yml`

1. Ative GitHub Pages com fonte `GitHub Actions`.
2. Faça push na `main`.
3. O workflow publica diretamente o conteúdo de `/apps/web`.

## 5) Regra do formulário (frontend)

- `name` obrigatório (mín. 2)
- obrigatório informar `email` ou `phone` (pode ambos)
- `email` válido se preenchido
- `phone` normalizado para dígitos e mínimo 8 dígitos
- honeypot invisível `website`
- loading no botão
- sucesso: `Cadastro confirmado! Vamos avisar em primeira mão.`
- duplicidade:
  - `EMAIL_EXISTS` -> `Esse e-mail já está cadastrado.`
  - `PHONE_EXISTS` -> `Esse telefone já está cadastrado.`
