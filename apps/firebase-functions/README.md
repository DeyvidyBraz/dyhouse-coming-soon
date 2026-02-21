# Firebase Functions (submit waitlist)

## O que existe aqui

- `submitWaitlist` (HTTP Cloud Function)
- Validação: nome obrigatório + e-mail ou telefone obrigatório
- Deduplicação por hash (`sha256`) de e-mail/telefone normalizados
- Criptografia server-side (`AES-256-GCM`) para `name`, `email` e `phone`
- Helper de decrypt em `src/crypto.js` para uso futuro em painel admin

## Respostas da API

- `201` -> `{ ok: true }`
- `409` -> `{ ok: false, code: "EMAIL_EXISTS" }` ou `{ ok: false, code: "PHONE_EXISTS" }`
- `400` -> `{ ok: false, code: "VALIDATION_ERROR" }`

## Variáveis de ambiente

- `WAITLIST_ENC_KEY`: base64 de 32 bytes
- `WAITLIST_ALLOWED_ORIGINS` (opcional): lista separada por vírgula para liberar origens extras no CORS

## CORS

Por padrão a function aceita:
- `http://localhost:<port>`
- `http://127.0.0.1:<port>`
- `https://<usuario>.github.io`

## Rodar checks locais

```bash
npm run check --workspace apps/firebase-functions
```

## Deploy da function

```bash
npm run deploy --workspace apps/firebase-functions
```
