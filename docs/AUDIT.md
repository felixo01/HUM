# KOLEGUM HUMANOOB: audyt stanu projektu

Data audytu: 2026-05-31

## Co działa

- 5 poziomów z narastającą trudnością.
- Plansza przejściowa przed bossem z odliczaniem 3, 2, 1.
- Boss Renata po każdym poziomie.
- Plansza po bossie pokazująca wynik poziomu.
- Zapis wyniku po ukończeniu poziomu oraz po game over, z zachowaniem modelu `week_key + level + nickname`.
- Naprawiony overlay po `levelclear`, który wcześniej blokował przejście do kolejnego levelu.
- Dźwięki retro przez Web Audio API.
- Ranking per tydzień i per poziom.
- Lokalny fallback rankingu w `localStorage`.
- GitHub Pages workflow, który publikuje tylko statyczne pliki gry.
- Test dymny w `tests/smoke.test.mjs`.

## Co zostało zauważone

- Late-game balans nadal wymaga realnego playtestu.
- Kolejne bossy po Renacie są jeszcze do zaprojektowania.
- Cloudflare leaderboard trzeba po wdrożeniu ręcznie potwierdzić w panelu, bo binding `DB` jest krytycznym elementem konfiguracji.
- Animacja biegu postaci i szczegóły bossowych pocisków nadal mogą być lekko poprawiane wizualnie.

## Wnioski

Repo jest już spójne strukturalnie:

- frontend i backend używają tego samego modelu rankingu,
- publikacja na Pages jest odseparowana od plików backendowych,
- dokumentacja opisuje aktualny stan, a nie tylko dawny plan.
