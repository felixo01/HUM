# KOLEGUM HUMANOOB

KOLEGUM HUMANOOB to prosta satyryczna gra 2D w stylu retro handhelda. Gracz steruje malym studentem w todze i czapce, lapie spadajace dyplomy, buduje combo, a po kazdym poziomie mierzy sie z bossowa Renata.

Projekt dziala jako czysta statyczna strona:

- bez npm i bez ciezkich zaleznosci
- bez backendu do samej gry
- bez generowania nowych grafik w kodzie
- gotowy do wrzucenia na GitHub Pages albo Vercel

## Co jest w grze

- 5 poziomow z rosnaca trudnoscia
- plansza przejsciowa przed bossem z odliczaniem 3, 2, 1
- boss Renata po kazdym poziomie
- prosty system bossowych atakow z gazeta `NEWSMONTH`
- bonusy `LAPOWKA`, `MBA` i `Psychologia`
- proste dzwieki retro przez Web Audio API
- ranking tygodniowy per poziom
- fallback lokalny w `localStorage`, jesli backend chwilowo nie dziala

## Zatwierdzone assety

Wszystkie glowne grafiki gry sa ladowane z folderu `assets/` i to one sa zrodlem prawdy dla wygladu sprite'ow:

- `assets/player-student.png`
- `assets/diploma.png`
- `assets/book.png`
- `assets/newsmonth.png`
- `assets/renata-boss.png`

Jesli plik PNG jest dostepny i sie laduje, gra rysuje go w pierwszej kolejnosci. Proceduralny Canvas jest tylko technicznym fallbackiem na wypadek brakujacego assetu.

## Uruchomienie lokalne

1. Otworz `index.html` bezposrednio w przegladarce.
2. Jesli wolisz lokalny serwer, uzyj dowolnego prostego static servera.

## Sterowanie

- desktop: strzalki lewo/prawo oraz `A`/`D`
- mobile: przeciaganie palcem po dolnej czesci ekranu
- w walce z bossem: klik lub przycisk akcji wykonuje rzut ksiazka / atak

## GitHub Pages

Repo ma workflow w `.github/workflows/pages.yml`, ktory:

1. uruchamia testy skladni i testy dymne,
2. kopiuje tylko statyczne pliki gry do `_site`,
3. publikuje wynik jako GitHub Pages.

Wymagane pliki do publikacji:

- `index.html`
- `styles.css`
- `game.js`
- `.nojekyll`

## Cloudflare leaderboard

Ranking dziala jako backend serverless na Cloudflare Pages Functions albo Worker + D1.

Model danych jest per tydzien i per poziom:

- `week_key`
- `level`
- `nickname`
- `score`
- `updated_at`

W repo sa pliki:

- `functions/api/[[path]].js`
- `cloudflare/worker.js`
- `cloudflare/migrations/0001_init.sql`
- `cloudflare/migrations/0002_level_ranking.sql`
- `cloudflare/wrangler.toml`

Binding bazy D1:

- nazwa bindingu: `DB`
- nazwa bazy: `humanum_leaderboard`

Frontend najpierw probuje `\/api` na tym samym hoscie, potem meta tag `humanum-leaderboard-api`, a na koncu publiczny fallback worker.

## Testy

Uruchom lokalnie:

```bash
node --check game.js
node --check cloudflare/worker.js
node --check "functions/api/[[path]].js"
node --test tests/smoke.test.mjs
```

Na Windows PowerShell najbezpieczniej uruchamiac wlasnie komendy `node --...`. Jesli wolisz `npm test`, uzyj `npm.cmd test`.

## Plan dalszego rozwoju

- dopracowanie balansu poziomow 2-5
- kolejne bossy po Renacie
- lepsze efekty dzwiekowe i animacje
- dodatkowe statystyki rankingu
- mozliwy tryb challenge / endless

## Dokumentacja

- [Spec poziomow i bossow](docs/LEVELS_BOSSES_SPEC.md)
- [Lista otwartych decyzji](docs/OPEN_ITEMS.md)
- [Audyt stanu projektu](docs/AUDIT.md)
