# App Gastos

Base inicial de una web app de gestion financiera familiar en espanol,
orientada a desplegarse en `Vercel` y usar `Supabase` para autenticacion y
PostgreSQL.

## Stack actual

- `Next.js` en la raiz del repo
- `Supabase Auth` con `@supabase/ssr`
- `Vercel` como destino principal de deploy
- `Prisma 7` para modelar el dominio financiero y preparar futuras migraciones

## Que ya esta listo

- landing publica
- paginas de `login` y `registro`
- `dashboard` protegido por middleware
- utilidades base de Supabase para browser, server y middleware
- `vercel.json` minimo para deploy
- `schema.prisma` con el dominio de AppGastos

## Variables de entorno necesarias

Copiar `.env.example` a `.env.local` y completar:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`

Opcionales por ahora:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `APP_ADMIN_EMAILS`

Notas:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` es suficiente para el estado actual de la app.
- Si preferis el nombre nuevo de Supabase, el codigo tambien acepta `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Para `DATABASE_URL`, usar la URI del `Session pooler` con `?sslmode=require`.
- Para enviar invitaciones familiares por email de forma automatica, configurar `RESEND_API_KEY` y `RESEND_FROM_EMAIL`.
- `RESEND_FROM_EMAIL` debe pertenecer a un dominio verificado en Resend si queres enviar a destinatarios reales.
- `APP_ADMIN_EMAILS` acepta una lista separada por comas de correos con acceso a `/admin`.

## Setup local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Crear `.env.local` a partir de `.env.example`.
3. Levantar la app:
   ```bash
   npm run dev
   ```
4. Validar el schema financiero:
   ```bash
   npm run prisma:validate
   ```

## Deploy en Vercel

1. Subir este repo a GitHub.
2. Importar el repo en Vercel.
3. Configurar estas variables en Vercel:
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DATABASE_URL`
4. Si despues necesitas tareas administrativas en servidor, agregar tambien:
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Si queres que las invitaciones familiares salgan por email automaticamente, agregar tambien:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
5. Deploy.

## Configuracion pendiente en Supabase

Antes del deploy, terminar estos pasos en el panel de Supabase:

1. `Authentication > Providers > Email`
   - verificar que `Email` este habilitado
2. `Authentication > URL Configuration`
   - `Site URL`: `http://localhost:3000` en local
   - `Redirect URLs`: `http://localhost:3000/auth/callback`
3. Cuando Vercel te entregue el dominio final, agregar tambien:
   - `https://tu-app.vercel.app`
   - `https://tu-app.vercel.app/auth/callback`
4. `Connect > Connection String`
   - elegir `Session pooler`
   - copiar la URI en `DATABASE_URL`
   - asegurarte de que incluya `?sslmode=require`

## Notas de arquitectura

- La estructura raiz replica el patron que ya usas en `sistema_barberia`,
  porque reduce friccion para desplegar en Vercel.
- `Prisma` queda como base del dominio, aunque el runtime inicial ya usa
  `Supabase Auth`.
- Los directorios `apps/`, `packages/` y `docs/` se dejan reservados por si
  despues queres extraer worker, librerias compartidas o documentacion tecnica.

## Proximo paso recomendado

Implementar el onboarding real de familia:

1. crear familia
2. guardar membresia inicial
3. invitar integrantes
4. reemplazar el dashboard demo por datos reales
