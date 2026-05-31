# Huma-Num: spec trybu poziomów i bossów

Status: szkic roboczy przed implementacją

## Cel

Rozszerzyć Huma-Num z prostego arcade o strukturę pięciu poziomów zakończonych walką z bossem.
Tryb ma nadal być lekki, retro i czytelny na telefonie.

## Założenie pętli rozgrywki

1. Gracz zbiera spadające dyplomy.
2. Po ukończeniu poziomu pojawia się boss.
3. Boss ma prostą walkę zręcznościową.
4. Po pokonaniu bossa przechodzimy do kolejnego poziomu.
5. Po piątym bossie kończy się cała sesja.

## Struktura pięciu poziomów

### Poziom 1

- Najłatwiejszy start.
- Jasne dyplomy.
- Mniej przeszkód.
- Boss: Renata.
- Renata ma najprostszy zestaw ataków.
- Gracz dostaje najdłuższe okna reakcji.

### Poziom 2

- Większa prędkość spadania.
- Krótsze okna reakcji.
- Dyplomy w bordowej wersji kolorystycznej.
- Renata staje się szybsza i zaczyna mieszać dwa typy ataku.
- Pojawia się pierwszy wyraźny rytm "atak - przerwa - kontratak".

### Poziom 3

- Jeszcze szybszy rytm.
- Dyplomy zielone.
- Więcej ruchu w tle.
- Renata dostaje bardziej wymyślny wzorzec ruchu.
- Gracz ma krótsze okno na trafienie, ale nadal czytelne.

### Poziom 4

- Trudniejszy timing.
- Więcej fałszywych sygnałów.
- Intensywniejsze kolory i mocniejsze tempo.
- Renata zaczyna "czytać" pozycję gracza i rzucać częściej.
- Wymagane są bardziej świadome uniki i lepszy timing ataku.

### Poziom 5

- Finałowy, najszybszy etap.
- Najgęstszy spawn.
- Najbardziej agresywny boss.
- Renata ma najbardziej złożony rytm ataków.
- To ma być finał, ale nadal możliwy do opanowania bez losowego chaosu.

## Boss 1: Renata

### Opis wizualny

- Kobieta z krótkimi, czarnymi włosami.
- Wyraźna, prosta sylwetka pixel-art.
- Ekran prezentuje podpis: `Boss: Renata`.

### Ruch i zachowanie

- Renata porusza się w ograniczonym zakresie poziomym.
- Gracz musi unikać jej ataków i atakować w przerwach.
- Jej atak jest prosty, czytelny i nieprzesadnie szybki.

### Ataki Renaty

- Rzuca małymi czerwonymi gazetkami z napisem `Newsweek`.
- Gazetki lecą po łuku lub po prostej, ale zawsze czytelnie.
- Wzrost trudności polega na zwiększeniu częstotliwości, nie na chaosie.

### Atak gracza

- Gracz naciska strzałki lewo/prawo, by ustawić pozycję.
- Pacja / kliknięcie / przycisk akcji wykonuje kopnięcie.
- Alternatywna wersja do rozważenia: rzut książką.

## Wymagana logika walki

- Boss ma pasek zdrowia.
- Gracz trafia bossa w oknie po jego ataku.
- Trafienie zadaje punkty i zmniejsza HP bossa.
- Po zejściu HP do zera następuje przejście do następnego poziomu.
- Wynik poziomu to suma:
  - punktów za dyplomy,
  - punktów za trafienia bossa,
  - premii za ukończenie poziomu.
- Do rankingu zapisujemy wynik osobno dla każdego poziomu.
- Przy zapisie rankingowym zapisujemy:
  - login,
  - numer poziomu,
  - wynik,
  - czas zapisu.
- Login ma być unikalny zgodnie z regułą bazy:
  - albo globalnie,
  - albo w parze `login + level`, jeśli później uznamy, że jeden gracz może mieć osobny wpis dla każdego poziomu.

## Zasada trudności

- Każdy kolejny poziom ma szybszy spawn i krótszy czas reakcji.
- Gra ma być trudniejsza, ale nadal możliwa do ogarnięcia.
- Nie może zamienić się w losowy spam.
- Przyrost ma być liniowo-czytelny, a nie skokowy:
  - level 1 jest wyraźnie spokojniejszy,
  - każdy następny level dokłada 1-2 nowe utrudnienia,
  - boss Renata rośnie w sile przez częstotliwość, warianty ataku i szybsze przerwy,
  - nie dodajemy od razu wszystkich mechanik naraz.

## Model przyrostu trudności

Proponowany kierunek:

1. Zwiększać tylko 1 główny parametr na poziom, np. szybkość spadania.
2. Drugi parametr podnosić delikatnie, np. częstotliwość bossa.
3. Wprowadzać nowe zachowanie bossa dopiero od poziomu 2 lub 3.
4. Zostawić czytelne "okno zwycięstwa" nawet w poziomie 5.
5. Unikać losowego chaosu, który nie daje się nauczyć.

## Kolory dyplomów

Proponowana progresja:

- Poziom 1: jasny pergamin.
- Poziom 2: bordowy.
- Poziom 3: zielony.
- Poziom 4: ciemniejszy odcień z wysokim kontrastem.
- Poziom 5: finałowy wariant najbardziej agresywny wizualnie.

## Artefakty i ikonki

Do narysowania w Canvasie:

- `Dyplom`
- `Książka`
- `Newsweek`
- `Renata`
- pasek HP bossa
- napis `Boss: Renata`

## Zasady stylu

- bez fotorealistycznych grafik
- bez zewnętrznych assetów
- wszystko w Canvasie
- pixel-art i proste kształty
- czytelność ważniejsza niż detal

## Co ma zostać po staremu

- sterowanie na telefonie i desktopie
- prosta obsługa pauzy
- retro klimat
- satyryczny ton

## Kryterium sukcesu

Tryb jest gotowy, jeśli:

- da się przejść pięć poziomów,
- każdy level ma własny rytm,
- Renata działa jak czytelny pierwszy boss,
- gracz rozumie, co ma robić bez czytania instrukcji po kilka razy.
