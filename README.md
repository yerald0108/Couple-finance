# CoupleFinance

App móvil **Android** de finanzas para **parejas**, pensada para el mercado cubano: dos personas llevan juntas el dinero del hogar (ingresos, gastos, ahorro) con **efectivo, transferencia y dólares (USD)**, **funciona sin internet** y se sincroniza entre los dos teléfonos cuando hay conexión.

> **Idioma:** toda la interfaz, los mensajes de error y los comentarios del código están en **español**. Los nombres de funciones, tablas y columnas del dominio también (`registrarGasto`, `movimientos`, `deleted_at`…). Mantén esa convención al contribuir.

## Índice

1. [Resumen](#1-resumen)
2. [Funcionalidades](#2-funcionalidades)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Puesta en marcha](#4-puesta-en-marcha)
5. [Estructura del proyecto](#5-estructura-del-proyecto)
6. [Arquitectura](#6-arquitectura)
7. [Base de datos local (SQLite)](#7-base-de-datos-local-sqlite)
8. [Reglas de dinero](#8-reglas-de-dinero-el-corazón-del-dominio)
9. [Capa de consultas](#9-capa-de-consultas-srcdbqueries)
10. [Utilidades](#10-utilidades-srcutils)
11. [Estadísticas y análisis](#11-estadísticas-y-análisis)
12. [Notificaciones](#12-notificaciones)
13. [Cuentas y pareja](#13-cuentas-y-pareja)
14. [Sincronización](#14-sincronización)
15. [Backend Supabase](#15-backend-supabase)
16. [Estado global (stores)](#16-estado-global-stores)
17. [Navegación y pantallas](#17-navegación-y-pantallas)
18. [Componentes](#18-componentes-srccomponents)
19. [Teclado y scroll](#19-teclado-y-scroll)
20. [Tema y diseño](#20-tema-y-diseño)
21. [Compilar y publicar](#21-compilar-y-publicar)
22. [Verificación y pruebas](#22-verificación-y-pruebas)
23. [Convenciones de código](#23-convenciones-de-código)
24. [Guías para extender](#24-guías-para-extender)
25. [Limitaciones y decisiones](#25-limitaciones-y-decisiones-conocidas)
26. [Solución de problemas](#26-solución-de-problemas)
27. [Historial de fases](#27-historial-de-fases)
28. [Licencia](#28-licencia)

---

## 1. Resumen

CoupleFinance resuelve esto: **dos personas comparten el dinero de la casa** y quieren saber, en cada momento, *cuánto hay, de qué forma (efectivo, transferencia o USD) y para qué está reservado*.

La idea central son los **sectores** (como "sobres"): cuando entra dinero (un **ingreso**) se **reparte** entre sectores — Gastos fijos, Gustos, Ahorro y los que cree la pareja —. Después, cada **gasto** sale de un sector y de una forma de dinero concreta, y solo se puede gastar lo que realmente hay en ese sector **y** en esa forma.

Principios de diseño que conviene tener presentes en todo el proyecto:

| Principio | Qué significa en la práctica |
|---|---|
| **Offline-first** | La app lee y escribe **siempre** en SQLite local. Internet solo se usa para sincronizar en segundo plano. Sin internet, todo funciona. |
| **Funciona sin cuenta** | Sin Supabase configurado, o sin iniciar sesión, la app es un registro personal completo en un solo teléfono. |
| **Dinero exacto** | Toda la aritmética en JavaScript se hace en **centavos enteros**; pesos y USD **nunca se mezclan**. |
| **La base no se fía de la pantalla** | Las reglas (saldo suficiente, reparto exacto…) se validan en la pantalla *y otra vez* en la capa de consultas. |
| **Nada se borra de verdad** | Borrado lógico (`deleted_at`), para que los borrados también se sincronicen. |
| **Una sola cosa a la vez** | Una sincronización a la vez por base de datos; un guardado a la vez por formulario (anti doble toque). |

## 2. Funcionalidades

- **Inicio:** total en pesos y por forma de dinero, disponible por sector, accesos a cada sector, **campana de notificaciones** y *pull-to-refresh* (sincroniza y recarga).
- **Movimientos:** registrar un **ingreso** (monto, forma, origen) y **repartirlo** entre sectores con comprobación en vivo de "falta / te pasaste".
- **Sectores:** 4 sectores base (Ingresos, Gastos fijos, Gustos, Ahorro) y sectores personalizados con nombre y "uso del dinero".
- **Gastos:** añadir, editar y eliminar gastos por sector; en **Ahorro**, *retiros* con motivo obligatorio.
- **Estadísticas:** por día, semana, mes o año — resumen, comparación con el período anterior, gráficos (dona y barras), rankings, uso de sectores, mensajes automáticos y estimación de cierre de mes.
- **Billetera:** cuentas, sectores y la tarjeta de **pareja/sincronización**.
- **Cuenta y pareja:** correo + contraseña (Supabase Auth), **código de 8 caracteres** para unir a la segunda persona (máximo 2 cuentas por pareja).
- **Sincronización** entre los dos teléfonos, con cola de pendientes, resolución de conflictos y decisión de cómo unir datos previos.
- **Notificaciones** dentro de la app: lo que registra tu pareja ("Beto registró un gasto"), con detalle de cada movimiento.
- **No incluye** (decisión del producto): copia de seguridad/exportación de datos.

## 3. Stack tecnológico

| Capa | Tecnología (versión en `package.json`) |
|---|---|
| Plataforma | **Expo SDK 58** (`expo ~58.0.24`), **React Native 0.88.1**, **React 19.3.0** |
| Lenguaje | **TypeScript** `~6.0.3`, modo `strict` |
| Navegación | **Expo Router** `~58.0.31` (rutas por archivos en `src/app/`). Las pestañas usan `expo-router/js-tabs` |
| Base local | **expo-sqlite** `~58.0.16` (SQLite, modo WAL) |
| Estado | **Zustand** `^5.1.0` |
| Backend | **Supabase** (`@supabase/supabase-js 2.119.0`): Auth + Postgres + RPC |
| Gráficos | **react-native-svg** `15.16.0` (dona y barras hechos a mano) |
| Iconos / fuente | `@expo/vector-icons` (Ionicons), `@expo-google-fonts/inter` |
| Otros | `expo-crypto` (UUID), `expo-system-ui`, `expo-status-bar`, `expo-constants`, `expo-linking`, `expo-font`, `react-native-safe-area-context`, `react-native-screens` |
| Builds | **EAS Build** (APK de Android) |

Notas:

- No hay librería de formularios, de fechas ni de gráficos: todo es propio (`src/utils/*`, `src/components/estadisticas/*`).
- **Expo cambia mucho entre versiones.** `AGENTS.md` pide consultar la documentación versionada (`https://docs.expo.dev/versions/v58.0.0/`) antes de tocar APIs de Expo/EAS/React Native, y usar `npx expo install <paquete>` (no `npm install`) para que se elijan versiones compatibles con el SDK.

## 4. Puesta en marcha

### 4.1 Requisitos

- **Node.js** reciente (LTS) y **npm**.
- Un teléfono Android con **Expo Go** (o un emulador), o un *development build*.
- (Opcional) un proyecto de **Supabase** si quieres probar la sincronización (ver [sección 15](#15-backend-supabase)).

### 4.2 Instalación

```powershell
cd couple-finance
npm install
```

### 4.3 Variables de entorno

La conexión a Supabase se lee de dos variables públicas (`EXPO_PUBLIC_*` se incrustan en la app al empaquetar):

```powershell
copy .env.example .env
```

Edita `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxx
```

- Los valores están en Supabase → *Project Settings* → *API Keys / Data API*.
- Es la llave **publishable** (pública por diseño; la seguridad la dan las políticas RLS). **Nunca pongas la `service_role`/secret key en la app.**
- Si las dejas vacías, la app funciona **solo en local** (la pantalla de sincronización muestra "Falta conectar Supabase").
- `.env` está en `.gitignore`: no se sube al repositorio.

### 4.4 Ejecutar

```powershell
npx expo start        # servidor de desarrollo (escanea el QR con Expo Go)
npx expo start -c     # igual, limpiando la caché de Metro (obligatorio tras cambiar .env)
```

### 4.5 Comandos útiles

| Comando | Para qué |
|---|---|
| `npm start` / `npm run android` | Atajos a `expo start` / `expo start --android` |
| `npx tsc --noEmit` | Comprobar tipos (hazlo antes de dar algo por terminado) |
| `npx expo-doctor` | Diagnóstico de dependencias y configuración |
| `npx expo install --check` | Ver paquetes con versión incompatible con el SDK |
| `npx expo install <paquete>` | Añadir una dependencia con la versión correcta |

> Hoy el proyecto **no tiene configurado ESLint**, por lo que `npx expo lint` no es útil hasta añadir una configuración.

## 5. Estructura del proyecto

```
couple-finance/
├─ app.json                  Configuración de Expo (nombre, paquete Android, permisos, plugins, iconos)
├─ eas.json                  Perfiles de compilación (preview / production, ambos APK)
├─ package.json              Dependencias y scripts
├─ tsconfig.json             Extiende expo/tsconfig.base con strict
├─ .env.example              Plantilla de variables (la real, .env, no se sube)
├─ AGENTS.md                 Reglas para asistentes de código (consultar docs de Expo, comandos…)
├─ LICENSE                   MIT
├─ assets/                   Iconos (icon, adaptive icon Android, favicon, splash)
├─ supabase/
│  └─ migrations/            SQL que se ejecuta en Supabase (8A pareja+RLS, 8B funciones de sync)
└─ src/
   ├─ app/                   Rutas (Expo Router): una pantalla por archivo
   │  ├─ _layout.tsx         Raíz: fuente, base de datos, SesionIniciador, SyncIniciador, Stack
   │  ├─ (tabs)/             Las 4 pestañas: index, movimientos, estadisticas, billetera
   │  ├─ sector/[id].tsx     Lista de un sector
   │  ├─ movimiento/[id].tsx Detalle de un movimiento
   │  ├─ notificaciones.tsx  Lista de notificaciones
   │  ├─ nuevo-gasto.tsx     (modal) añadir/editar gasto o retiro de ahorro
   │  ├─ nuevo-sector.tsx    (modal) crear sector
   │  ├─ editar-ingreso.tsx  (modal) editar/eliminar ingreso
   │  └─ sincronizacion.tsx  (modal) cuenta, pareja y estado de sync
   ├─ components/            Componentes por zona: billetera, common, estadisticas, forms, inicio,
   │                         movimientos, notificaciones, sector, sincronizacion
   ├─ db/
   │  ├─ database.ts         Abre la base e inicializa (PRAGMAs + migraciones)
   │  ├─ migrations.ts       Lista de migraciones v1, v2, v3
   │  ├─ schemaSql.ts        SQL de la v1 y datos iniciales (puro, sin Expo)
   │  ├─ schema.ts           Tipos TypeScript de las tablas
   │  └─ queries/            Toda la lectura/escritura de datos (una pantalla nunca escribe SQL)
   ├─ hooks/                 useEliminarMovimiento, useKeyboardHeight
   ├─ lib/                   supabase.ts (cliente), cuentaService.ts (cuentas, pareja, RPC)
   ├─ store/                 Stores de Zustand (cuentas, sectores, saldos, notificaciones, sesión, sync)
   ├─ sync/                  Motor de sincronización: motor, tablas, syncSql, sesionSync, ajustes
   ├─ theme/                 Colores, espaciado, tipografías, sombras e iconos
   ├─ types/                 Tipos de dominio compartidos
   └─ utils/                 Funciones puras: montos, validaciones, fechas, estadísticas, análisis…
```

Regla: **el código que no es una ruta va fuera de `src/app/`** (cada archivo de `src/app/` es una pantalla).

## 6. Arquitectura

### 6.1 Capas

```
 Pantalla / componente  (src/app, src/components)       solo dibuja y reacciona a toques
        │  lee estado / llama acciones
        ▼
 Store (Zustand)        (src/store)                     estado compartido + recarga tras guardar
        │
        ▼
 Capa de consultas      (src/db/queries)                reglas de dinero, SQL, transacciones
        │
        ▼
 SQLite local           (finanzas-pareja.db)            fuente de verdad de lo que ve el usuario
        ▲
        │  cola de cambios (disparadores) + cursores
 Motor de sincronización (src/sync)  ◄── RPC ──►  Supabase (Postgres + Auth + RLS)
```

- Las **funciones puras** (`src/utils`) no conocen ni la base ni la pantalla.
- Las **pantallas no escriben SQL**: llaman a un store o a una función de `db/queries`.
- Los **stores de datos** (`useCuentasStore`, …) llaman a `db/queries` y recargan lo que cambió. Los de sesión y sincronización se construyen con una **fábrica** (`crearSesionStore`, `crearSyncStore`) que recibe el cliente de Supabase por parámetro, para poder probarlos sin internet.

### 6.2 Arranque de la app

`src/app/_layout.tsx` (layout raíz):

1. Carga la fuente **Inter** (400/500/600/700). Mientras no esté, muestra un indicador.
2. Abre la base con `<SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase} useSuspense>`: la primera vez crea tablas y datos base; las siguientes aplica migraciones pendientes.
3. Monta dos componentes **sin interfaz** que mantienen vivo el sistema:
   - `SesionIniciador`: lee la cuenta guardada y la confirma con Supabase.
   - `SyncIniciador`: activa y mantiene la sincronización.
4. Declara un `Stack` sin cabecera; `nuevo-sector`, `nuevo-gasto`, `editar-ingreso` y `sincronizacion` se presentan como **modal**.

### 6.3 Flujo de un dato (ejemplo: registrar un gasto)

1. `nuevo-gasto.tsx` valida con `validarGasto` y comprueba disponibles con `bloqueosGasto` (mensajes en vivo).
2. Llama a `useCuentasStore.registrarGasto` → `registrarGasto` (`db/queries/gastos.ts`), que **vuelve a validar**, y en una transacción inserta el movimiento y resta de la cuenta.
3. Un **disparador SQLite** anota el movimiento en `sync_cola` (si la sincronización está activa) y otro le pone `registrado_por`.
4. El store recarga cuentas y saldos de sectores; las pantallas se redibujan.
5. En segundo plano, `SyncIniciador` ve el pendiente (cada 6 s) y llama a `sincronizar`: sube el movimiento por la RPC `sync_push`.
6. En el teléfono de la pareja, `sincronizar` baja el cambio con `sync_pull`, lo aplica, **recalcula los saldos de las cuentas** y sube `datosVersion`; las pantallas abiertas se recargan.

## 7. Base de datos local (SQLite)

Toda la información vive en un archivo SQLite dentro del teléfono: **`finanzas-pareja.db`** (constante `DATABASE_NAME` en `src/db/database.ts`). La app es **offline-first**: lo que ve el usuario sale siempre de esta base, nunca directamente de Supabase.

### 7.1 Apertura e inicialización

| Archivo | Qué hace |
|---|---|
| `src/db/database.ts` | Exporta `DATABASE_NAME` e `initDatabase(db)`. `initDatabase` lo llama `<SQLiteProvider onInit>` (en `src/app/_layout.tsx`) una sola vez al abrir la base. Activa `PRAGMA journal_mode = WAL` (escrituras más rápidas y seguras) y `PRAGMA foreign_keys = ON`, y después ejecuta `runMigrations`. |
| `src/db/migrations.ts` | Lista ordenada de migraciones y `runMigrations(db)`. |
| `src/db/schemaSql.ts` | SQL puro de la versión 1 (`SCHEMA_V1`) y los datos iniciales (`seedV1`). No importa nada de Expo, a propósito: el mismo SQL se puede probar fuera del teléfono (por ejemplo con `node:sqlite`). |
| `src/db/schema.ts` | Tipos TypeScript que reflejan cada tabla (`Sector`, `Cuenta`, `Ajuste`, `Movimiento`, `Reparto`). Una fila = un objeto. |
| `src/types/index.ts` | Tipos de dominio compartidos: `FormaDinero`, `Moneda`, `TipoSector`, `TipoMovimiento`, `OrigenIngreso`. |

### 7.2 Tablas

**`sectores`** — los "sobres" donde se reparte el dinero.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | TEXT PK | Los 4 sectores base tienen id fijo (ver 7.3); los demás, UUID. |
| `nombre` | TEXT | Único (sin distinguir mayúsculas ni tildes) a nivel de aplicación, no de base. |
| `descripcion` | TEXT | "Uso del dinero". Obligatorio al crear un sector personalizado. |
| `tipo` | TEXT | `ingresos`, `gastos_fijos`, `gustos`, `ahorro` o `personalizado` (`CHECK`). |
| `icono`, `color` | TEXT | `NULL` en los 4 base (la interfaz toma icono y color del tema según el tipo). Los personalizados guardan un color de `PALETA_SECTORES`. |
| `activo` | INTEGER | 1 = activo, 0 = archivado. Hoy solo se leen los activos. |
| `orden` | INTEGER | Orden de aparición. |
| `created_at`, `updated_at`, `deleted_at` | TEXT | ISO 8601 UTC. `deleted_at` ≠ NULL = borrado lógico. |

**`cuentas`** — una fila por forma de dinero (3 en total; `tipo` es `UNIQUE`).

| Columna | Notas |
|---|---|
| `id` | Fijos: `cuenta_efectivo`, `cuenta_transferencia`, `cuenta_usd`. |
| `tipo` | `efectivo`, `transferencia` o `usd`. |
| `moneda` | `CUP` (efectivo y transferencia) o `USD`. |
| `saldo` | REAL. **Es un valor derivado** (ingresos − gastos de esa forma). Se mantiene paso a paso al registrar/editar/eliminar y se **recalcula entero** tras cada bajada de la pareja (`recalcularSaldosCuentas`). No se sincroniza. |

**`ajustes`** — pares clave/valor **solo de este teléfono** (nunca se sincronizan). Ver 7.5.

**`movimientos`** — todo lo que entra o sale.

| Columna | Notas |
|---|---|
| `id` | UUID creado en el teléfono (`newId()`), para que dos teléfonos sin conexión no choquen. |
| `tipo` | `ingreso`, `gasto_fijo`, `gusto`, `gasto` o `ahorro` (ver `TipoMovimiento`). |
| `monto` | REAL, `CHECK (monto > 0)`. Siempre positivo; el signo lo da el `tipo`. |
| `forma` | `efectivo`, `transferencia` o `usd` (`CHECK`). |
| `concepto` | Texto del gasto ("arroz"). `NULL` en ingresos y salidas de ahorro. |
| `origen` | Solo ingresos: `salario`, `ganancia`, `prestamo`, `otro`. |
| `sector_id` | En un ingreso es siempre `sector_ingresos`; en un gasto, el sector del que sale. |
| `motivo_ahorro` | Solo salidas de ahorro (obligatorio ahí). |
| `es_salida_ahorro` | 1 = salida de Ahorro. |
| `fecha` | ISO UTC. Se fija al registrar y **no cambia al editar**. |
| `registrado_por` | Id de la cuenta de Supabase que lo registró. `NULL` = de antes de sincronizar. Lo rellena un disparador (7.4). |
| `created_at`, `updated_at`, `deleted_at` | ISO UTC; `updated_at` decide quién gana en un conflicto de sincronización. |

**`repartos`** — cómo se dividió un ingreso entre sectores: `id`, `movimiento_id`, `sector_id`, `monto` (`> 0`), `created_at`, `updated_at`, `deleted_at`. Un ingreso tiene 1..n repartos cuya suma es **exactamente** el monto del ingreso.

Índices: `idx_movimientos_fecha`, `idx_movimientos_sector`, `idx_repartos_movimiento`, `idx_repartos_sector`.

> **Los saldos de los sectores no se guardan.** Se calculan siempre desde los movimientos (`getSaldosSectores`, `getSaldosSectoresPorForma`). Solo `cuentas.saldo` es un valor guardado, y se puede reconstruir en cualquier momento.

### 7.3 Datos iniciales (`seedV1`)

Se insertan con `INSERT OR IGNORE` y **ids fijos** para que dos teléfonos que crean su base por separado tengan los mismos registros base y la sincronización no los duplique:

| Id | Nombre | Tipo |
|---|---|---|
| `sector_ingresos` | Ingresos | `ingresos` (orden 0) |
| `sector_gastos_fijos` | Gastos fijos | `gastos_fijos` (orden 1) |
| `sector_gustos` | Gustos | `gustos` (orden 2) |
| `sector_ahorro` | Ahorro | `ahorro` (orden 3) |
| `cuenta_efectivo` / `cuenta_transferencia` / `cuenta_usd` | Efectivo / Transferencia / USD | CUP / CUP / USD |

### 7.4 Migraciones

La versión se guarda en el propio archivo con `PRAGMA user_version`. `runMigrations` lee la versión actual y aplica, **cada una en su transacción** (o se aplica completa o no se aplica), las migraciones con versión mayor.

| Versión | Qué hace |
|---|---|
| **1** | Crea las 5 tablas y los índices (`SCHEMA_V1`) y siembra sectores y cuentas (`seedV1`). |
| **2** | Limpieza sin cambios de tablas: una prueba descartada de la Fase 7 guardaba `persona_1`/`persona_2` en `movimientos.registrado_por` y un perfil en `ajustes`. Deja `registrado_por = NULL` en esos movimientos y borra las claves `persona_local`, `nombre_persona_1`, `nombre_persona_2`. |
| **3** | Sincronización (`SCHEMA_V3`, en `src/sync/syncSql.ts`): crea `sync_cola`, `sync_aplicando` y los disparadores. No toca tablas existentes. |

**Regla de oro: una migración publicada nunca se edita.** Para cambiar la base se añade una migración nueva al final de `MIGRATIONS`.

#### Tablas y disparadores de sincronización (v3)

- **`sync_cola (tabla, fila_id, seq)`** — una fila por registro (sector, movimiento o reparto) que cambió y aún no se subió. `seq` crece con cada cambio. Si un registro cambia *mientras* se sube, su `seq` nuevo ya no coincide con el subido y se queda en la cola para la próxima vez.
- **`sync_aplicando (tabla, fila_id)`** — marca temporal por registro: "este cambio viene de la pareja". Evita que lo bajado se vuelva a anotar como pendiente de subir.
- **Disparadores `sync_<tabla>_ins` / `sync_<tabla>_upd`** (6 en total: sectores, movimientos y repartos, INSERT y UPDATE). Se ejecutan solo si el ajuste `sync_activo = '1'` y el registro **no** está en `sync_aplicando`; hacen `INSERT OR REPLACE INTO sync_cola` con `seq = MAX(seq) + 1`.
- **`sync_movimientos_autor`** — tras un `INSERT` en `movimientos` con `registrado_por IS NULL`, si la sincronización está activa y existe `sync_usuario_id`, rellena `registrado_por` con ese usuario (salvo que el registro venga de la pareja).

Por eso **las funciones que registran, editan y eliminan (fases 1–7) no saben nada de sincronización**: escriben igual que siempre y la base anota el pendiente. Mientras la sincronización no esté activada, los disparadores no hacen nada.

### 7.5 Claves de la tabla `ajustes`

| Clave | Contenido |
|---|---|
| `sync_activo` | `'1'` si la sincronización está activa en este teléfono (`'0'` si no). |
| `sync_usuario_id` | Id de la cuenta de Supabase con la que se activó. |
| `sync_pareja_id` | Id de la pareja a la que se conectó. |
| `sync_ultima` | ISO de la última sincronización correcta. |
| `sync_cursor_sectores`, `sync_cursor_movimientos`, `sync_cursor_repartos` | JSON `{ts, id}`: hasta dónde se ha bajado de cada tabla. |
| `sync_cuenta` | JSON con `{id, email}` de la cuenta (copia para mostrarla sin internet). |
| `sync_pareja` | JSON con la pareja (`pareja_id`, `codigo`, `miembros[]`) (misma razón). |
| `notif_visto_rowid` | Marca de notificaciones vistas (ver sección 12). |

Se leen y escriben con `getAjuste` / `setAjuste` / `delAjuste` (`src/sync/ajustes.ts`); `setAjuste` hace *upsert* con `updated_at`.

### 7.6 Convenciones de datos

- **Fechas**: siempre ISO 8601 UTC con milisegundos (`2026-11-12T12:30:00.000Z`). Se comparan bien como texto y sirven para *last-write-wins*. La pantalla las convierte a hora local; los límites de períodos (día, mes…) se calculan en hora local y se pasan a UTC antes de consultar (ver `src/utils/fechas.ts`).
- **Borrado lógico**: nada se borra de verdad; se marca `deleted_at` (y `updated_at`). Toda consulta filtra `deleted_at IS NULL`. Esto es lo que permite que un borrado se sincronice.
- **IDs**: UUID v4 generado en el teléfono (`newId()` en `src/utils/uuid.ts`, usa `expo-crypto`).

## 8. Reglas de dinero (el corazón del dominio)

Esta sección es la más importante para no romper la app. Todas las reglas están **repetidas en dos capas**: la pantalla valida para avisar bonito, y la capa de consultas (`src/db/queries/*`) **vuelve a validar** porque "la base no se fía de la pantalla".

### 8.1 Formas de dinero y monedas

- Hay **3 formas de dinero**: `efectivo`, `transferencia` (ambas en pesos, `CUP`) y `usd` (dólares).
- **Pesos y USD nunca se suman ni se mezclan.** En todas partes van en columnas separadas (`cup` / `usd`). El "total en pesos" es efectivo + transferencia; el USD siempre se muestra aparte.
- Símbolos: pesos `$`, dólares `US$` (`simboloMoneda`). `monedaDeForma(forma)` devuelve `'USD'` solo para `usd`.

### 8.2 Aritmética en centavos

Los montos se guardan como `REAL` en SQLite pero **toda suma, resta y comparación en JavaScript se hace en centavos enteros** (`aCentavos(12.34) = 1234`, `deCentavos(1234) = 12.34`, en `src/utils/montos.ts`). Así `0.1 + 0.2` es exactamente `0.3` y "la suma del reparto es igual al monto" nunca falla por decimales. En SQL se usa `ROUND(..., 2)` al sumar.

- `limpiarMontoTexto(texto)`: lo que se escribe en un campo de monto → solo dígitos y **un** punto decimal (la coma se convierte en punto), máximo 2 decimales, sin ceros a la izquierda, máximo `MAX_ENTEROS = 9` cifras enteras.
- `parseMontoCentavos(texto)`: texto → centavos; `null` si está vacío o no es un monto válido (`/^\d+(\.\d{0,2})?$/`).
- `formatMonto(valor, moneda)` formatea **a mano** (sin `Intl`, para que se vea igual en todos los teléfonos): `"$1,234.50"`, `"US$12.00"`, negativos `"-$5.00"`.
- `redondear(valor)` redondea a 2 decimales.

### 8.3 Cómo se calcula cada saldo

| Saldo | Cómo se obtiene |
|---|---|
| **Cuenta** (por forma) | `cuentas.saldo`: valor guardado y mantenido. Ingreso suma; gasto resta; eliminar/editar revierten y reaplican. Tras bajar cambios de la pareja se **recalcula** con `recalcularSaldosCuentas`: `SUM(ingresos) − SUM(resto)` por forma sin contar lo eliminado. |
| **Sector** (CUP y USD) | `getSaldosSectores`: repartos recibidos − gastos del sector, separando pesos (efectivo+transferencia) y USD. |
| **Sector por forma** | `getSaldosSectoresPorForma`: lo mismo pero separado en efectivo / transferencia / USD. Es lo que decide si un gasto se puede hacer. |
| **Total en pesos** (Inicio) | `resumenSaldos(cuentas)`: efectivo + transferencia (redondeado). USD aparte. |

El sector **Ingresos** no "tiene saldo": su pantalla muestra lo ingresado en el mes.

### 8.4 Registrar un ingreso (`registrarIngreso`)

1. Se valida (`validarDatosIngreso`): monto > 0; al menos un sector en el reparto; el sector Ingresos debe existir; cada parte > 0; cada sector existe, **no es Ingresos** y **no se repite**; y **la suma del reparto debe ser exactamente igual al monto** (en centavos).
2. En **una sola transacción**: inserta el movimiento (`tipo='ingreso'`, `sector_id='sector_ingresos'`, `origen`, `fecha = ahora`), inserta un reparto por sector, y suma el monto a la cuenta de esa forma (`saldo = ROUND(saldo + ?, 2)`).
3. Si algo falla, no se guarda nada.

En pantalla (`validarIngreso`): además de lo anterior, muestra "Faltan $X por repartir" / "Te pasaste por $X" y devuelve solo los repartos > 0 listos para guardar.

### 8.5 Registrar un gasto o una salida de ahorro (`registrarGasto`)

1. Valida monto > 0, sector existente y que **no sea Ingresos** (`tipoMovimientoDeSector` lanza error). Qué tipo de movimiento se guarda según el sector:

   | Sector | Movimiento |
   |---|---|
   | `gastos_fijos` | `gasto_fijo` |
   | `gustos` | `gusto` |
   | `personalizado` | `gasto` |
   | `ahorro` | `ahorro` (con `motivo_ahorro` y `es_salida_ahorro = 1`) |

2. Valida el texto (se limpia con `trim` y espacios repetidos): concepto de **2 a 40** letras, o motivo (Ahorro) de **3 a 60**.
3. **Bloqueo por saldo** (`bloqueosGasto`): el gasto se rechaza si **la cuenta de esa forma** o **el sector en esa forma** no alcanzan. No se guarda nada y se devuelve `{ estado: 'saldo_insuficiente', avisos: [...] }` con mensajes tipo *"No tienes suficiente en Efectivo: solo hay $50.00."* o *"Gustos no tiene dinero en USD: está agotado."*
4. En una transacción: inserta el movimiento y resta de la cuenta (`ROUND(saldo - ?, 2)`).

### 8.6 La regla `empeoraNegativo`

`empeoraNegativo(antes, después) = después < 0 && después < antes`. Un cambio solo se rechaza si **deja un saldo en negativo Y lo empeora**. Así, si por algún motivo (datos viejos o una fusión entre teléfonos) un saldo ya estaba en negativo, no bloquea cambios que lo mejoran o lo dejan igual. Es la regla que usan gastos, ediciones y eliminaciones.

### 8.7 Editar y eliminar

Todas devuelven `ResultadoCambio`: `{ estado: 'guardado' }` o `{ estado: 'saldo_insuficiente', avisos }` (no se guardó nada).

- **`editarGasto(db, id, datos)`**: cambia monto, forma y concepto/motivo. La **fecha y el sector se mantienen**. Devuelve a la cuenta lo que ya se había descontado y descuenta lo nuevo; si la forma no cambió, ese dinero devuelto cuenta como disponible al comparar (`devueltoCentavos`). Si lo nuevo no alcanza, no guarda.
- **`editarIngreso(db, id, datos)`**: mismas reglas que registrar. **El reparto viejo se marca como eliminado y se crean repartos nuevos** (nunca se editan repartos sueltos). Se calcula cómo quedaría cada sector/forma y cada cuenta; si alguno empeora su negativo, no guarda.
- **`eliminarMovimiento(db, id)`**: borrado lógico.
  - Gasto/salida de ahorro: el dinero vuelve a la cuenta y al sector.
  - **Ingreso**: se quita el dinero de la cuenta y se eliminan sus repartos. Si ya se gastó parte de ese dinero y eso dejaría algún sector o cuenta en negativo, **no se elimina** y se explican los motivos ("No se puede eliminar este ingreso: …").

### 8.8 Qué se puede (y qué no) en el modelo

- Se permiten saldos negativos **solo** como resultado de una fusión de datos entre dos teléfonos (límite conocido, ver sección 25).
- No hay transferencias entre cuentas ni entre sectores: el dinero solo entra por un ingreso (con reparto) y solo sale por un gasto.

## 9. Capa de consultas (`src/db/queries/`)

Cada archivo agrupa las funciones de una parte del dominio. Todas reciben `db: SQLiteDatabase` (de `useSQLiteContext()` en las pantallas) y devuelven datos ya listos; **ninguna pantalla escribe SQL**. Las escrituras que tocan varias tablas usan `db.withTransactionAsync` (todo o nada).

| Archivo | Funciones | Qué hacen |
|---|---|---|
| `cuentas.ts` | `getCuentas(db)` | Las 3 cuentas siempre en el orden efectivo → transferencia → USD. |
| `sectores.ts` | `getSectores(db)`, `crearSector(db, entrada)` | Sectores activos (`deleted_at IS NULL AND activo = 1`) por `orden, created_at`. `crearSector` **vuelve a validar** (nombre único, longitudes), asigna `tipo='personalizado'`, el siguiente color de `PALETA_SECTORES` (rota al terminar la lista) y `orden = max + 1`. |
| `ingresos.ts` | `validarDatosIngreso`, `registrarIngreso` | Ver 8.4. `registrarIngreso` devuelve `{ movimiento, repartos }`. |
| `gastos.ts` | `registrarGasto` | Ver 8.5. Devuelve `{ estado: 'guardado', movimiento }` o `{ estado: 'saldo_insuficiente', avisos }`. |
| `movimientos.ts` | `getMovimiento`, `getIngreso`, `editarGasto`, `editarIngreso`, `eliminarMovimiento` | Lectura de un movimiento (si existe y no está eliminado), un ingreso con su reparto actual (para llenar el formulario de edición) y las tres operaciones de cambio descritas en 8.7. Internamente calcula los saldos por sector/forma antes y después del cambio para decidir si se rechaza. |
| `saldosSectores.ts` | `getSaldosSectores`, `getSaldoSector`, `getSaldosSectoresPorForma`, `getSaldoSectorPorForma` | Saldos de sectores calculados con un `UNION ALL` de repartos (suman) y gastos (restan). Ver 8.3. |
| `listados.ts` | `getTotalIngresosPeriodo`, `getIngresosMes`, `getGastosSector`, `getHistorialAhorro` | Listas por período. `RangoFechas = { desde (incluido), hasta (excluido) }` en ISO UTC. `getIngresosMes` une cada ingreso con su reparto por sector. `getHistorialAhorro` mezcla "entradas" (repartos a Ahorro) y "salidas" (retiros con motivo), más nuevos primero, hasta `limite = 200` y avisa si `hayMas`. |
| `vistaSector.ts` | `cargarVistaSector(db, sectorId, ahora?)` | Todo lo que necesita la pantalla de un sector, según su tipo: `{clase:'ingresos'}` (ingresos del mes), `{clase:'gastos'}` (saldo, saldo por forma y gastos del mes) o `{clase:'ahorro'}` (saldo, saldo por forma e historial). `null` si el sector no existe. |
| `detalleMovimiento.ts` | `getDetalleMovimiento(db, id)` | Movimiento + nombre de su sector + (solo ingresos) su reparto; `null` si no existe o está eliminado. Lo usa la pantalla de detalle. |
| `estadisticas.ts` | `getGastosPeriodo`, `getRepartosPeriodo`, `cargarEstadisticas` | Ver sección 11. |
| `notificaciones.ts` | `contarNoLeidas`, `getNotificaciones`, `marcarVistas` | Ver sección 12. |
| `sincronizacion.ts` | `leerCacheSincronizacion`, `guardarUsuarioCache`, `guardarParejaCache`, `limpiarCacheSincronizacion` | Copia local (en `ajustes`) de "quién soy" y "quién es mi pareja", validada al leer (un JSON dañado se trata como inexistente). Al cerrar sesión se borra la cuenta y la pareja, **no** los movimientos ni saldos. |

### 9.1 Patrón de las operaciones de cambio

```
pantalla  →  valida (utils/*Validation.ts)  →  query (vuelve a validar)
          →  cálculo de saldos antes/después →  ¿empeora un negativo?
                 sí → { estado: 'saldo_insuficiente', avisos }  (no se guardó nada)
                 no → withTransactionAsync { movimiento + repartos + cuentas }
                      → { estado: 'guardado' }
```

La pantalla decide qué mostrar según `estado`; los errores de validación "imposibles" (monto ≤ 0, sector inexistente) se lanzan como `Error` con mensaje en español.

## 10. Utilidades (`src/utils/`)

Funciones **puras** (sin base de datos ni pantalla), fáciles de probar. Los comentarios del código están en español.

| Archivo | Contenido |
|---|---|
| `montos.ts` | `MAX_ENTEROS`, `aCentavos`, `deCentavos`, `limpiarMontoTexto`, `parseMontoCentavos`. Ver 8.2. |
| `formatters.ts` | `redondear`, `simboloMoneda`, `formatMonto`. |
| `constants.ts` | `PALETA_SECTORES` (8 colores para sectores personalizados), `FORMA_LABEL` (nombre de cada forma), `ORIGENES` (los 4 orígenes de ingreso en orden de aparición). |
| `etiquetas.ts` | `origenLabel(origen)` ("salario" → "Salario"; por defecto "Ingreso") y `monedaDeForma(forma)`. |
| `saldos.ts` | `resumenSaldos(cuentas)` → `{efectivo, transferencia, usd, totalCup}`. |
| `saldoForma.ts` | `empeoraNegativo`, `disponibleParaGastar` (lo menor entre cuenta y sector) y `bloqueosGasto` (mensajes de por qué no se puede gastar). Ver 8.5–8.6. |
| `totales.ts` | `totalesPorForma(items)`: suma una lista separando por forma, en centavos. |
| `ingresoValidation.ts` | `validarIngreso(entrada, sectores)` → errores por campo, `faltaCentavos`, y repartos listos. Ver 8.4. |
| `gastoValidation.ts` | `validarGasto`, `limitesTexto(esAhorro)`, `tipoMovimientoDeSector`. Constantes `CONCEPTO_MIN/MAX = 2/40`, `MOTIVO_MIN/MAX = 3/60`. |
| `sectorValidation.ts` | `validarSector(entrada, existentes)`, `normalizarNombre`. Constantes `NOMBRE_MIN/MAX = 2/24`, `USO_MIN/MAX = 3/80`. Nombres únicos sin distinguir mayúsculas ni tildes (la ñ se conserva distinta). |
| `cuentaValidation.ts` | Validaciones del formulario de cuenta y de pareja (correo, contraseña, nombre, código). Ver sección 13. |
| `fechas.ts` | Períodos y etiquetas en **hora local**: `rangoMes`, `rangoPeriodo`, `rangoComparable`, `formatFechaHora`, `claveDia`, `diasEntre`, `diasTranscurridos`, `etiquetaRango`, `etiquetaDia`, `etiquetaMes`, `mesCorto`. Ver 11.1. |
| `estadisticas.ts` | `agregarGastos` y `porcentaje`. Ver sección 11. |
| `analisis.ts` | Todo el análisis de la pantalla Estadísticas. Ver sección 11. |
| `notificaciones.ts` | Textos y reglas de las notificaciones. Ver sección 12. |
| `teclado.ts` | `desplazamientoParaVer` y `solapeConTeclado`. Ver sección 19. |
| `dialogos.ts` | `confirmar({titulo, mensaje, textoConfirmar, textoCancelar?, destructivo?})` → `Promise<boolean>` sobre `Alert.alert`; `false` si se cancela o se cierra el aviso. |
| `errors.ts` | `mensajeError(e)`: cualquier error → texto legible. |
| `uuid.ts` | `newId()`: UUID v4 con `expo-crypto`. |

## 11. Estadísticas y análisis

La pestaña **Estadísticas** muestra, para un período elegido, un resumen, comparación, gráficos y mensajes automáticos. La arquitectura es: **la consulta lee, las funciones puras calculan, los componentes dibujan.**

```
pantalla estadisticas.tsx
   └─ cargarEstadisticas(db, periodo, desplazamiento)        src/db/queries/estadisticas.ts
        ├─ rangoPeriodo / rangoComparable                    src/utils/fechas.ts
        ├─ getGastosPeriodo, getTotalIngresosPeriodo, getRepartosPeriodo   (SQL)
        ├─ agregarGastos  → stats                            src/utils/estadisticas.ts
        └─ analizarPeriodo → analisis                        src/utils/analisis.ts
```

### 11.1 Períodos (`src/utils/fechas.ts`)

`Periodo = 'dia' | 'semana' | 'mes' | 'anio'`. `rangoPeriodo(periodo, ahora, desplazamiento)` devuelve `{inicio, fin, desde, hasta, etiqueta}`:

- `desplazamiento`: `0` = el período actual, `-1` = el anterior, etc.
- Todo se calcula en **hora local** con `new Date(año, mes, día)` (respeta cambios de hora: un día puede durar 23 o 25 h) y luego se convierte a ISO UTC (`desde`/`hasta`) para consultar la base.
- **La semana va de lunes a domingo**; el año, del 1 de enero al 31 de diciembre.
- Etiquetas: `"Hoy, 13 nov"`, `"Ayer, 12 nov"`, `"9 – 15 nov 2026"`, `"Noviembre 2026"`, `"2026"`.

`rangoComparable` define con qué se compara: el período inmediatamente anterior. **Si se mira el período actual (semana, mes o año) que aún no terminó, se compara contra el mismo tramo del anterior** (los mismos primeros días), para no decir "gastaste 60 % menos" solo porque el mes va por la mitad (`parcial = true`). El día se compara contra el día anterior completo.

### 11.2 Agregación (`agregarGastos`)

Suma los gastos del período en centavos y devuelve `Estadisticas`:
`totalCup`, `totalUsd`, `cantidad`, `porForma`, `porcentajeForma` (efectivo/transferencia sobre el total en pesos), `porSector` (ordenado de más a menos gasto en pesos) y `porDia` (**todos** los días del período, con 0 los que no tuvieron gasto). Un "gasto" es todo movimiento que no es ingreso, **incluidas las salidas de ahorro**.

### 11.3 Análisis (`analizarPeriodo` en `src/utils/analisis.ts`)

Devuelve `AnalisisPeriodo`:

| Campo | Función | Qué calcula |
|---|---|---|
| `resumen` | `resumirPeriodo` | Ingresos, gastos y balance (en pesos y USD por separado) y `porcentajeGastado` (gastos/ingresos en pesos; `null` si no hubo ingresos en pesos). |
| `comparacion` | `calcularVariacion` | Por cada una de 4 cifras (gastos/ingresos × pesos/USD): `actual`, `anterior`, `cambio` en % y `tendencia` (`sube`, `baja`, `igual` si el cambio es < 0,5 %, `nuevo` si antes era 0, `sin_datos`). `null` si todo es `sin_datos`. |
| `evolucion` | `calcularEvolucion` | Barras por **día** (semana y mes) o por **mes** (año); no existe para el período "día". Incluye máximo, promedio de las barras ya empezadas e índice de la barra más alta. Las barras futuras llevan `futura: true`. |
| `detalle` | `calcularDetalle` | Nº de transacciones (pesos/USD), promedio por transacción, día/mes de mayor y menor gasto, cuántos días sin gasto, **top 5** gastos individuales (`MAX_RANKING`), el mayor gasto en USD y los **conceptos** en los que más se gasta (se agrupan "Arroz", "arroz " y "ARROZ" con `claveConcepto`). |
| `insights` | `generarInsights` | Mensajes automáticos (ver abajo). |
| `estimacion` | `estimarCierreMes` | Solo en el **mes actual desde el día 5** (`DIA_MINIMO_ESTIMACION`) y si ya hubo gastos en pesos: proyección de cierre (`gasto × díasDelMes / díasTranscurridos`), ritmo diario y si superaría los ingresos del mes. |
| `usoSectores` | `calcularUsoSectores` | Por sector: lo **repartido** en el período contra lo **gastado**; `porcentajeUsado`, `libre` (repartido − gastado, puede ser negativo). El sector Ingresos no cuenta. |

**Mensajes automáticos** (umbrales exportados como constantes):

1. `concentracion`: un sector acumula más del 50 % (`UMBRAL_CONCENTRACION`) de los gastos en pesos (y hay al menos 2 sectores con gasto).
2. `subida`: el sector cuyo gasto más subió respecto al período anterior, si subió ≥ 30 % (`UMBRAL_SUBIDA`) **y** esa subida pesa ≥ 5 % (`UMBRAL_PESO_SUBIDA`) del gasto total.
3. `sobregiro_cup` / `sobregiro_usd`: se gastó más de lo ingresado.
4. `sin_ingresos`: hubo gastos pero ningún ingreso en el período.

Cada insight tiene `tono: 'info' | 'alerta'`.

### 11.4 Componentes de la pantalla (`src/components/estadisticas/`)

`SelectorPeriodo` (día/semana/mes/año y flechas ← →), `ResumenPeriodoCard`, `ComparacionCard`, `DonaCard` + `DonaChart` (dona SVG de gastos por sector), `EvolucionChart` (barras), `RankingCard`, `UsoSectoresCard`, `AnalisisCard`. Los gráficos se dibujan con `react-native-svg`.

## 12. Notificaciones

La **campana** de Inicio (arriba a la derecha) avisa de lo que registra tu pareja. No usa notificaciones push del sistema: son avisos dentro de la app, construidos **sin tablas nuevas ni cambios en Supabase**, a partir de los movimientos que ya llegan por sincronización.

### 12.1 Qué cuenta como "nuevo"

Un movimiento es **nuevo** si cumple todo esto (`src/db/queries/notificaciones.ts`):

- Lo registró **tu pareja**: `registrado_por` no es `NULL` y es distinto de tu id de cuenta.
- No está eliminado.
- Llegó a este teléfono **después** de la última vez que abriste las notificaciones: `rowid > marca`, donde la marca es el ajuste `notif_visto_rowid`. El `rowid` de SQLite crece con cada movimiento que entra al teléfono (registrado aquí o bajado de la pareja), así que sirve para saber qué llegó después **aunque la pareja lo registrara hace rato sin internet**.
- Tiene menos de **7 días** (`VENTANA_NUEVAS_DIAS`), para que una primera descarga grande no llene la campana de avisos.

Consecuencias de diseño: una **edición** de tu pareja sobre un movimiento que ya tenías no cuenta como nuevo (el `rowid` no cambia); y una **eliminación** hace que el movimiento desaparezca de la lista y del número. Se atribuye a quien *registró* el movimiento, no a quien lo editó (la base no guarda quién editó; añadirlo exigiría una migración y cambios en el motor).

### 12.2 Funciones

| Función | Qué hace |
|---|---|
| `contarNoLeidas(db, yoId, ahora?)` | Cuenta los nuevos. Sin cuenta (`yoId = null`) siempre devuelve 0. |
| `getNotificaciones(db, yoId, ahora?, limite = 50)` | Los últimos 50 movimientos de los dos (`created_at DESC, rowid DESC`) con `nuevo` marcado, más `noLeidas` y `hastaRowid`. Lee `MAX(rowid)` **antes** de la lista: si algo llega justo en medio, queda sin marcar y se vuelve a avisar. |
| `marcarVistas(db, hasta?)` | Avanza la marca hasta `hasta` (el `hastaRowid` de la lista mostrada) sin pasar de `MAX(rowid)` y **nunca retrocede**. Una marca por delante de la base (por ejemplo, tras reiniciar los datos) se ignora y cuenta desde 0. |

`src/utils/notificaciones.ts` contiene los textos: `autorDe` ("Tú", el nombre del miembro, o "Tu pareja" si no se conoce), `fraseNotificacion` ("Beto registró un gasto", "Registraste un ingreso", "Se registró un retiro de ahorro"), `detalleNotificacion` ("Arroz · Gustos · Efectivo"), `montoConSigno` (`+` ingreso, `-` lo demás), `textoReciente` ("hace 5 min" el primer día, luego la fecha), `inicialDe` y `textoInsignia` ("9+" a partir de 10).

### 12.3 Interfaz

- `CampanaNotificaciones` (`components/inicio/`): botón con insignia roja; recarga el conteo al enfocar la pantalla y cuando `datosVersion` cambia (llegaron cambios de la pareja); abre `/notificaciones`.
- `app/notificaciones.tsx`: lista con `NotificacionItem`. Al entrar, **acumula los ids nuevos de esta visita** (siguen resaltados mientras estás ahí) y luego llama `marcarVistas`, de modo que la campana vuelve a cero al regresar a Inicio.
- Tocar una notificación abre `app/movimiento/[id].tsx` (detalle: monto, quién lo registró, sector y concepto/origen, fecha, última edición si pasó más de 60 s entre `created_at` y `updated_at`, reparto de un ingreso, y botón "Editar o eliminar" que abre las pantallas de edición ya existentes).
- Estado en `useNotificacionesStore` (sección 16).

## 13. Cuentas y pareja

La sincronización necesita saber **quién eres** (cuenta) y **con quién compartes** (pareja). Es opcional: sin cuenta, la app sigue funcionando en local.

### 13.1 Cliente de Supabase (`src/lib/supabase.ts`)

- Importa `expo-sqlite/localStorage/install`, que instala un `localStorage` respaldado por SQLite; ahí guarda Supabase la **sesión** (`persistSession: true`, `autoRefreshToken: true`).
- Lee `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con `leerConfigSupabase(url, llave)`. Si faltan, o la URL no es `https://`, el cliente exportado es **`null`** y toda la app lo trata como "sin configurar" (`configurado = false`).
- Enlaza el ciclo de vida de la app con la renovación del token: `AppState` activa → `startAutoRefresh()`; en segundo plano → `stopAutoRefresh()`.
- No detecta la sesión en la URL (`detectSessionInUrl: false`): en móvil no hay redirecciones.

### 13.2 Servicio (`src/lib/cuentaService.ts`)

Funciones que reciben el cliente por parámetro (`ClienteCuentas`) y devuelven datos tipados o lanzan **`ErrorCuenta`** (mensaje ya en español; propiedad `sinConexion` si falló por falta de internet).

| Función | Qué hace |
|---|---|
| `llamarRpc(cliente, nombre, args?)` | Envoltorio de `cliente.rpc(...)`: convierte cualquier error de Supabase o de red en `ErrorCuenta` traducido. **Todas** las llamadas al servidor pasan por aquí (también las del motor de sync). |
| `registrarse(cliente, {email, password})` | `auth.signUp`. El proyecto Supabase de la app tiene **desactivado** «Confirm email», así que la sesión llega al instante. Si algún día se activara, `registrarse` lanza un `ErrorCuenta` que explica que hay que confirmar el correo (la cuenta se crea, pero no se inicia sesión). |
| `entrar(cliente, {email, password})` | `auth.signInWithPassword`. |
| `salir(cliente)` | `auth.signOut({ scope: 'local' })`: cierra la sesión **solo en este teléfono**. |
| `sesionActual(cliente)` | Devuelve `{tipo:'activa', usuario}`, `{tipo:'ninguna'}` o `{tipo:'sin_conexion'}`. Distingue "no hay sesión" de "no pude comprobarla". |
| `getPareja(cliente)` | RPC `mi_pareja` → `ParejaInfo` (`pareja_id`, `codigo`, `miembros[]` con `soy_yo`) o `null`. |
| `crearPareja(cliente, nombre)` | RPC `crear_pareja`; luego relee la pareja. |
| `unirPareja(cliente, codigo, nombre)` | RPC `unir_pareja`; luego relee la pareja. |
| `cambiarMiNombre(cliente, nombre)` | RPC `cambiar_mi_nombre`; luego relee la pareja. |

### 13.3 Validaciones (`src/utils/cuentaValidation.ts`)

Constantes: `NOMBRE_PAREJA_MAX = 20`, `PASSWORD_MIN = 8`, `PASSWORD_MAX = 72`, `CODIGO_LARGO = 8`.

| Función | Qué valida |
|---|---|
| `validarEmail` | Formato de correo; devuelve el valor en minúsculas y sin espacios. |
| `validarPasswordNueva` | 8–72 caracteres (al crear cuenta). |
| `validarPasswordEntrada` | Solo que no esté vacía (al entrar; no se re-exigen reglas nuevas a cuentas viejas). |
| `validarRepetirPassword` | Coincide con la anterior. |
| `validarNombrePareja` | 1–20 caracteres tras limpiar espacios. |
| `validarCodigo` | 8 caracteres del alfabeto permitido (`CODIGO_ALFABETO`); tolera guiones, espacios y minúsculas. |
| `leerConfigSupabase(url, llave)` | Valida las variables de entorno: la URL debe ser `https://…` y la llave no vacía; si no, `null` (modo solo local). |
| `normalizarCodigo` / `formatearCodigo` | `abcd efgh` → `ABCDEFGH`; `ABCDEFGH` → `ABCD-EFGH`. |
| `traducirErrorSupabase` | Convierte el mensaje/código de Supabase en español claro. |
| `esErrorDeRed` | Detecta fallos de red (`network request failed`, `timeout`, `offline`…) para marcar `sinConexion`. |

El **alfabeto del código** es `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (31 caracteres: sin `0`, `O`, `1`, `I`, `L`, que se confunden al dictarlos).

### 13.4 Flujo en la interfaz (`app/sincronizacion.tsx`)

La ventana muestra una cosa según el estado de `useSesionStore`:

```
¿configurado?  no ──► SinConfigurar      (instrucciones para el .env)
      │ sí
¿cargando?     sí ──► indicador
      │ no
¿hay usuario?  no ──► FormularioCuenta   (Entrar / Crear cuenta)
      │ sí
¿hay pareja?   no ──► FormularioPareja   (Crear pareja / Tengo un código)
      │ sí
                └──► VistaPareja         (código, miembros, estado de sync, cambiar nombre, cerrar sesión)
```

- Quien **crea** la pareja recibe el código y lo comparte (botón "Compartir código", `Share.share`). Mientras falte la otra persona, `VistaPareja` muestra el código y un botón "Ya se unió, actualizar".
- Quien **se une** escribe su nombre y el código. No puede haber dos nombres iguales en la pareja (sin distinguir mayúsculas).
- Quien ya tenía pareja (otro teléfono, reinstalación) la **recupera automáticamente** al entrar (`entrar` → `refrescar`).
- `CerrarSesionBoton`: **antes de preguntar** intenta sincronizar lo pendiente; avisa cuántos cambios no llegaron a la pareja; al confirmar cierra la sesión **sin borrar movimientos ni saldos** del teléfono.

### 13.5 Copia local de la cuenta

`src/db/queries/sincronizacion.ts` guarda en `ajustes` una copia de la cuenta (`sync_cuenta`) y de la pareja (`sync_pareja`) para mostrarlas **sin internet** al abrir la app. Se valida al leer (un JSON dañado se trata como inexistente). `limpiarCacheSincronizacion` las borra al cerrar sesión o si Supabase confirma que ya no hay sesión.

## 14. Sincronización

Es la parte más delicada del proyecto. Léela entera antes de tocar `src/sync/` o las tablas sincronizables.

### 14.1 Idea general

- La base **local** es siempre la fuente de lo que se ve. Todo se guarda primero aquí.
- Con internet, el motor hace dos cosas: **subir** (push) lo que cambió aquí y **bajar** (pull) lo que cambió en el teléfono de la pareja.
- Se sincronizan **solo 3 tablas**: `sectores`, `movimientos` y `repartos`. **No** se sincronizan `cuentas` (sus saldos se **recalculan**) ni `ajustes`.
- Los ids los crea cada teléfono (UUID; los 4 sectores base tienen id fijo), por lo que **repetir una subida o una bajada no duplica nada** (todo es idempotente).
- Si los dos teléfonos cambian la misma fila, gana el `updated_at` más reciente (*last-write-wins*, LWW).
- No hay *tiempo real*: la app consulta periódicamente (ver 14.10). El tiempo real es la Fase 8C, no iniciada.

### 14.2 Piezas

| Archivo | Responsabilidad |
|---|---|
| `src/sync/syncSql.ts` | SQL de la migración local v3: `sync_cola`, `sync_aplicando` y los disparadores. Sin imports de Expo. |
| `src/sync/tablas.ts` | Columnas de cada tabla sincronizable y conversión de filas del servidor a filas locales (`aFilaLocal`, `aIsoLocal`, `sqlUpsert`, `filasIguales`, `restarMs`, `ORDEN_TABLAS`). |
| `src/sync/motor.ts` | El motor: activación, subir, bajar, reparar, recalcular saldos y `sincronizar`. |
| `src/sync/ajustes.ts` | `getAjuste` / `setAjuste` / `delAjuste` sobre la tabla `ajustes`. |
| `src/sync/sesionSync.ts` | `sesionSyncDe` (cuenta+pareja → `SesionSync`), `claveSesionSync` (texto que solo cambia si cambia la sesión) y `textoHace` ("hace 5 min"). |
| `src/store/syncStore.ts` | Estado observable de la sincronización (`crearSyncStore`). |
| `src/components/sincronizacion/SyncIniciador.tsx` | Componente sin interfaz que activa y programa la sincronización. |
| `supabase/migrations/20261116000100_sync_rpc.sql` | Funciones del servidor `sync_push`, `sync_pull`, `sync_resumen`. |

### 14.3 La cola de cambios (qué hay que subir)

Dos tablas locales y varios disparadores (creados en la migración v3):

- **`sync_cola(tabla, fila_id, seq)`**: una fila por registro que cambió y aún no se subió. `seq` crece con cada cambio.
- **`sync_aplicando(tabla, fila_id)`**: marca temporal "este cambio viene de la pareja".
- Los **6 disparadores** `sync_<tabla>_ins|upd` hacen `INSERT OR REPLACE INTO sync_cola` con `seq = MAX(seq)+1`, pero **solo** si `sync_activo = '1'` **y** el registro no está en `sync_aplicando`.
- **`sync_movimientos_autor`** rellena `registrado_por` en movimientos nuevos con la cuenta de la sesión.

Consecuencias:

1. Registrar, editar y eliminar **no llaman nunca** al motor: escriben como siempre y la base anota el pendiente.
2. Un cambio que llega de la pareja se aplica con la marca puesta en `sync_aplicando`, así no rebota de vuelta.
3. **¿Por qué `seq`?** Si un registro cambia *mientras* se está subiendo, recibe un `seq` mayor; al terminar la subida solo se saca de la cola `WHERE seq = <el que se subió>`, así el cambio nuevo se queda para la próxima vuelta y no se pierde.

### 14.4 Activación

Se activa automáticamente cuando hay **cuenta + pareja** (`SyncIniciador` → `syncStore.preparar`).

```
prepararActivacion(db, cliente, sesion)
 ├─ ¿ya activa con esta cuenta y esta pareja?                    → listo
 ├─ ¿este teléfono ya estuvo conectado a esta MISMA pareja?       → (no se pregunta) completarActivacion('unir')
 ├─ ¿tiene movimientos locales Y la pareja ya tiene movimientos?  → { tipo:'decidir', locales, remotos }
 └─ en cualquier otro caso                                        → completarActivacion('unir')
```

Solo se pregunta si **ambos lados ya tienen movimientos** (se consulta `sync_resumen`). Si uno está vacío, se llena con lo del otro sin preguntar. En el estado `'decidir'` la sincronización **no corre**; la interfaz muestra `DecisionUnir`:

| Opción | Qué hace |
|---|---|
| **Unir los movimientos** (`'unir'`) | Conserva lo de este teléfono y lo sube junto a lo de la pareja. |
| **Empezar con los de mi pareja** (`'empezar'`) | **Borra** de este teléfono repartos, movimientos y sectores personalizados, y baja todo lo de la pareja. Pide confirmación (acción destructiva). |

`completarActivacion` (todo en **una transacción**):

1. Apaga `sync_activo`, vacía `sync_cola` y `sync_aplicando` (para que los disparadores no anoten nada mientras se prepara).
2. `'empezar'`: borra repartos, movimientos y sectores `personalizado`, y recalcula saldos. `'unir'`: pone `registrado_por = <esta cuenta>` en los movimientos sin dueño o con un dueño que no es de esta pareja.
3. Si es otra pareja distinta (o `'empezar'`), **borra los cursores** de bajada para bajar desde el principio.
4. Guarda `sync_usuario_id` y `sync_pareja_id`.
5. **Subida inicial:** mete *todo* lo local en `sync_cola` (es seguro repetir: subir es idempotente).
6. Enciende `sync_activo = '1'`.

`desactivar(db)` (cerrar sesión): apaga `sync_activo` y vacía la cola. **No toca los datos.** Al volver a entrar con la misma cuenta y pareja se reactiva sin preguntar y todo se vuelve a subir.

### 14.5 Subir (push) — `subirPendientes`

1. Lee la cola por tabla, ordenada por `seq`, en **lotes de 300** (`LOTE_SUBIDA`). Entradas cuyo registro ya no existe se descartan.
2. Llama a la RPC **`sync_push`** con tres listas (`p_sectores`, `p_movimientos`, `p_repartos`). En el servidor es **"todo o nada"** por llamada: un ingreso y su reparto llegan juntos.
3. Si tuvo éxito, borra de la cola **solo** las entradas con el mismo `seq` que se subió.
4. Repite hasta vaciar la cola (máximo 30 vueltas, `MAX_VUELTAS_SUBIDA`).
5. Si falla, **nada sale de la cola**: se reintentará.

### 14.6 Bajar (pull) — `bajarCambios`

**Cursor.** Para cada tabla se guarda en `ajustes` (`sync_cursor_<tabla>`) un JSON `{ts, id}` con la posición del último registro aplicado: `ts` = `server_updated_at` (hora del **servidor**, no del teléfono) e `id`. El servidor devuelve lo que está **después** de `(ts, id)` en orden `(server_updated_at, id)` (*keyset pagination*, estable aunque haya muchas filas con la misma hora).

**Solape de 30 s.** Al pedir se retrocede `SOLAPE_MS = 30 000` ms desde el cursor. Si dos envíos se cruzaron en el servidor y uno "llegó tarde" con una hora anterior, no se pierde. Como aplicar es idempotente y se compara con `filasIguales`, releer filas ya conocidas no cuesta correcciones.

**Pasos** (`pedirTabla` + `aplicarBajado`):

1. `pedirTabla`: pide páginas de **500** (`LOTE_BAJADA`) con la RPC `sync_pull(p_tabla, p_ts, p_id, p_limite)` hasta recibir una página incompleta.
2. `aplicarBajado`, **todo en una transacción** y en este orden: `sectores → movimientos → repartos` (`ORDEN_TABLAS`; un movimiento necesita su sector y un reparto necesita su movimiento y su sector).
   - `aFilaLocal` convierte la fila (fechas con microsegundos y `+00:00` → ISO con milisegundos y `Z`, números como texto → número, booleano → 0/1). **Una fila dañada se omite** sin bloquear al resto.
   - `faltaDependencia`: si falta el sector/movimiento que la fila necesita, **se detiene ahí en esa tabla** y el cursor **no avanza más allá**; se reintentará (el motor repite hasta 3 vueltas, `MAX_VUELTAS_BAJADA`).
   - Si la fila local no es idéntica, se inserta con `sqlUpsert` (`ON CONFLICT(id) DO UPDATE … WHERE excluded.updated_at >= tabla.updated_at`) envuelta en la marca de `sync_aplicando`.
   - El cursor solo avanza si el nuevo punto es **posterior** al anterior (`posterior`).
3. Si algo cambió: `repararRepartos` y `recalcularSaldosCuentas` (14.8 y 14.9).

### 14.7 Conflictos: last-write-wins

- **Servidor** (`sync_push`): `ON CONFLICT … DO UPDATE … WHERE excluded.updated_at >= t.updated_at`. La versión más nueva gana; con la **misma** hora gana la que llega última, para que los dos teléfonos terminen igual.
- **Local** (`sqlUpsert`): misma regla con `>=`.
- **Trigger del servidor** (`sync_antes_de_escribir`): pone `server_updated_at = clock_timestamp()` (reloj del servidor), limita `updated_at` a **5 minutos en el futuro** (un teléfono con el reloj adelantado no puede ganar siempre) y **impide cambiar** `pareja_id`, `id` y `created_at` en una actualización.
- El conflicto se resuelve **por fila completa**, no por campo.

### 14.8 `repararRepartos`

Un ingreso y su reparto son **una unidad**, pero viajan como filas distintas. Si los dos teléfonos editan el mismo ingreso sin internet, cada uno marca el reparto viejo como eliminado y crea repartos nuevos; al juntarse habría **dos repartos vigentes**. La reparación:

1. Elimina los repartos vigentes de un ingreso **eliminado**.
2. Si un ingreso tiene repartos de varias ediciones, **gana la edición más reciente**: los repartos con `created_at` menor al máximo se eliminan (todos los de una misma edición comparten `created_at`).

Estos cambios **sí** se anotan como pendientes, para que la pareja converja al mismo resultado; por eso `sincronizar` sube otra vez si, tras bajar, quedó algo en la cola.

### 14.9 Saldos: se recalculan, no se sincronizan

`recalcularSaldosCuentas(db)`: para cada forma, `saldo = ROUND(SUM(ingresos − resto), 2)` sobre movimientos no eliminados, y solo escribe si el valor cambió. Se llama al activar con `'empezar'` y tras cada bajada que cambió algo. Los saldos de **sectores** nunca se guardan (se derivan de movimientos y repartos), así que no necesitan recálculo.

### 14.10 `sincronizar` y el programador

`sincronizar(db, cliente)` en `motor.ts`:

- **Un candado por base** (`WeakMap enCurso`): si ya hay una en marcha, devuelve esa misma promesa; nunca corren dos a la vez.
- Si `sync_activo` no es `'1'`, no hace nada.
- Orden: `subirPendientes` → `bajarCambios` → (si bajó algo y quedó algo en la cola) `subirPendientes` otra vez → guarda `sync_ultima`.
- Lanza `ErrorCuenta` si falla; lo pendiente queda en la cola.

`SyncIniciador` (componente sin interfaz, montado en el layout raíz) decide **cuándo**:

| Situación | Comportamiento |
|---|---|
| Cambia la cuenta o la pareja (`claveSesionSync`) | Cola serializada (`cadena`): sin usuario → `desactivar`; con sesión completa → `preparar` (que sincroniza al final). |
| Cada **6 s** (`REVISION_MS`) | Lee cuántos pendientes hay (lectura local, no gasta internet). Sincroniza si hay pendientes **o** si pasaron **45 s** (`BAJADA_MS`) desde el último intento (para ver cambios de la pareja). |
| La app vuelve a primer plano | Sincroniza de inmediato (`forzar`) y reinicia los contadores de fallos. |
| Sin conexión | Reintenta a los **15 s** (`REINTENTO_SIN_CONEXION_MS`). |
| Otro error | Espera 15 s, 30 s, 60 s… duplicando hasta **5 min** (`REINTENTO_ERROR_MAX_MS`). |
| App en segundo plano / estado `sincronizando` / `decidir` | No hace nada. |

Además, *pull-to-refresh* en Inicio sincroniza (con un máximo de espera de 20 s) y recarga.

### 14.11 Estado observable (`syncStore`)

`estado`: `'inactivo' | 'decidir' | 'sincronizando' | 'ok' | 'sin_conexion' | 'error'`, más `activo`, `pendientes`, `ultimaSync`, `error`, `decision` y **`datosVersion`**.

`datosVersion` sube cuando **llegaron cambios de la pareja** (`bajados > 0`) o tras `'empezar'`. **Todas las pantallas** que leen datos lo incluyen en las dependencias de su `useFocusEffect` para volver a leer la base local. Si añades una pantalla que muestra datos, **debes** hacer lo mismo o no se actualizará al llegar cambios.

`sincronizar` del store **nunca lanza**: traduce el error a `estado`/`error` (`sin_conexion` si `ErrorCuenta.sinConexion`).

### 14.12 Qué NO hace

- No hay tiempo real (Fase 8C pendiente).
- No sincroniza `cuentas` ni `ajustes`.
- No registra **quién editó** un movimiento, solo quién lo **creó** (`registrado_por`).
- Los conflictos son por fila completa (LWW), no por campo.
- Si dos teléfonos gastan el mismo dinero sin conexión, al juntarse **puede quedar un saldo negativo**; la regla `empeoraNegativo` evita bloquear cambios posteriores que lo mejoren (ver 8.6 y 25).

## 15. Backend Supabase

Supabase aporta **Auth** (correo + contraseña), **Postgres** y las **funciones RPC** que usa la app. No hay servidor propio ni Edge Functions.

### 15.1 Preparar un proyecto desde cero

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. **Authentication → Providers → Email:** desactiva **«Confirm email»** (la app espera recibir la sesión al crear la cuenta).
3. **SQL Editor → New query:** pega y ejecuta, **en este orden y una sola vez cada uno**:
   1. `supabase/migrations/20261115000100_pareja_y_datos.sql` (Fase 8A: pareja, miembros, tablas, RLS).
   2. `supabase/migrations/20261116000100_sync_rpc.sql` (Fase 8B: `sync_push`, `sync_pull`, `sync_resumen`).
4. Copia la **URL** y la **publishable key** a `.env` (sección 4.3).
5. Recomendado: en el panel de *Authentication* activa **«Leaked password protection»** (el *advisor* de seguridad de Supabase lo sugiere; es un ajuste del panel, no se hace con SQL, y puede requerir un plan de pago según el proyecto).

> Los dos archivos **no se editan una vez ejecutados**. Un cambio de esquema se hace con un archivo nuevo (por ejemplo `2026MMDD000100_descripcion.sql`).

### 15.2 Tablas

| Tabla | Para qué |
|---|---|
| `parejas` | `id`, `codigo` (8 caracteres, único, `CHECK` con el alfabeto sin caracteres confusos), `creada_por` (`ON DELETE SET NULL`: si se borra la cuenta, la pareja y sus datos no se pierden). |
| `miembros` | `user_id` (PK: **una cuenta, una pareja**), `pareja_id`, `nombre` (1–20 caracteres, sin espacios sobrantes). Índice único `(pareja_id, lower(nombre))`: **dos nombres iguales no caben en una pareja**. |
| `sectores`, `movimientos`, `repartos` | Espejo de las tablas locales + `pareja_id` y `server_updated_at`. Clave primaria `(pareja_id, id)`. **Sin claves foráneas entre ellas a propósito:** sin conexión las filas pueden llegar en cualquier orden. |

Diferencias con la base local: fechas `timestamptz`; `monto numeric(14,2)`; `registrado_por uuid` referencia `auth.users` (`ON DELETE SET NULL`); índices `*_pull_idx (pareja_id, server_updated_at)` para pedir "lo nuevo" rápido.

### 15.3 Funciones

| Función | Seguridad | Qué hace |
|---|---|---|
| `crear_pareja(p_nombre)` | `SECURITY DEFINER` | Valida sesión y nombre, genera código (hasta 10 intentos si choca), crea la pareja y te agrega como miembro. Devuelve `{pareja_id, codigo}`. |
| `unir_pareja(p_codigo, p_nombre)` | `SECURITY DEFINER` | Normaliza el código, bloquea la fila de la pareja (`FOR UPDATE`) y comprueba: existe, no está completa (máx. 2) y tu nombre no repite el de tu pareja. |
| `mi_pareja()` | `SECURITY DEFINER` | `{pareja_id, codigo, miembros:[{user_id, nombre, soy_yo}]}` o `null`. |
| `cambiar_mi_nombre(p_nombre)` | `SECURITY DEFINER` | Cambia tu nombre (con la misma regla de no repetir). |
| `mi_pareja_id()` | `SECURITY DEFINER`, `STABLE` | Id de tu pareja; **la usan todas las políticas RLS**. |
| `generar_codigo_pareja()` | interna | Código aleatorio de 8 caracteres (alfabeto de 31). No se puede llamar desde la API. |
| `sync_push(p_sectores, p_movimientos, p_repartos)` | `SECURITY INVOKER` | Sube lotes (máx. 1000 por lista); `ON CONFLICT … WHERE excluded.updated_at >= t.updated_at` (LWW). Solo acepta `registrado_por` si es miembro de la pareja; si no, queda vacío. |
| `sync_pull(p_tabla, p_ts, p_id, p_limite)` | `SECURITY INVOKER`, `STABLE` | Filas con `(server_updated_at, id) > (p_ts, p_id)` ordenadas, máx. 1000 (por defecto 500). Solo tablas `sectores`, `movimientos`, `repartos`. |
| `sync_resumen()` | `SECURITY INVOKER`, `STABLE` | `{movimientos, sectores_personalizados}` no eliminados: lo usa la activación para decidir si preguntar. |

Las tres funciones `sync_*` corren con los permisos de **quien llama**: la seguridad (RLS) sigue decidiendo qué filas puede ver o escribir. Cada una comprueba que haya sesión y que la cuenta tenga pareja.

### 15.4 Disparadores

| Disparador | Qué hace |
|---|---|
| `miembros_maximo_dos` | Antes de insertar un miembro, bloquea la pareja y rechaza si ya tiene 2 (garantía de la base aunque alguien se salte las funciones). |
| `sectores_sync`, `movimientos_sync`, `repartos_sync` → `sync_antes_de_escribir` | Fija `server_updated_at` con el reloj del servidor, limita `updated_at` a +5 min y protege `pareja_id`/`id`/`created_at` en updates. |
| `movimientos_registrado_por` → `movimientos_registrado_por_valido` | `registrado_por` debe ser una de las 2 cuentas de **esa** pareja. |

### 15.5 Seguridad (RLS)

- **RLS activado en todas las tablas.**
- `parejas` y `miembros`: solo `SELECT` de **tu propia** pareja. Se modifican únicamente por las funciones.
- `sectores`, `movimientos`, `repartos`: `SELECT`, `INSERT`, `UPDATE` solo con `pareja_id = mi_pareja_id()`. **No existe política de `DELETE`:** nadie puede borrar filas (solo marcarlas con `deleted_at`).
- `anon` no tiene permisos sobre ninguna tabla; `authenticated` solo lo necesario. Las funciones internas y de disparador están revocadas para la API.
- La app solo usa la **publishable key**. No pongas nunca la `service_role` en el código.
- Quien conozca el código de una pareja con un hueco libre **puede unirse** (máximo 2 cuentas). Trata el código como una contraseña corta y compártelo solo con tu pareja.

### 15.6 Cómo cambiar el backend con seguridad

1. Crea un archivo nuevo en `supabase/migrations/` con prefijo de fecha creciente.
2. Si añades una columna sincronizable, hay que tocar **tres sitios a la vez**: la tabla de Supabase, las funciones `sync_push` (columnas del `insert`) y la definición en `src/sync/tablas.ts` (`columnas`, `fechas`, `obligatorias`), **y** una migración local nueva (sección 24.2).
3. Revisa los *advisors* de Supabase (seguridad y rendimiento) después de cada cambio.

## 16. Estado global (stores)

Todos usan **Zustand 5**. Se importan siempre desde `src/store/`.

| Store | Tipo | Estado | Acciones principales |
|---|---|---|---|
| `useCuentasStore` | hook (`create`) | `cuentas`, `cargando`, `error` | `cargar`, `registrarIngreso`, `registrarGasto`, `editarGasto`, `editarIngreso`, `eliminarMovimiento` |
| `useSectoresStore` | hook | `sectores`, `cargando`, `error` | `cargar`, `agregar` (crea sector personalizado) |
| `useSaldosSectoresStore` | hook | `saldos`, `ingresosMes {cup, usd}`, `cargando`, `error` | `cargar` |
| `useNotificacionesStore` | hook | `items`, `noLeidas`, `hastaRowid`, `cargando`, `error` | `cargar(db, yoId)`, `marcarVistas` |
| `useSesionStore` / `sesionStore` | fábrica `crearSesionStore` | `configurado`, `cargando`, `usuario`, `pareja`, `miembros`, `sinConexion` | `iniciar`, `refrescar`, `registrarse`, `entrar`, `salir`, `crearPareja`, `unirPareja`, `cambiarNombre` |
| `useSyncStore` / `syncStore` | fábrica `crearSyncStore` | `estado`, `activo`, `pendientes`, `ultimaSync`, `error`, `decision`, `datosVersion` | `preparar`, `decidir`, `sincronizar`, `desactivar`, `leerPendientes` |

### 16.1 Patrones

- **`cargando` solo es `true` hasta la primera carga.** Las recargas siguientes no hacen parpadear la pantalla.
- **Los stores no guardan la base**: cada acción recibe `db` (de `useSQLiteContext()`).
- **Recarga tras guardar.** `useCuentasStore` tiene un `refrescar` interno que recarga **cuentas y saldos de sectores** (llama a `useSaldosSectoresStore.cargar`). `registrarIngreso` siempre recarga; `registrarGasto`, `editar*` y `eliminarMovimiento` solo si el resultado fue `'guardado'`.
- **Fábricas para la sesión y la sincronización.** `crearSesionStore(cliente)` y `crearSyncStore(cliente)` reciben el cliente de Supabase por parámetro (puede ser `null`) y usan `createStore` de `zustand/vanilla`. Eso permite **probarlos sin internet** con un cliente falso. Los archivos `useSesionStore.ts` y `useSyncStore.ts` crean la instancia real con `supabase` y exportan **dos formas**:
  - `useSesionStore` / `useSyncStore`: el hook para componentes.
  - `sesionStore` / `syncStore`: el objeto con `getState()`, para usarlo **fuera de React** (por ejemplo, en `SyncIniciador` o en `onRefresh`).
- **Errores.** Las acciones de dinero y de cuenta **lanzan** `Error` con mensaje en español (la pantalla lo muestra); `iniciar`, `refrescar` y `syncStore.sincronizar` **nunca lanzan**.
- **Sesión sin internet.** `iniciar` primero lee la copia local de la cuenta (instantáneo) y después la confirma con Supabase. Si no hay conexión, se queda con lo guardado (`sinConexion = true`). Si Supabase confirma que ya **no hay sesión**, borra la copia de cuenta/pareja (no los movimientos).
- **`miembros`** (de `sesionStore`) es de donde salen los nombres para las etiquetas "registrado por".

### 16.2 Hooks (`src/hooks/`)

| Hook | Qué hace |
|---|---|
| `useEliminarMovimiento(movimientoId, {titulo, mensaje}, alTerminar)` | Flujo completo de eliminar: pide confirmación (`confirmar`), llama a `eliminarMovimiento`, y si el movimiento no se puede eliminar (un ingreso cuyo dinero ya se gastó) deja los motivos en `error`. Devuelve `{eliminar, eliminando, error}`. Tiene un cerrojo (`useRef`) contra doble toque. Lo usan `nuevo-gasto` y `editar-ingreso`. |
| `useKeyboardHeight()` | Altura actual del teclado (0 si está cerrado) con `keyboardDidShow`/`keyboardDidHide`. Lo usa `Screen` (sección 19). |

## 17. Navegación y pantallas

Expo Router: **cada archivo de `src/app/` es una ruta**. Hay un `Stack` raíz y, dentro, 4 pestañas.

```
Stack raíz (src/app/_layout.tsx)
├─ (tabs)/                 ← Tabs (src/app/(tabs)/_layout.tsx)
│   ├─ index               Inicio
│   ├─ movimientos         Movimientos (registrar ingreso)
│   ├─ estadisticas        Estadísticas
│   └─ billetera           Billetera
├─ sector/[id]             Lista de un sector                   (pantalla normal)
├─ movimiento/[id]         Detalle de un movimiento             (pantalla normal)
├─ notificaciones          Notificaciones                       (pantalla normal)
├─ nuevo-gasto             Añadir/editar gasto o retiro         (modal)
├─ nuevo-sector            Crear sector                         (modal)
├─ editar-ingreso          Editar/eliminar ingreso              (modal)
└─ sincronizacion          Cuenta, pareja y sincronización      (modal)
```

La barra de pestañas usa `Tabs` de **`expo-router/js-tabs`** con `tabBarHideOnKeyboard: true` (se oculta bajo el teclado, ver sección 19).

### 17.1 Pantallas

| Ruta | Archivo | Qué muestra y qué hace |
|---|---|---|
| Inicio | `(tabs)/index.tsx` | `ResumenInicioCard` (total en pesos + efectivo/transferencia/USD), "Disponible por sector" (`SectorSaldoRow`; Ingresos muestra "Entrado este mes") y "Secciones" (`SectorTile`). Campana de notificaciones en la cabecera. *Pull-to-refresh*: sincroniza (máx. 20 s de espera) y recarga; si falla, `Alert` con el motivo. Con todo en cero, un `EmptyState` lleva a Movimientos. |
| Movimientos | `(tabs)/movimientos.tsx` | `FormularioIngreso` en modo "crear" (`limpiarAlGuardar`). Al guardar, `Alert` con el resumen. Recarga los sectores al enfocar. |
| Estadísticas | `(tabs)/estadisticas.tsx` | Selector de período + todas las tarjetas de la sección 11. Estado local: `periodo` y `desplazamiento` (0 = actual, −1 = anterior…; no se guarda una fecha para que "hoy" siempre sea hoy; no se puede ir al futuro). Cambiar de período reinicia `desplazamiento` a 0. |
| Billetera | `(tabs)/billetera.tsx` | `ResumenSaldosCard`, "Mis cuentas" (`CuentaItem`), "Sectores" (`SectorItem`, con acción "Nuevo sector") y "Pareja" (`SincronizacionCard`). |
| Sector | `sector/[id].tsx` | Usa `cargarVistaSector` y pinta según la clase: **ingresos** (totales por forma + ingresos del mes, tocar → `editar-ingreso`), **ahorro** (saldo, "Retirar de ahorro", historial de entradas/salidas; solo las salidas se editan) o **gastos** (saldo, "Añadir gasto", totales por forma, gastos del mes, tocar → editar). |
| Detalle de movimiento | `movimiento/[id].tsx` | Monto, forma, **quién lo registró** (`autorDe`), origen o sector + concepto/motivo, fecha, "Última edición" (si hay más de 60 s entre `created_at` y `updated_at`) y reparto (ingresos). Botón "Editar o eliminar". Si el movimiento ya no existe (eliminado aquí o por la pareja) muestra un estado vacío. |
| Notificaciones | `notificaciones.tsx` | Lista de los últimos 50 movimientos de los dos (sección 12). |
| Gasto (modal) | `nuevo-gasto.tsx` | Dos modos: **nuevo** (`?sectorId=`) o **editar** (`?movimientoId=`). Carga sector, cuentas y saldo por forma; **deshabilita las formas agotadas** (nota "Agotado"); muestra en vivo por qué no alcanza (`bloqueosGasto`); en edición, lo que el gasto ya había descontado vuelve a contar como disponible solo en su misma forma. En Ahorro el campo es "Motivo de la salida" (obligatorio). Tiene botón de eliminar al editar. |
| Sector nuevo (modal) | `nuevo-sector.tsx` | Nombre + "uso del dinero". Valida con `validarSector` (nombres únicos sin distinguir mayúsculas/tildes). |
| Ingreso (modal) | `editar-ingreso.tsx` | `FormularioIngreso` con `inicial`; guarda con `editarIngreso` (si deja algo en negativo lanza el motivo, que el formulario muestra) y permite eliminar. La fecha no cambia. |
| Sincronización (modal) | `sincronizacion.tsx` | Ver 13.4. |

### 17.2 Patrón de carga de datos de una pantalla

```tsx
const datosVersion = useSyncStore((s) => s.datosVersion);

useFocusEffect(
  useCallback(() => {
    let activo = true;                       // evita actualizar si ya se salió
    (async () => {
      try { const d = await cargarAlgo(db); if (!activo) return; setDatos(d); setError(null); }
      catch (e) { if (activo) setError(mensajeError(e)); }
      finally { if (activo) setCargando(false); }
    })();
    return () => { activo = false; };
  }, [db, datosVersion, /* params */]),
);
```

- Se recarga **cada vez que la pantalla toma el foco** (por ejemplo, al volver de guardar un gasto) **y** cuando `datosVersion` cambia (llegaron cambios de la pareja).
- Todas las pantallas tratan los cuatro estados: **cargando**, **error**, **no existe / vacío** y **datos**.

### 17.3 Parámetros de ruta

`sector/[id]` → `id` del sector. `movimiento/[id]` → `id` del movimiento. `nuevo-gasto` → `sectorId` **o** `movimientoId`. `editar-ingreso` → `movimientoId`. Se leen con `useLocalSearchParams` y se convierten con `String(...)`.

## 18. Componentes (`src/components/`)

Presentacionales: reciben datos por *props* y avisan con `onPress`/`onChange`. Los de formulario y los de lista no tocan la base.

### 18.1 `common/` (base de la interfaz)

| Componente | Descripción |
|---|---|
| `Screen` | Marco de las pantallas de pestañas y de detalle: título, subtítulo, botón atrás (`onBack`), zona derecha (`derecha`), *pull-to-refresh* (`onRefresh`) y **toda la lógica de teclado** (sección 19). |
| `ModalScreen` | Marco de las ventanas emergentes: título, botón cerrar y `ScrollView`; usa `KeyboardAvoidingView` (`padding` en iOS, `height` en Android). |
| `Button` | Botón de 56 px; `variant`: `primary`, `secondary`, `danger`; `icon`, `loading`, `disabled`. |
| `Card` | Tarjeta blanca con esquinas redondeadas y sombra. |
| `Divider`, `SectionTitle`, `EmptyState`, `FormaBadge`, `FilaPulsable` | Separador; título de sección con acción opcional; estado vacío con icono/botón; etiqueta de color de la forma de dinero; envoltorio que vuelve tocable una fila (con accesibilidad). |
| `AlEnfocarContext` | Contexto que `Screen` provee y los campos usan para avisar "me enfocaron" (sección 19). |

### 18.2 `forms/`

| Componente | Descripción |
|---|---|
| `MontoInput` | Campo de monto: teclado `decimal-pad`, símbolo de moneda, y limpieza automática con `limpiarMontoTexto`. Variante `compacto` para filas de lista. |
| `TextField` | Campo de texto con etiqueta, ayuda, error y contador de letras. |
| `OpcionesSelector<T>` | Botones grandes para elegir **una** opción (2 o 3 columnas); soporta `deshabilitada` y `nota`. |
| `opcionesForma.ts` | `OPCIONES_FORMA`: las 3 formas como opciones (icono y color). |

### 18.3 Por zona

| Carpeta | Componentes |
|---|---|
| `inicio/` | `ResumenInicioCard`, `SectorSaldoRow`, `SectorTile`, `CampanaNotificaciones` |
| `billetera/` | `ResumenSaldosCard`, `CuentaItem`, `SectorItem`, `SincronizacionCard` (estado de la pareja/sync; al tocarla abre la ventana de sincronización) |
| `movimientos/` | `FormularioIngreso` (lo usan Movimientos y Editar ingreso), `RepartoResumen` ("falta / te pasaste / todo repartido" con barra), `RepartoSectorRow` |
| `sector/` | `SaldoSectorCard`, `TotalesFormaCard`, `GastoItem`, `IngresoItem`, `AhorroItem` |
| `estadisticas/` | `SelectorPeriodo`, `ResumenPeriodoCard`, `ComparacionCard`, `DonaCard`, `DonaChart`, `EvolucionChart`, `RankingCard`, `UsoSectoresCard`, `AnalisisCard` |
| `notificaciones/` | `NotificacionItem` |
| `sincronizacion/` | `SesionIniciador`, `SyncIniciador` (sin interfaz); `FormularioCuenta`, `FormularioPareja`, `VistaPareja`, `DecisionUnir`, `EstadoSincronizacion`, `CerrarSesionBoton`, `SinConfigurar` |

### 18.4 `FormularioIngreso` en detalle

Es el formulario más usado y más complejo:

- Props: `textoBoton`, `inicial?` (para editar), `onGuardar(datos) → Promise<boolean>`, `limpiarAlGuardar?`.
- Estado: monto (texto), forma, origen y `repartos` (mapa `sectorId → texto`).
- Los sectores del reparto son **todos menos Ingresos** (`sectoresReparto`); los lee de `useSectoresStore`, así que **quien lo use debe haberlos cargado**.
- `validarIngreso(...)` se recalcula en cada cambio (`useMemo`) y alimenta los errores por campo y `RepartoResumen`.
- Los errores solo se muestran tras el primer intento de guardar (`intentado`).
- Al guardar: cerrojo `useRef` contra doble toque; si `onGuardar` devuelve `true` y `limpiarAlGuardar`, vacía el formulario; si lanza, muestra el error del `catch`.
- Convierte con `deCentavos(montoCentavos)` antes de enviar.

## 19. Teclado y scroll

Es una zona donde se hicieron **dos iteraciones** hasta lograr un comportamiento correcto en Android (edge-to-edge con `adjustResize`). No la cambies sin probar en un teléfono real.

### 19.1 Los dos mundos

| Marco | Estrategia |
|---|---|
| `ModalScreen` (y `nuevo-sector`) | `KeyboardAvoidingView` con `behavior="height"` en Android; el teclado empuja el contenido y funciona bien. |
| `Screen` (pestañas) | La ventana ya se redimensiona con el teclado (`adjustResize`), así que `Screen` **mide el solape real** entre el `ScrollView` y el teclado y añade solo ese relleno. |

### 19.2 `Screen`

1. Guarda referencias al `ScrollView` (`scrollRef`), la posición de scroll (`scrollY`), la altura visible (`alturaRef`) y el solape (`solape`, estado).
2. `ajustarAlTeclado()` mide con `measureInWindow` el `ScrollView` y el campo enfocado (`TextInput.State.currentlyFocusedInput()`); calcula la parte superior del teclado con `Keyboard.metrics()?.screenY` (o, si no existe, la altura de la ventana).
3. `solapeConTeclado(scrollAbajo, tecladoArriba)` (en `src/utils/teclado.ts`) devuelve cuánto tapa el teclado al `ScrollView` (`0` si es ≤ 2 px de tolerancia). Ese valor se suma al `paddingBottom` del contenido (`spacing.xxl + solape`), por lo que el último campo siempre se puede subir por encima del teclado **sin dejar un hueco** al cerrarlo.
4. `desplazamientoParaVer({campoArriba, campoAbajo, visibleArriba, visibleAbajo, margen})` calcula cuánto hay que desplazar para que el campo enfocado quede visible (margen de 24 px; si no cabe, prioridad a que se vea su parte superior).
5. `programarAjuste()` repite la medición a los **60, 260 y 520 ms**: el teclado y la ventana se animan en momentos distintos según el teléfono.
6. `keyboardShouldPersistTaps="handled"` (tocar un botón con el teclado abierto funciona) y **`keyboardDismissMode="none"`** (hacer scroll **no** cierra el teclado; antes con `"on-drag"` se cerraba al deslizar).
7. `MontoInput` y `TextField` llaman a `useAlEnfocar()` en `onFocus` (el contexto `AlEnfocarContext`), de modo que al enfocar otro campo se vuelve a medir.
8. La barra de pestañas se oculta con teclado (`tabBarHideOnKeyboard: true`), como en las ventanas de formulario.

### 19.3 Reglas al tocar esto

- Cualquier campo nuevo dentro de `Screen` debe llamar a `useAlEnfocar()` en `onFocus` (si usas `TextField`/`MontoInput` ya lo hacen).
- Las funciones puras de `utils/teclado.ts` se pueden probar fuera del teléfono; **la integración (medidas reales, animaciones) solo se puede comprobar en un dispositivo**.
- La solución asume la configuración de Android que genera Expo al compilar (`windowSoftInputMode = adjustResize` y *edge-to-edge*); `expo-system-ui` está instalado por esa razón. Si cambias esa configuración, vuelve a probar todos los formularios.

## 20. Tema y diseño

Todo estilo sale de `src/theme/`. **No uses colores ni tamaños sueltos en los componentes.**

| Elemento | Dónde | Notas |
|---|---|---|
| `colors` | `theme/index.ts` | Marca `primary #5B4DF5`, superficies (`background #F4F5FB`, `surface #FFFFFF`, `border`), texto (`text`, `textSecondary`, `textMuted`), estados (`positive`, `negative`, `warning`). |
| `formaColors` | `theme/index.ts` | efectivo `#22C55E`, transferencia `#3B82F6`, usd `#8B5CF6`. |
| `sectorColors` | `theme/index.ts` | Color de cada sector base; los personalizados guardan su color en la base (`PALETA_SECTORES`). |
| `spacing` | `theme/index.ts` | `xs 4, sm 8, md 12, lg 16, xl 20, xxl 28`. |
| `radius` | `theme/index.ts` | `sm 10, md 14, lg 20, xl 28, pill 999`. |
| `fonts` / `fontSizes` | `theme/index.ts` | `Inter_400Regular/500Medium/600SemiBold/700Bold`; tamaños `xs 12 … xxl 28`. |
| `shadows` | `theme/index.ts` | `card` y `tabBar`. |
| `formaIconos`, `sectorIconos`, `colorDeSector(sector)`, `iconoDeSector(sector)` | `theme/iconos.ts` | Iconos Ionicons y color efectivo de un sector (el suyo propio o el del tema). |

Diseño: estilo "fintech" limpio, fondo gris muy claro, tarjetas blancas redondeadas, color principal índigo. Botones de 56 px para tocar con facilidad; todos los elementos tocables llevan `accessibilityRole` y `accessibilityLabel`. La app es solo **modo claro** (`userInterfaceStyle: light`).

## 21. Compilar y publicar

La app se distribuye como **APK de Android** compilado con **EAS Build** (en la nube; no hace falta Android Studio).

### 21.1 Configuración

- `app.json`: nombre `CoupleFinance`, `slug couple-finance`, `scheme couplefinance`, versión `1.0.0`, paquete Android **`com.yerald.couplefinance`**, solo modo claro, plugins `expo-router` y `expo-sqlite`. `android.blockedPermissions` quita `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` y `WRITE_EXTERNAL_STORAGE` (la app no los usa; menos permisos = más confianza al instalar).
- `eas.json`: `appVersionSource: remote` (EAS lleva el número de versión) y dos perfiles, **`preview`** (`distribution: internal`, entorno `preview`) y **`production`** (entorno `production`), ambos con `autoIncrement` y `buildType: apk`.
- Las carpetas `android/` e `ios/` **no existen** (Continuous Native Generation): se generan al compilar. No las crees ni edites a mano; toda configuración nativa va en `app.json` o en *config plugins*.

### 21.2 Pasos (la primera vez)

```powershell
npm install -g eas-cli          # o usa: npx eas-cli@latest <comando>
eas login                       # tu cuenta de expo.dev
eas init                        # crea el proyecto en Expo y escribe extra.eas.projectId en app.json
eas env:push preview --path .env    # sube las 2 variables de Supabase al entorno "preview"
eas build -p android --profile preview
```

> **Importante:** `.env` está en `.gitignore`, por lo que **EAS no lo recibe**. Si no subes las variables, el APK se compila **sin** Supabase y la app dirá "Falta conectar Supabase". Se pueden crear también una a una con `eas env:set` (consulta `eas env --help` en tu versión: algunos subcomandos antiguos, como `env:create`, están en desuso) o desde expo.dev → *Environment variables*. Para un APK `production`, repite `eas env:push production --path .env`.

Al terminar, EAS da un enlace para descargar el `.apk` e instalarlo en el teléfono (hay que permitir "instalar apps de orígenes desconocidos").

### 21.3 Lista de comprobación antes de un build

1. `npx tsc --noEmit` sin errores.
2. `npx expo-doctor` (revisa el resultado; algunos avisos de red no son reales).
3. Variables `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` subidas al entorno del perfil.
4. Las dos migraciones SQL ejecutadas en el Supabase al que apunta el build.
5. «Confirm email» desactivado en Supabase.
6. Subir la `version` de `app.json` si es una versión pública nueva (el `versionCode` de Android lo incrementa EAS solo).

### 21.4 Pendientes de publicación (no hechos)

- Pantalla de carga (*splash*) e icono adaptativo propios (opcional; aún no decidido).
- Si algún día se publica en Google Play, hay que producir un `aab` (hoy `production` genera APK) y firmar con una *keystore* propia (EAS puede administrarla).

## 22. Verificación y pruebas

### 22.1 Lo que hay en el repositorio

- **Tipos:** `npx tsc --noEmit` (TypeScript `strict`). Es la comprobación automática del repositorio.
- **No hay suite de pruebas ni ESLint configurados** en el repositorio (`package.json` no tiene script `test` y no existe configuración de lint).

### 22.2 Cómo se verificó durante el desarrollo (fuera del repositorio)

Para no depender de un teléfono, el SQL y la lógica se probaron **fuera de la app** con un conjunto de pruebas que **no forma parte de este repositorio**. La técnica es reproducible y se recomienda mantenerla si se añaden pruebas:

| Qué | Cómo |
|---|---|
| Consultas y reglas de dinero | Un `FakeDb` con la misma interfaz que `SQLiteDatabase` (`getAllAsync`, `getFirstAsync`, `runAsync`, `withTransactionAsync`…) sobre **`node:sqlite`**, ejecutando el SQL real (`schemaSql.ts`, `syncSql.ts`). Por eso esos dos archivos **no importan nada de Expo**. |
| Sincronización | Un Postgres en memoria (**PGlite**) con las migraciones reales de `supabase/migrations/` y un cliente falso que implementa `rpc`. Se simulan **dos teléfonos** contra el mismo servidor: subir, bajar, conflictos, ediciones simultáneas sin conexión y otros casos límite. Más una prueba aleatoria (*fuzz*) con muchas operaciones. |
| Stores | `crearSesionStore` y `crearSyncStore` con un cliente falso (sin internet). |
| Migraciones locales | Comprobar que partiendo de la v1 y de la v2 se llega a la v3 sin perder datos. |
| Zonas horarias | Las pruebas se ejecutan en varias zonas horarias distintas (variable `TZ`), porque los períodos se calculan en hora local. |
| Teclado | Pruebas de las funciones puras `solapeConTeclado` y `desplazamientoParaVer`. |
| Mutaciones | Se rompe a propósito una línea de la lógica para comprobar que alguna prueba falla (si ninguna falla, esa prueba no sirve). |

Ejemplo de ejecución (Node reciente con `--experimental-strip-types`; `register.mjs` era un pequeño cargador de resolución de módulos de esa carpeta de pruebas):

```bash
TZ=America/Havana node --experimental-strip-types --import ./register.mjs test-8b-sync.ts
```

### 22.3 Lo que solo se puede comprobar en un teléfono

- Teclado, scroll y barra de pestañas (sección 19).
- Rendimiento, gestos, *pull-to-refresh*.
- Instalación del APK, permisos y comportamiento en segundo plano.
- Sincronización real entre dos teléfonos con internet intermitente.

### 22.4 Qué probar a mano tras un cambio importante

1. Registrar un ingreso con reparto exacto, y uno que no suma (debe avisar).
2. Gastar en cada forma; intentar gastar más de lo que hay (debe bloquear con el motivo).
3. Editar y eliminar un gasto y un ingreso; intentar eliminar un ingreso cuyo dinero ya se gastó.
4. Con dos teléfonos: registrar en uno, ver en el otro (campana, saldos, estadísticas).
5. Modo avión: registrar algo; al volver internet debe subirse solo.
6. Cerrar sesión y volver a entrar: los datos siguen y se vuelven a sincronizar.

## 23. Convenciones de código

- **Idioma:** español en interfaz, errores y comentarios; los comentarios explican el *porqué*.
- **TypeScript estricto:** sin `any` sueltos; tipos de dominio en `src/types` y `src/db/schema.ts`.
- **Dinero:** nunca sumes `number` decimales directamente; usa `aCentavos`/`deCentavos`. Nunca mezcles pesos y USD en un total.
- **Capas:** pantalla → store → `db/queries` → SQLite. Las pantallas no escriben SQL; las funciones de `utils/` son puras.
- **Doble validación:** toda regla de negocio se valida en la pantalla (para avisar) **y** en la capa de consultas (para proteger).
- **Transacciones:** una operación que toca varias tablas usa `db.withTransactionAsync`.
- **Borrado:** siempre lógico (`deleted_at` + `updated_at`). Toda consulta de lectura filtra `deleted_at IS NULL`.
- **Fechas:** ISO 8601 UTC con milisegundos al guardar; períodos en hora local.
- **IDs:** `newId()` (UUID v4). Los sectores y cuentas base tienen ids fijos.
- **Estado de formularios:** `intentado` (errores solo tras intentar guardar) y cerrojo `useRef` contra doble toque.
- **Pantallas con datos:** `useFocusEffect` + `datosVersion` + indicador `activo` contra actualizaciones tardías (sección 17.2).
- **Estilos:** `StyleSheet.create` al final del archivo; valores del tema, no literales.
- **Accesibilidad:** `accessibilityRole` y `accessibilityLabel` en todo lo tocable.
- **Dependencias:** `npx expo install <paquete>`, no `npm install`.
- **Nombres:** componentes en `PascalCase`, funciones en `camelCase` español (`registrarGasto`), archivos de store `useXStore.ts`.

## 24. Guías para extender

### 24.1 Añadir una pantalla

1. Crea el archivo en `src/app/` (el nombre es la ruta). Si debe ser modal, declara `<Stack.Screen name="..." options={{ presentation: 'modal' }} />` en `src/app/_layout.tsx`.
2. Usa `Screen` (o `ModalScreen` para formularios emergentes).
3. Carga datos con el patrón de 17.2, **incluyendo `datosVersion`**.
4. Navega con `router.push('/ruta')` o `router.push({ pathname, params })`.

### 24.2 Cambiar la base local (nueva migración)

1. **No edites** `SCHEMA_V1` ni `SCHEMA_V3`. Añade un objeto al final de `MIGRATIONS` en `src/db/migrations.ts` con la siguiente versión (se aplica dentro de una transacción).
2. Actualiza `src/db/schema.ts` (tipos).
3. Si la columna es **sincronizable**: añádela a `TABLAS` en `src/sync/tablas.ts`, a la función `sync_push` y a la tabla de Supabase (nueva migración en `supabase/migrations/`), y decide su valor por defecto en `aFilaLocal`.
4. Si hay disparadores que dependen de la tabla (v3), revisa que sigan válidos.
5. Prueba la ruta de actualización desde una base de la versión anterior.

### 24.3 Añadir una regla de dinero

1. Escríbela como función **pura** en `utils/` (con su validación de pantalla).
2. Aplícala **también** en la función de `db/queries/` correspondiente (registrar, editar y eliminar según corresponda).
3. Ten en cuenta `empeoraNegativo` (8.6) para ediciones y eliminaciones.

### 24.4 Añadir un tipo de movimiento o de sector

Hay que revisar: `TipoMovimiento`/`TipoSector` (`src/types`), el `CHECK` de la tabla (`sectores.tipo` en SQLite **y** en Supabase), `tipoMovimientoDeSector`, `vistaSector`, estadísticas (`agregarGastos`, `calcularUsoSectores`), iconos/colores del tema y textos de notificaciones. Cambiar un `CHECK` de SQLite exige **recrear la tabla** en una migración.

### 24.5 Añadir una estadística

Añade el cálculo como función pura en `utils/analisis.ts` (o `estadisticas.ts`), agrégalo a `AnalisisPeriodo` y a `analizarPeriodo`, y dibuja un componente en `components/estadisticas/`. La consulta (`cargarEstadisticas`) no cambia a menos que necesites datos nuevos.

### 24.6 Fase 8C (pendiente): tiempo real y "registrado por" en las listas

Idea acordada, **no implementada**: suscripción de Supabase Realtime para bajar cambios al instante (el motor actual seguiría como respaldo) y mostrar la etiqueta "registrado por" en las listas de cada sector. Antes de empezar, hay que acordarlo con el responsable del proyecto.

## 25. Limitaciones y decisiones conocidas

| Tema | Decisión / límite |
|---|---|
| Saldos negativos | La app no permite crearlos, pero dos teléfonos que gastan el mismo dinero **sin conexión** pueden dejar un saldo negativo al juntarse. Es un límite conocido; `empeoraNegativo` evita bloquear cambios que lo mejoran. |
| Conflictos | *Last-write-wins* por **fila completa**. La hora (`updated_at`) la pone el teléfono; el servidor la limita a +5 min en el futuro. |
| Quién editó | Solo se guarda quién **registró** (`registrado_por`). No hay "editado por". |
| Notificaciones | Solo de movimientos **nuevos** de la pareja (no ediciones ni eliminaciones) y de los últimos 7 días. No son *push* del sistema. |
| Tiempo real | No hay; se consulta cada ~45 s o al abrir/volver a la app (Fase 8C pendiente). |
| Copia de seguridad | **Excluida por decisión del producto** (sin exportar/importar). Los datos viven en el teléfono y, si hay pareja, en Supabase. |
| Transferencias | No hay transferencias entre cuentas ni entre sectores: el dinero entra por un ingreso y sale por un gasto. |
| Sectores | Se pueden **crear**; no hay pantalla para editar o eliminar un sector. |
| Recuperar contraseña | No hay flujo de "olvidé mi contraseña" en la app. |
| Pareja | Máximo 2 cuentas por pareja; una cuenta, una pareja; no hay forma de salir de una pareja desde la app. |
| Plataformas | Pensada y probada para **Android**. iOS/web no son objetivo. |
| Idioma | Solo español. |
| Seguridad | La app usa solo la llave *publishable*; RLS protege los datos. El código de pareja da acceso a quien lo conozca mientras haya un hueco libre. |
| Cuenta duplicada | `miembros` impide dos nombres iguales en una pareja (sin distinguir mayúsculas). |

## 26. Solución de problemas

| Síntoma | Causa probable y solución |
|---|---|
| La app dice "Falta conectar Supabase" | Falta `.env`, o sus valores están vacíos o la URL no es `https://`. Crea `.env` desde `.env.example` y reinicia con `npx expo start -c`. En el APK: sube las variables a EAS (21.2). |
| Cambié `.env` y no pasa nada | Metro guarda las variables en caché. Reinicia con `npx expo start -c`. |
| Crear cuenta dice que hay que confirmar el correo | «Confirm email» está activado en Supabase. Desactívalo (15.1). |
| "Esta pareja ya está completa" / "Código no válido" | La pareja ya tiene 2 cuentas, o el código está mal escrito (alfabeto sin `0 O 1 I L`). |
| "Elige un nombre distinto al de tu pareja" | Los nombres dentro de una pareja deben ser distintos (sin distinguir mayúsculas). |
| La sincronización no avanza, estado "No se pudo sincronizar" | Mira el mensaje en Billetera → Pareja. Causas típicas: migraciones SQL sin ejecutar en Supabase (falta `sync_push`), sesión vencida (vuelve a entrar), o un error del servidor (se reintenta con espera creciente). |
| Estado "Sin conexión" | No hay internet o Supabase es inalcanzable. La app sigue funcionando; reintenta cada 15 s. |
| Billetera dice "Falta elegir cómo unir" | Ambos teléfonos ya tenían movimientos: abre la tarjeta y elige "Unir" o "Empezar con los de mi pareja" (esta **borra** los de este teléfono). |
| Los saldos de la pareja no coinciden | Tras bajar cambios los saldos de cuentas se recalculan desde los movimientos. Comprueba que ambos estén "Al día" y sin cambios pendientes. |
| No llegan las notificaciones de mi pareja | Solo cuentan movimientos **nuevos** (no ediciones), de los últimos 7 días, registrados por la otra cuenta. Comprueba la sincronización. |
| Un campo queda tapado por el teclado | Revisa la sección 19: el campo debe estar dentro de `Screen` y usar `TextField`/`MontoInput` (que avisan con `useAlEnfocar`). |
| `npx expo install --check` o `expo-doctor` fallan por red | Son comprobaciones que consultan servicios externos; reintenta con conexión normal. |
| Error de tipos con refs de `ScrollView` | En esta versión de React Native el tipo correcto es `ScrollViewInstance` (exportado por `react-native`). |
| Quiero empezar de cero en un teléfono | Desinstalar la app borra la base local. Con pareja conectada, al volver a entrar baja lo de la pareja (elige "Empezar con los de mi pareja" si pregunta). |

## 27. Historial de fases

El proyecto se construyó por fases, cada una verificada antes de pasar a la siguiente. El código solo conserva rastro explícito de algunas:

| Fase | Contenido |
|---|---|
| 1–7 | Construcción de la app local (base de datos, sectores, ingresos con reparto, gastos, estadísticas, Billetera…). El detalle de cada fase no quedó escrito en el código; sí queda constancia de que la Fase 4 preveía la tarjeta de saldo con degradado (`gradientStart`/`gradientEnd` en el tema) y de que la Fase 7 incluyó una **prueba de "personas" descartada**, cuyos datos limpia la migración local v2. |
| 8A | Cuentas con Supabase Auth, pareja con código, tablas del servidor y seguridad (RLS). |
| 8B | Sincronización: cola de cambios, subir/bajar, conflictos, activación unir/empezar, "registrado por". |
| Posteriores a 8B | Campana de notificaciones y *pull-to-refresh*; arreglos de teclado en "Repartir el dinero"; preparación de compilación (EAS, permisos, `expo-system-ui`). |
| 8C | **Pendiente, sin iniciar**: tiempo real y "registrado por" en las listas por sector. |

## 28. Licencia

Código bajo **licencia MIT** (ver el archivo `LICENSE`). El texto actual de `LICENSE` conserva el aviso de copyright de la plantilla de Expo (650 Industries, Inc.); si el proyecto se distribuye, conviene sustituirlo por el nombre del autor o titular.