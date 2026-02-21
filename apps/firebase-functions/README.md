# Firebase Functions (submit waitlist)

## O que existe aqui

- `submitWaitlist` (HTTP Cloud Function)
- Validação: nome obrigatório + e-mail ou telefone obrigatório
- Deduplicação por hash (`sha256`) de e-mail/telefone normalizados
- Criptografia server-side (`AES-256-GCM`) para `name`, `email` e `phone`
- Helper de decrypt em `src/crypto.js` para uso futuro em painel admin

## Variáveis de ambiente

- `WAITLIST_ENC_KEY`: base64 de 32 bytes

## Rodar checks locais

```bash
npm run check --workspace apps/firebase-functions
```

## Deploy da function

```bash
npm run deploy --workspace apps/firebase-functions
```
