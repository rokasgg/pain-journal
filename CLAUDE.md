# React Native Boilerplate Guidelines

## Tech Stack
- Framework: Expo (React Native) with Expo Router (File-based navigation)
- Language: TypeScript (Strict mode)
- Styling: NativeWind v4 (Tailwind CSS)
- State Management: Zustand
- Backend/Auth: Supabase (`@supabase/supabase-js`), session persisted via `@react-native-async-storage/async-storage`
- Forms: React Hook Form + Zod (`@hookform/resolvers/zod`)
- Toasts: `Alert.alert` from `react-native` (no third-party toast library — see Toasts section)
- Theming: NativeWind `colorScheme` (from `nativewind`) synced with a persisted Zustand store
- Media: `expo-image-picker` (selection) + `expo-image` (display) + Supabase Storage (upload)

## Coding Rules
1. ALWAYS use TypeScript with strict interfaces. Do not use `any`.
2. ALWAYS use NativeWind `className=""` for styling instead of Inline `style={}` or `StyleSheet.create`.
3. Use Functional Components with Named Exports.
4. Keep navigation inside the `app/` directory using Expo Router standards.
5. Use icons from `@expo/vector-icons`.
6. NEVER use deprecated React Navigation imports.

## Project Structure
```
src/
  app/            # Expo Router routes only (screens + _layout.tsx). No business logic here.
    _layout.tsx   # Root Stack. Owns the auth redirect guard (see Auth Flow below).
    (auth)/       # Unauthenticated group: login, register, forgot-password. Own Stack layout, headerShown: false.
    (tabs)/       # Authenticated group: Tabs layout (Home, Explore, Profile) with @expo/vector-icons.
    modal/        # Modal-presented routes, registered individually in the root Stack (e.g. edit-profile).
  components/
    ui/           # Reusable, presentational primitives (Button, Input, ThemeSwitcher, etc.)
  lib/
    supabase.ts   # Supabase client singleton
    validations/  # Zod schemas, one file per domain: <domain>.ts (e.g. auth.ts, profile.ts)
  store/          # Zustand stores, one file per domain: use<Domain>Store.ts
  utils/
    toast.ts      # Thin wrapper over Burnt (success/error/info)
    image.ts       # expo-image-picker helpers (permission request + launch)
```

## Components (`src/components/`)
- Reusable UI primitives live in `src/components/ui/`, PascalCase filenames matching the exported component (e.g. `Button.tsx` exports `Button`).
- Export via named export, never `export default`, for components in `components/`.
- Accept a `className?: string` prop (and `<field>ClassName?: string` for styled sub-elements, e.g. `textClassName`) so callers can extend/override styling — merge it into the base className string, don't replace it.
- Extend the underlying RN component's props via `interface XProps extends PressableProps { ... }` rather than redefining known props.
- For components with visual variants (e.g. `variant?: 'primary' | 'secondary' | 'outline'`), define a `Record<Variant, { container: string; text: string }>` style map above the component and look up classes from it — don't branch styling inline with ternaries in JSX.
- Route screens (`app/**`) use `export default function ScreenName()` (required by Expo Router); everything else uses named exports.

