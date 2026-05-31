# HUMA-NUM

HUMA-NUM to prosta, satyryczna gra 2D w stylu retro handhelda LCD. Gracz steruje małym studentem w todze i czapce, łapie spadające dyplomy, buduje combo i odblokowuje absurdalne bonusy.

Projekt działa jako czysta statyczna strona internetowa:

- bez backendu do samej gry
- bez npm i bez ciężkich zależności
- bez zewnętrznych grafik
- gotowy do wrzucenia na GitHub Pages albo Vercel

## Jak uruchomić lokalnie

1. Otwórz `index.html` bezpośrednio w przeglądarce.
2. Jeśli wolisz lokalny serwer, użyj dowolnego prostego static servera.

## Jak wrzucić na GitHub Pages

1. Wypchnij repozytorium na GitHub.
2. Wejdź w ustawienia repozytorium.
3. W sekcji Pages ustaw źródło na gałąź główną i katalog główny repozytorium.
4. Zapisz zmiany i poczekaj na publikację.

## Online leaderboard na Cloudflare Pages Functions

Leaderboard jest przygotowany jako prosty backend serverless na Cloudflare Pages Functions + D1.

Co robi:

- przyjmuje login gracza i wynik
- zapisuje najlepszy wynik dla danego nicku w danym tygodniu
- pokazuje ranking tylko dla bieżącego tygodnia
- działa anonimowo, bez Supabase i bez logowania

Pliki backendu znajdziesz w:

- `functions/api/[[path]].js`
- `cloudflare/migrations/0001_init.sql`
- `cloudflare/worker.js`
- `cloudflare/wrangler.toml`

Jak to uruchomić:

1. Zaloguj się do Cloudflare.
2. Utwórz bazę D1 o nazwie `humanum_leaderboard`.
3. Wstaw prawdziwy `database_id` do `cloudflare/wrangler.toml` albo podłącz bazę w ustawieniach Pages.
4. Wgraj migrację `cloudflare/migrations/0001_init.sql`.
5. Opublikuj projekt tak, aby obsługiwał folder `functions`.
6. Jeśli korzystasz z innego hostingu niż Cloudflare, pozostaw meta tag `humanum-leaderboard-api` z zewnętrznym adresem workera jako fallback.

Frontend najpierw spróbuje `\/api` na tym samym hoście, a potem zewnętrzny adres z meta taga.

## Jak wrzucić na Vercel

1. Zaimportuj repozytorium do Vercel.
2. Wybierz opcję bez frameworka lub hosting statyczny.
3. Nie ustawiaj build command.
4. Jako katalog publikacji użyj głównego folderu repozytorium.

## Plan dalszego rozwoju

- więcej typów spadających obiektów i bonusów
- lepsza tabela wyników z prostymi statystykami tygodnia
- efekty dźwiękowe retro
- tryb wyzwania z trudniejszym tempem
- lokalne osiągnięcia zapisane w przeglądarce
- delikatna animacja tła i menu startowego

## Dokumentacja rozwoju

W repo są też pliki planujące kolejne kroki projektu:

- [docs/LEVELS_BOSSES_SPEC.md](docs/LEVELS_BOSSES_SPEC.md)
- [docs/OPEN_ITEMS.md](docs/OPEN_ITEMS.md)

## Sterowanie

- desktop: strzałki lewo/prawo oraz A/D
- mobile: przeciąganie palcem po dolnej części ekranu

## Zasady

- zbieraj `Dyplom`
- po 5 złapaniach pod rząd aktywuje się `Łapówka`
- po złapaniu `Łapówki` pojawia się bonus `MBA`
- złapanie `MBA` daje duży bonus punktowy, efekt retro i przyspieszenie
- rundy trwają 60 sekund
