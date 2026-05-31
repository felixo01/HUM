# KOLEGA HUMANOOB: spec trybu poziomów i bossów

Status: implementacja bazowa działa, teraz dopinamy balans i dalsze bossy.

## Cel trybu

Rozszerzyć KOLEGA HUMANOOB o pięć poziomów zakończonych walką z bossem. Tryb ma być nadal czytelny, satyryczny i grywalny na telefonie.

## Pętla rozgrywki

1. Gracz łapie spadające dyplomy przez 60 sekund.
2. Po zakończeniu czasu pojawia się plansza przejściowa z wynikiem poziomu i odliczaniem 3, 2, 1.
3. Dopiero po odliczeniu wjeżdża boss Renata.
4. Po pokonaniu bossów pojawia się plansza zaliczenia poziomu.
5. Po piątym poziomie kończy się cała sesja.

## Aktualny stan implementacji

- jest 5 poziomów,
- trudność rośnie w czasie w ramach jednego poziomu,
- boss Renata pojawia się po każdym poziomie,
- po bossie pokazujemy osobną planszę przejściową,
- ranking działa per tydzień i per poziom,
- UI ma tylko cztery kafelki HUD, a poziom jest pokazany osobno poniżej.

## Poziomy

### Poziom 1

- najspokojniejszy start,
- jasne dyplomy,
- najłatwiejsze tempo spadania,
- Renata ma najprostszy wzorzec ataku,
- plansza przed bossem służy do wejścia w rytm gry.

### Poziom 2

- większe tempo spadania,
- pojawia się więcej przeszkód,
- dyplomy dostają ciemniejszą kolorystykę,
- Renata zaczyna częściej rzucać gazetami.

### Poziom 3

- szybszy rytm gry,
- zielona wersja dyplomów,
- psychologia może wpadać trochę częściej,
- Renata dostaje krótsze przerwy.

### Poziom 4

- wyraźnie gęstszy spawn,
- boss jest bardziej agresywny,
- pojawia się drugi pocisk albo większa presja czasowa,
- gracze muszą częściej wykorzystywać ruch boczny.

### Poziom 5

- finał,
- najwyższe tempo,
- najbardziej agresywna wersja Renaty,
- nadal ma być trudny, ale nie chaotyczny.

## Boss: Renata

### Wygląd

- krótkie czarne włosy,
- czytelna sylwetka pixel-art,
- prosty, satyryczny styl,
- podpis na ekranie: `BOSS RENATA`.

### Zachowanie

- boss pojawia się dopiero po planszy 3, 2, 1,
- rzuca czerwonymi gazetami `NEWSMONTH`,
- potrafi czytać pozycję gracza i celować w jego tor,
- im wyższy poziom, tym krótsze przerwy między rzutami.

### Atak gracza

- gracz przemieszcza się lewo/prawo,
- atak odbywa się książką albo kopnięciem,
- boss dostaje obrażenia po trafieniu.

## Plansze przejściowe

### Przed bossem

- pokazujemy wynik bieżącego poziomu,
- pokazujemy `BOSS RENATA`,
- pokazujemy odliczanie 3, 2, 1,
- dopiero po tym boss wjeżdża na planszę.

### Po bossie

- pokazujemy, że poziom został zaliczony,
- pokazujemy wynik poziomu po walce z Renatą,
- po chwili przechodzimy do kolejnego etapu albo do końca gry.

## Ranking

- ranking jest per tydzień i per poziom,
- wpis zawiera login, poziom, wynik i czas zapisu,
- ten sam login może istnieć osobno dla różnych poziomów,
- ranking ma fallback lokalny, jeśli backend chwilowo nie odpowiada.

## Balans i trudność

Zasada jest prosta:

- level 1 ma być wyraźnie łatwiejszy od reszty,
- każdy kolejny poziom dokłada tylko 1-2 nowe utrudnienia,
- wzrost tempa ma być czytelny,
- boss ma być coraz groźniejszy, ale nadal do nauczenia.

## Artefakty Canvas

- `Dyplom`
- `Łapówka`
- `MBA`
- `Psychologia`
- `PKA`
- `NEWSMONTH`
- `Renata`
- pasek HP bossa
- plansza przejściowa

## Kryterium sukcesu

Tryb jest gotowy, jeśli:

- da się przejść 5 poziomów,
- boss Renata jest czytelna,
- plansze przed i po bossie są zrozumiałe bez instrukcji,
- ranking nie miesza poziomów,
- gra działa dobrze na desktopie i telefonie.
