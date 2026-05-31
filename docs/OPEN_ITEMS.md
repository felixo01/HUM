# KOLEGUM HUMANOOB: otwarte decyzje i tuning

Status: lista rzeczy do dopięcia po aktualnym audycie.

## Gameplay

- Dopracować balanse poziomów 2-5 po kilku realnych playtestach.
- Sprawdzić, czy `Psychologia` wpada wystarczająco często, ale nie zalewa planszy.
- Ustalić, czy w przyszłości pojawią się dodatkowe bonusy poza `Łapówką`, `MBA` i `Psychologią`.
- Zdecydować, czy `PKA` ma zostać dokładnie w obecnym tempie, czy nadal lekko je regulujemy.

## Bossy

- Renata jest pierwszym bossem i działa jako wzorzec.
- Kolejne bossy po Renacie nie są jeszcze zaimplementowane.
- Trzeba zaprojektować ich wygląd, ataki i progresję trudności.

## Ranking

- Ranking działa per tydzień i per poziom.
- Do dopięcia zostaje dłuższy playtest, czy unikalność loginu `nickname + level` jest wystarczająca.
- Warto rozważyć filtrowanie rankingu po poziomie także w przyszłym ekranie statystyk.
- Dobrze byłoby dodać prostą antyspamową walidację na backendzie, jeśli leaderboard zacznie być mocno używany.

## Cloudflare / deployment

- Nie używamy żadnego publicznego klucza do D1.
- Dostęp do bazy idzie przez binding `DB`.
- W repo jest workflow GitHub Pages, który publikuje tylko statyczne pliki gry.
- D1 wymaga migracji `0001_init.sql` i `0002_level_ranking.sql`.
- Warto po wdrożeniu jeszcze raz ręcznie sprawdzić, czy binding `DB` w Cloudflare jest aktywny dla właściwego projektu.

## UI / polish

- Można jeszcze dopieścić animację biegu studenta.
- Można wygładzić przejścia między planszą poziomu a walką z bossem.
- Można dodać lepsze statystyki w rankingu, np. numer poziomu na liście.

## Następny krok techniczny

1. Zagrać kilka pełnych runów i spisać balans.
2. Dodać kolejne bossy.
3. Rozbudować ranking o dodatkowe statystyki, jeśli będzie potrzebny.
