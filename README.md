# KOLEGA HUMANOOB

KOLEGA HUMANOOB to prosta satyryczna gra 2D w stylu retro handhelda. Gracz steruje małym studentem w todze i czapce, łapie spadające dyplomy, buduje combo, a po każdym poziomie mierzy się z bossową Renatą.

Projekt działa jako czysta statyczna strona:

- bez npm i bez ciężkich zależności
- bez backendu do samej gry
- bez zewnętrznych grafik
- gotowy do wrzucenia na GitHub Pages albo Vercel

## Co jest w grze

- 5 poziomów z rosnącą trudnością
- plansza przejściowa przed bossem z odliczaniem 3, 2, 1
- boss Renata po każdym poziomie
- prosty system bossowych ataków z gazetą `NEWSMONTH`
- bonusy `Łapówka`, `MBA` i `Psychologia`
- proste dźwięki retro przez Web Audio API
- ranking tygodniowy per poziom
- fallback lokalny w `localStorage`, jeśli backend chwilowo nie działa

## Uruchomienie lokalne

1. Otwórz `index.html` bezpośrednio w przeglądarce.
2. Jeśli wolisz lokalny serwer, użyj dowolnego prostego static servera.

## Sterowanie

- desktop: strzałki lewo/prawo oraz `A`/`D`
- mobile: przeciąganie palcem po dolnej części ekranu
- w walce z bossem: klik lub przycisk akcji wykonuje rzut książką / atak

## GitHub Pages

Repo ma workflow w `.github/workflows/pages.yml`, który:

1. uruchamia testy składni i testy dymne,
2. kopiuje tylko statyczne pliki gry do `_site`,
3. publikuje wynik jako GitHub Pages.

Wymagane pliki do publikacji:

- `index.html`
- `styles.css`
- `game.js`
- `.nojekyll`

## Cloudflare leaderboard

Ranking działa jako backend serverless na Cloudflare Pages Functions lub Worker + D1.

Model danych jest per tydzień i per poziom:

- `week_key`
- `level`
- `nickname`
- `score`
- `updated_at`

W repo są pliki:

- `functions/api/[[path]].js`
- `cloudflare/worker.js`
- `cloudflare/migrations/0001_init.sql`
- `cloudflare/migrations/0002_level_ranking.sql`
- `cloudflare/wrangler.toml`

Binding bazy D1:

- nazwa bindingu: `DB`
- nazwa bazy: `humanum_leaderboard`

Frontend najpierw próbuje `\/api` na tym samym hoście, potem meta tag `humanum-leaderboard-api`, a na końcu publiczny fallback worker.

## Testy

Uruchom lokalnie:

```bash
node --check game.js
node --check cloudflare/worker.js
node --check "functions/api/[[path]].js"
node --test tests/smoke.test.mjs
```

Na Windows PowerShell najbezpieczniej uruchamiać właśnie komendy `node --...`. Jeśli wolisz `npm test`, użyj `npm.cmd test`.

## Plan dalszego rozwoju

- dopracowanie balansu poziomów 2-5
- kolejne bossy po Renacie
- lepsze efekty dźwiękowe i animacje
- dodatkowe statystyki rankingu
- możliwy tryb challenge / endless

## Dokumentacja

- [Spec poziomów i bossów](docs/LEVELS_BOSSES_SPEC.md)
- [Lista otwartych decyzji](docs/OPEN_ITEMS.md)
- [Audyt stanu projektu](docs/AUDIT.md)