## NativeWind Styles
- `tailwind.config.js` has `darkMode: 'class'` — always pair a light class with a `dark:` variant for any color-bearing className (backgrounds, text, borders). Never ship a screen/component that only looks correct in one color scheme.
- Standard screen container: `flex-1 items-center justify-center bg-white dark:bg-black` (or `bg-white dark:bg-black px-6` for forms).
- Standard text color pair: `text-black dark:text-white`. Secondary/placeholder text: `text-gray-500`/`#8e8e93` (also used for `placeholderTextColor`, which NativeWind can't style directly).
- Inputs: never hand-roll a `TextInput` on a screen — use `components/ui/Input` (`rounded-lg border border-gray-300 px-4 py-3 text-black dark:border-gray-700 dark:text-white`, switches to `border-red-600 dark:border-red-500` when it has an `error`).
- Primary buttons: `rounded-lg bg-black py-3 dark:bg-white` with inverted text `text-white dark:text-black`; for buttons with multiple variants, use the `components/ui/Button` component instead of hand-rolling one.
- Never use `StyleSheet.create` or inline `style={}` for anything expressible in Tailwind; `style` is reserved for values NativeWind cannot express (e.g. dynamic numeric layout from measurements).

## Session State (`src/hooks/useSession.ts`) + Zustand Stores (`src/store/`)
- **Session/user state does NOT live in a Zustand store.** It lives in the TanStack Query cache under the `['session']` key, owned by the `useSession()` hook — `{ session, user, isLoading }`. `useAuthStore` holds no state at all, only action methods (see below). If you're adding session-derived state, extend `useSession()`/the query cache, not `useAuthStore`.
- `useSession()` subscribes to `supabase.auth.onAuthStateChange` (ref-counted so N callers share one listener) and pushes every event straight into `queryClient.setQueryData(['session'], ...)`; the initial `fetchSession()` query has `staleTime: Infinity` since only that listener is allowed to update it.
- Zustand stores are for domains that either (a) are pure actions with no state (`useAuthStore`), or (b) own genuinely local/persisted state (`useThemeStore`). One file per domain, named `use<Domain>Store.ts`, exporting a single hook `use<Domain>Store`. Type with `create<XState>((set) => ({ ... }))` — no untyped stores.
- `useAuthStore` — action-only, no `interface XState` with data fields, just `AuthActions`: `signUp(email, password, name)`, `signIn(email, password)`, `signOut()`, `resetPassword(email)`, `updateProfile({ name?, avatarUrl? })`, `uploadAvatar(userId, localUri)`. All of it calls `supabase.auth.*` and returns `Promise<{ error: string | null }>` (or `{ url, error }` for `uploadAvatar`) — never throws. Callers check `error` and forward it to `toast.error(...)`; nothing here calls `set()` because there's no state to set — auth-state changes flow to consumers via the `onAuthStateChange` listener inside `useSession()`, not through this store.
- `useThemeStore` is the one store that does own real state directly via `set()`, persisted with zustand's `persist` middleware + `createJSONStorage(() => AsyncStorage)`: `mode: 'system' | 'light' | 'dark'`, `setMode(mode)` (also calls NativeWind's `colorScheme.set(mode)`; `onRehydrateStorage` re-applies it on launch so NativeWind and the persisted preference never drift).
- A dev-only escape hatch, `skipAuthForDev()` in `src/utils/devAuth.ts`, writes a fake session directly into the same `['session']` query cache key so the rest of the app is reachable without a working Supabase backend — wired to a button on the login screen. It bypasses Supabase entirely; any screen that actually calls Supabase (reset password, profile update, sign out) will still fail against a placeholder project even after using it.

## Expo Router Routes (`src/app/`)
- Two top-level route groups: `(auth)` for unauthenticated screens and `(tabs)` for the authenticated app shell. Each group has its own `_layout.tsx` (`Stack` for `(auth)`, `Tabs` for `(tabs)`), both with `headerShown: false`.
- Auth gating lives ONLY in the root `src/app/_layout.tsx`: it reads `session`/`isLoading` from `useSession()`, compares against `useSegments()[0] === '(auth)'`, and calls `router.replace(...)` inside a `useEffect` to redirect. Do not duplicate redirect logic in individual screens.
- `(tabs)/_layout.tsx` defines tab icons via `@expo/vector-icons` (`Ionicons`), colored using `useColorScheme()` — not NativeWind — since `tabBarActiveTintColor`/`tabBarStyle` are native navigator options, not styleable views.
- Link between screens with `<Link href="/(auth)/register" asChild>` wrapping a `Pressable`, not raw `router.push` unless imperative navigation is required (e.g. post-action redirects, which use `router.replace`).
- Adding a new screen = adding a file under the correct group; adding a new tab = adding both the screen file in `(tabs)/` and a `<Tabs.Screen name="..." />` entry in `(tabs)/_layout.tsx`.
- Modal screens live under `src/app/modal/` and are registered individually in the root `_layout.tsx` with `<Stack.Screen name="modal/<name>" options={{ presentation: 'modal', headerShown: true, title: '...' }} />` — the modal group is NOT wrapped in its own `(group)` layout the way `(auth)`/`(tabs)` are, because each modal needs its own `presentation`/`title` rather than sharing one. Open one with `router.push('/modal/<name>')`; close with `router.back()`.

