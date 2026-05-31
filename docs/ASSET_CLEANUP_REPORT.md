# Raport czyszczenia assetow

Zakres: techniczne oczyszczenie i przyciecie zatwierdzonych PNG. Bez zmiany stylu, bez nowych grafik, bez zmian mechaniki.

| Asset | Tlo usuniete | Przyciecie marginesu | Finalny rozmiar |
| --- | --- | --- | --- |
| `player-student.png` | tak | tak | `494x1033` |
| `diploma.png` | nie | nie | `1254x1254` |
| `book.png` | nie | tak | `895x854` |
| `newsmonth.png` | nie | nie | `1086x1448` |
| `renata-boss.png` | nie | tak | `986x1201` |
| `MBA.png` | tak | tak | `822x1112` |
| `PKA.png` | tak | tak | `920x975` |
| `lapowka.png` | tak | tak | `864x929` |

Uwagi:

- `player-student.png` mial wypalone jasne tlo i byl przyciety do samego sprite'a.
- `MBA.png`, `PKA.png` i `lapowka.png` zostaly przygotowane jako przezroczyste PNG i przyciete do obiektu.
- Proceduralny Canvas zostaje tylko jako fallback techniczny, gdy PNG nie wczyta sie poprawnie.
