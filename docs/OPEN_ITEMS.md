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

## UI

- Zdecydować, czy ranking tygodnia ma zostać jako sekcja rozwijana, czy ma być zawsze widoczny.
- Zdecydować, czy w HUD ma się pojawić licznik aktualnego levelu.
- Rozważyć osobny pasek HP bossa.

## Cloudflare / backend

- Nie ma publicznego klucza do D1.
- Dostęp odbywa się przez binding `DB` w `env`.
- Jeśli binding nie zapisuje się w panelu, najpewniej problemem jest typ wdrożenia:
  - Pages Functions wymagają folderu `functions` w projekcie,
  - direct upload nie jest właściwą ścieżką dla Functions,
  - binding trzeba mieć przypięty do właściwego projektu i wykonać redeploy.
- Do końcowego leaderboardu online potrzebujemy jednego spójnego deploya dla właściwego projektu.

## Następny krok techniczny

1. Zamknąć frekwencję `Psychologii`.
2. Dodać tryb leveli.
3. Zbudować walkę z bossem Renatą.
4. Dopiero potem dopięć resztę bossów.