## Supabase (`src/lib/supabase.ts`)
- One client singleton, `supabase`, created with `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (read from `.env`, see `.env.example`). If either is missing, it `console.warn`s and falls back to placeholder credentials (`https://placeholder.supabase.co` / `placeholder-key`) instead of throwing — the app must always boot without a `.env` file; only actual auth calls fail, not module init. Never reintroduce a hard `throw` here.
- Session persistence uses a custom `authStorage` wrapper around `@react-native-async-storage/async-storage`, not the raw module — it probes `isAsyncStorageAvailable()` first and falls back to an in-memory `Map`-backed storage (`getItem`/`setItem`/`removeItem`) if the native module is missing or any call throws (e.g. web/Expo Go edge cases). `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: false` since this is native, not web. When the fallback is active, sessions won't survive an app restart — that's expected, not a bug to fix by making AsyncStorage calls unguarded again.
- All Supabase calls go through `useAuthStore` actions or the `useSession()` hook — screens and components never import `supabase` directly.
- `supabase.auth.getSession()` / `supabase.auth.onAuthStateChange()` are only called inside `useSession()` (`src/hooks/useSession.ts`), not directly in `_layout.tsx`. Root `_layout.tsx` shows a full-screen `ActivityIndicator` while `useSession().isLoading` is true, then applies the `(auth)`/`(tabs)` redirect.

## Form Validation (React Hook Form + Zod)
- Schemas live in `src/lib/validations/<domain>.ts` (e.g. `auth.ts`), one `z.object({...})` per form, each exporting both the schema and its inferred type: `export type XFormData = z.infer<typeof xSchema>`.
- Cross-field checks (e.g. `confirmPassword` matching `password`) use `.refine()` with an explicit `path: ['field']` so the error attaches to the right input.
- Screens with a form use `useForm<XFormData>({ resolver: zodResolver(xSchema), defaultValues: {...} })` and wrap every input in `<Controller control={control} name="field" render={...} />` — never manage form fields with raw `useState` once a Zod schema exists for that form.
- Render validation errors via the `Input` component's `error={errors.field?.message}` prop; never show them in a toast (toasts are for API/network outcomes, not per-field validation).

## Toasts (`src/utils/toast.ts`)
- Always call `toast.success(...)` / `toast.error(...)` / `toast.info(...)` from `@/utils/toast` — never call `Alert.alert` directly in a screen/component.
- Use toasts for the outcome of an async action (API error message, "Password reset email sent!", etc.), triggered right after `await` resolves in the submit handler. Do not toast validation errors — those render inline under the relevant `Input`.
- Implementation is intentionally just `Alert.alert` under the hood — no third-party toast library. A prior version used `burnt`, which requires a native module unavailable in Expo Go and kept crashing on cold start; it was removed. Don't reintroduce a native-toast dependency unless the project moves to a custom dev client/production build and someone explicitly decides the tradeoff is worth it.

