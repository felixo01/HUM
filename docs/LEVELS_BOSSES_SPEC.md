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

### Poziom 2

- Większa prędkość spadania.
- Krótsze okna reakcji.
- Dyplomy w bordowej wersji kolorystycznej.

### Poziom 3

- Jeszcze szybszy rytm.
- Dyplomy zielone.
- Więcej ruchu w tle.

### Poziom 4

- Trudniejszy timing.
- Więcej fałszywych sygnałów.
- Intensywniejsze kolory i mocniejsze tempo.

### Poziom 5

- Finałowy, najszybszy etap.
- Najgęstszy spawn.
- Najbardziej agresywny boss.

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

## Zasada trudności

- Każdy kolejny poziom ma szybszy spawn i krótszy czas reakcji.
- Gra ma być trudniejsza, ale nadal możliwa do ogarnięcia.
- Nie może zamienić się w losowy spam.

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
