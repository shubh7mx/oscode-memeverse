# MemeVerse

## Cloudflare hosting

This app is a full-stack Next.js 16 project with Appwrite-backed API routes.
Because of that, it should be deployed on Cloudflare's Workers runtime, not as a static Pages export.

Cloudflare's own docs currently say:
- full-stack SSR Next.js apps should use the Next.js Workers guide
- static Pages export is only for fully static Next.js sites

Official references:
- [Cloudflare Pages Next.js guide](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Cloudflare Workers Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)

## What was added

- `wrangler.jsonc`
- `open-next.config.ts`
- Cloudflare scripts in `package.json`
- theme favicon at `app/icon.svg`

## Deploy

1. Install dependencies:
   - `npm install`
2. Log into Cloudflare:
   - `npx wrangler login`
3. Set the required production secrets / variables in Cloudflare:
   - `NEXT_PUBLIC_APPWRITE_ENDPOINT`
   - `NEXT_PUBLIC_APPWRITE_PROJECT_ID`
   - `NEXT_PUBLIC_APPWRITE_DATABASE_ID`
   - `APPWRITE_API_KEY`
   - `APPWRITE_BUCKET_ID`
   - `ADMIN_PIN`
   - `APPWRITE_QUESTIONS_COLLECTION_ID` if custom
   - `APPWRITE_PARTICIPANTS_COLLECTION_ID` if custom
   - `APPWRITE_SESSION_COLLECTION_ID` if custom
   - `APPWRITE_SESSION_DOC_ID` if custom
4. Preview locally in the Cloudflare runtime:
   - `npm run preview`
5. Deploy:
   - `npm run deploy`

## Deploy from Cloudflare dashboard

If you want Git-based deployment from Cloudflare's dashboard:
- use Workers Builds / Workers & Pages Git integration
- build/deploy command: `npm run deploy`
- make sure the same environment variables are configured in the dashboard

Do not use the static Next.js Pages preset for this project. It will break the dynamic API routes.