## Reusable Form Input (`src/components/ui/Input.tsx`)
- Wraps `TextInput` with an optional `label`, `error` (renders red helper text and switches the border to red), and `isPassword` (renders an eye/eye-off `@expo/vector-icons` toggle and manages visibility internally — don't pass `secureTextEntry` yourself when using `isPassword`).
- Forwards its ref (`forwardRef<TextInput, InputProps>`) so it works as a `Controller` render target and with RHF's `ref` wiring.
- Any new form field type (e.g. a future `Select`) should follow the same shape: `label?`, `error?`, `className?`, forwarded ref, RN props spread last.

## Theming (`src/store/useThemeStore.ts`)
- `tailwind.config.js`'s `darkMode: 'class'` is driven exclusively by NativeWind's `colorScheme.set('system' | 'light' | 'dark')` (imported from `'nativewind'`) — never call `Appearance.setColorScheme` or branch styling off `useColorScheme()` from `react-native` in app code (the tab bar's native-options case in `(tabs)/_layout.tsx` is the one sanctioned exception, since those are non-style navigator props).
- The user-facing control is `components/ui/ThemeSwitcher` (segmented System/Light/Dark), backed by `useThemeStore`. Add new theme entry points by calling `useThemeStore((s) => s.setMode)`, never by importing `colorScheme` directly in a screen.
- The store is the single source of truth and is persisted; don't re-derive or cache the mode elsewhere (e.g. component-local `useState`).

## Media / Avatars (`src/utils/image.ts`, `useAuthStore.uploadAvatar`)
- Picking a photo always goes through `pickAvatarImage()` from `@/utils/image` — it requests media-library permission (toasting an error and returning `null` if denied) and launches `expo-image-picker` with `mediaTypes: ['images']`, `allowsEditing: true`, `aspect: [1, 1]`. Don't call `expo-image-picker` directly from a screen.
- Uploading is a two-step flow, always in this order: `uploadAvatar(userId, localUri)` (uploads to the Supabase Storage `avatars` bucket at `${userId}/avatar.<ext>`, `upsert: true`, returns a cache-busted public URL) then `updateProfile({ avatarUrl })` to persist it on the user. Never skip the second call — the uploaded file isn't reflected in `user_metadata` until you do.
- Display avatars with `expo-image`'s `<Image source={{ uri }} contentFit="cover" className="rounded-full ..." />`, not `react-native`'s `Image` — falls back to a `Ionicons name="person"` placeholder circle when there's no `avatar_url`.
- Requires a public Supabase Storage bucket named `avatars` to exist on the project (not created by app code) — check for it before assuming avatar upload works end-to-end on a fresh Supabase project.

## Testing
- Stack: `jest-expo` (preset) + `jest` + `@testing-library/react-native` + `react-test-renderer`. Run with `npm test` (or `npm run test:watch`); both are aliased to pass `--watchman=false` since some sandboxed/CI environments can't spawn the `watchman` binary.
- Config lives inline in `package.json`'s `"jest"` key (not a separate `jest.config.js`) — includes the `@/` → `src/` `moduleNameMapper` and RN `transformIgnorePatterns`. `tsconfig.json` has `"types": ["jest"]` so test globals typecheck.
- Wired into CI (`.github/workflows/ci.yml`) as a step after lint — a failing test blocks the PR the same as a failing typecheck.
- Three-layer pattern, one file per unit, colocated as `<name>.test.ts(x)` next to the source:
  - **Validation schemas** (`src/lib/validations/*.ts`) — pure `schema.safeParse(...)` assertions, no mocking. See `auth.test.ts`.
  - **Zustand stores** (`src/store/*.ts`) — `jest.mock('@/lib/supabase')`, call the action via `useStore.getState()`, assert the `{ error: string | null }` contract (never-throws) per the Zustand Stores rules above. See `useAuthStore.test.ts`.
  - **UI components** (`src/components/ui/*.tsx`) — render + `fireEvent` with RNTL, assert on rendered text/behavior, not implementation details. See `Button.test.tsx`.
- Screens (`src/app/**`) are intentionally not covered yet — add screen-level tests only once a screen has real business logic beyond the scaffolding, not for every new route.
- Known dependency wrinkle: installing test deps requires `npm install ... --legacy-peer-deps` because `react-native@0.86.0`'s bundled `@react-native/jest-preset` version trails what `jest-expo` declares as a peer by a patch version. This is a version-lag nit, not a real incompatibility — re-check whether it's still needed after any Expo SDK bump, and remove the flag/pin once versions line up.

## Linting & Type Checking
- ESLint config is `eslint.config.js` at the repo root (flat config, wraps `eslint-config-expo/flat`). This file did not exist before — `npm run lint` (`expo lint`) was silently offering to auto-generate one interactively on first run, which fails non-interactively in CI/sandboxes. Don't delete it; if `expo lint` ever asks to reconfigure, decline and fix `eslint.config.js` directly.
- Installing `eslint`/`eslint-config-expo` also needs `--legacy-peer-deps`, same root cause as the Jest peer-version lag above.
- There is no `example/`, `app-example/`, or `scripts/reset-project.js` in this repo — the original `create-expo-app` scaffold and its one-time reset script were removed since this boilerplate is well past the "fresh scaffold" stage; running `reset-project` was never applicable here and it's not coming back. If you see references to it in old docs/READMEs, they're stale.
- There are no stray `components/`, `hooks/`, `services/`, `store/`, `utils/` folders at the repo root anymore — they were empty leftovers from before the `src/` restructure and were deleted. All real code lives under `src/` per the Project Structure above. `expo lint`'s default globs include those root names, so their emptiness was also making lint fail outright (`No files matching the pattern ".../components" were found`) — don't recreate them at the root; add new domains under `src/`.

## Pain/Neck Tracker Domain
- Supabase tables (created directly in the dashboard, no local `supabase/` CLI folder): `checkins` (unique on `user_id, checkin_date, type`; shared pain/stiffness/range_of_motion fields plus morning-only and evening-only columns, `symptoms jsonb`, `triggers text[]`), `flare_ups`, `reminder_settings` (PK `user_id`), `profiles` (PK = auth user id, auto-created via `on_auth_user_created` trigger). RLS scopes every table to `auth.uid()`. Hand-written types matching this schema live in `src/types/database.types.ts` — there's no `supabase gen types` output, so keep these in sync manually if the schema changes.
- `src/hooks/useProfile.ts`, `useCheckins.ts`, `useFlareUps.ts`, `useReminderSettings.ts` are the first table-backed TanStack Query hooks in the repo (`useSession.ts` was auth-only). They follow `useAuthStore`'s never-throw contract: mutations return `{ error: string | null }`, callers `toast.error(error)` directly. `useCheckins.useUpsertCheckin()` upserts on `onConflict: 'user_id,checkin_date,type'` to match the DB unique constraint — this is how a same-day resubmission edits instead of duplicating.
- `src/lib/dates.ts` wraps `date-fns` for all `checkin_date`/`injury_started_on` local-date math — never derive these via `toISOString()`, which is UTC and can roll to the wrong day.
- Charts use `victory-native` (`CartesianChart` + `Line`) with `@shopify/react-native-skia` as its native peer — added specifically for `PainTrendChart`/`TrendSparkline`. Data arrays passed to `CartesianChart` need an index signature (e.g. `interface ChartPoint extends Record<string, unknown> { ... }`) or TS rejects the generic.
- `components/checkin/PainSlider.tsx` uses `@react-native-community/slider` for a real 0–10 drag slider (replaced an earlier chip-row implementation once the visual redesign below called for a continuous slider).
- `checkin/backfill.tsx` pulls in `@react-native-community/datetimepicker` (added as an Expo config plugin in `app.json`) — the only other native picker dependency in the project.
- Tabs are `(tabs)/index.tsx` (Home), `(tabs)/history.tsx` (was `explore.tsx`), `(tabs)/settings.tsx` (renamed from `profile.tsx`, kept all its original avatar/account UI and added Injury Info + Reminders sections). Modals `checkin/[type]`, `checkin/backfill`, `flare-up/new` are registered in root `_layout.tsx` alongside `modal/edit-profile`.
- `src/hooks/useAnalyzePatterns.ts` calls a Supabase Edge Function (`supabase/functions/analyze-patterns/`, Deno runtime — excluded from the app's `tsconfig.json` since it's a separate TS project) which itself calls the Claude API (`claude-opus-5`) server-side, so the Anthropic key never ships in the app bundle. The key lives only as a Supabase secret (`supabase secrets set ANTHROPIC_API_KEY=...`) — never put it in `.env` (that file is for the Expo client). Analysis results are cached on `profiles.last_pattern_analysis`/`last_pattern_analysis_at` so re-opening the screen doesn't silently re-run (and re-bill) the model; only an explicit "Re-run analysis" tap does. `eas.json`'s `production` build profile has `autoIncrement: true` — required for `eas build`/`eas submit` to work repeatedly, since without it every build reuses build number 1 and a second TestFlight submission collides.

## Visual Design System
- Palette lives in **both** `tailwind.config.js`'s `colors` extend object and `src/lib/theme.ts` (kept in sync manually — native-prop colors like icon colors and `tabBarStyle` can't consume Tailwind classes, so `theme.ts` is the non-Tailwind mirror). Adopted from Figma/Stitch-exported mockups (`assets/possible-app-design/`): `background`/`backgroundDark` (soft blue-tinted page bg, not plain white/black), `surface`/`surfaceDark` (card backgrounds), `primary`/`primaryDark` (forest green — replaces the old black/white-invert button and active-state scheme), `primaryMuted`/`primaryMutedDark` (light pill/chip backgrounds).
- Convention going forward: no new screen should use `bg-white dark:bg-black` for its page background, or `bg-black dark:bg-white` for a primary button/active-state — use `bg-background dark:bg-backgroundDark` and `bg-primary dark:bg-primaryDark` respectively, matching every existing screen.

## Maintaining This File
- Claude: whenever you discover a non-obvious project fact during a session — a dependency version conflict and its workaround, a new tool/library added to the stack, a convention the user corrects you on, a gotcha in how something is wired — add or update the relevant section here before ending the session, not just in chat.
- Prefer updating an existing section over creating a new one; only add a new `##` heading when the topic doesn't fit anywhere above.
- Keep entries factual and specific (what, why, workaround) rather than narrating the debugging process — future-you needs the conclusion, not the journey.
- If a documented fact turns out to be stale (a workaround no longer needed, a library replaced), correct or remove it rather than leaving both the old and new versions in the file.