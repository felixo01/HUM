# Humanum

Humanum to prosta, satyryczna gra 2D w stylu retro handhelda LCD. Gracz steruje małym człowieczkiem w todze i czapce studenta, łapie spadające dyplomy, buduje combo i odblokowuje absurdalny bonus MBA.

Projekt działa jako czysta statyczna strona internetowa:

- bez backendu
- bez npm i bez zależności
- bez zewnętrznych grafik
- gotowy do wrzucenia na GitHub Pages albo Vercel

## Jak uruchomić lokalnie

1. Otwórz `index.html` bezpośrednio w przeglądarce.
2. Jeśli wolisz serwowanie przez lokalny serwer, wystarczy dowolny prosty static server.

## Jak wrzucić na GitHub Pages

1. Wypchnij repozytorium na GitHub.
2. Wejdź w ustawienia repozytorium.
3. W sekcji Pages ustaw źródło na gałąź główną i katalog główny repozytorium.
4. Zapisz zmiany i poczekaj na publikację.

## Jak wrzucić na Vercel

1. Zaimportuj repozytorium do Vercel.
2. Jako framework wybierz opcję bez frameworka lub statyczny hosting.
3. Nie ustawiaj build command.
4. Jako katalog publikacji użyj głównego folderu repozytorium.

## Plan dalszego rozwoju

- więcej typów spadających obiektów i bonusów
- ekran wyników z prostymi statystykami rundy
- efekty dźwiękowe retro
- tryb wyzwania z trudniejszym tempem
- lokalne osiągnięcia zapisane w przeglądarce
- delikatna animacja tła i menu startowego

## Sterowanie

- desktop: strzałki lewo/prawo oraz A/D
- mobile: przeciąganie palcem po dolnej części ekranu

## Zasady

- zbieraj `Dyplom`
- po 5 złapaniach pod rząd aktywuje się `Łapówka`
- po złapaniu `Łapówki` pojawia się bonus `MBA`
- złapanie `MBA` daje duży bonus punktowy i retro efekt
- rundy trwają 60 sekund
