# Huma-Num: otwarte decyzje i tuning

Status: lista rzeczy do dopięcia przed pełną implementacją

## Gameplay

- Ograniczyć częstotliwość spadania `Psychologii`, bo wypada za często.
- Ustalić, czy `Psychologia` ma być rzadkim bonusem, czy aktywacją tylko w wybranych levelach.
- Doprecyzować, czy `Renata` ma być pierwszym bossem obowiązkowo, czy tylko domyślnym pierwszym etapem.
- Ustalić, czy kolejne bossy mają być już znane z góry, czy dodawane później.

## Walka z bossem

- Doprecyzować, czy gracz kopie, czy rzuca książkami.
- Ustalić, czy książka ma być jedynym atakiem, czy jednym z dwóch ataków.
- Ustalić, czy `Newsweek` ma być tylko pociskiem, czy też przeszkodą terenową.
- Ustalić, jak długo trwa jedno okno na trafienie bossa.

## Poziomy

- Ustalić dokładny próg przejścia między levelami.
- Zdecydować, czy po każdym levelu ma być krótki ekran przejścia.
- Ustalić, czy kolory dyplomów mają odpowiadać poziomom 1-5 w stałej kolejności.
- Ustalić, jak bardzo Renata rośnie w siłę po każdym levelu:
  - szybciej rzuca gazetkami,
  - ma bardziej złożone wzorce,
  - dostaje krótsze przerwy po ataku.

## Model przyrostu trudności

- Level 1 ma być wyraźnie spokojniejszy i czytelny.
- Każdy kolejny level powinien dokładać tylko 1-2 nowe utrudnienia.
- Najpierw rośnie szybkość spadania, później dopiero agresja bossa.
- Boss ma być coraz sprytniejszy, ale nie ma zamieniać się w losowy spam.
- Wzrost ma być możliwy do nauczenia, a nie wyłącznie do przetrwania.

## UI

- Zdecydować, czy ranking tygodnia ma zostać jako sekcja rozwijana, czy ma być zawsze widoczny.
- Zdecydować, czy w HUD ma się pojawić licznik aktualnego levelu.
- Rozważyć osobny pasek HP bossa.
- Dodać możliwość otwierania rankingu z panelu `Najlepszy wynik`.

## Ranking

- Ranking ma być per poziom, a nie tylko per pełny run.
- Każdy zapis powinien zawierać:
  - login,
  - poziom,
  - wynik,
  - datę zapisu.
- Login ma być unikalny.
- Jeśli login już istnieje, wpis nie może zostać dodany drugi raz.
- Frontend powinien walidować login prostym regexem:
  - bez pustego wpisu,
  - bez spacji na początku i końcu,
  - bez znaków technicznych.
- Backend powinien traktować login jako klucz unikalny w bazie.
- Jeśli wynik jest zapisywany dla kilku poziomów, trzeba rozważyć:
  - unikalność `nickname + level`,
  - albo pełną unikalność loginu globalnie.

## Cloudflare / backend

- Nie ma publicznego klucza do D1.
- Dostęp odbywa się przez binding `DB` w `env`.
- Jeśli binding nie zapisuje się w panelu, najpewniej problemem jest typ wdrożenia:
  - Pages Functions wymagają folderu `functions` w projekcie,
  - direct upload nie jest właściwą ścieżką dla Functions,
  - binding trzeba mieć przypięty do właściwego projektu i wykonać redeploy.
- Do końcowego leaderboardu online potrzebujemy jednego spójnego deploya dla właściwego projektu.
- Jeśli leaderboard ma działać per level, tabela w D1 powinna mieć kolumnę `level`.
- Warto ustalić, czy klucz unikalny ma być:
  - `nickname`,
  - czy `nickname + level`.

## Następny krok techniczny

1. Zamknąć częstotliwość `Psychologii`.
2. Dodać tryb pięciu leveli.
3. Zbudować walkę z bossem Renatą.
4. Dopiero potem dopiąć resztę bossów i ranking per level.
