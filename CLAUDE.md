# Claude: rola i wskazówki

Najpierw `AGENTS.md`. Ten plik tylko go uzupełnia.

## Proponowana rola

- Projekt i wdrożenie rzeczy blisko protokołu: czat (F3), własny relay (F1), ewentualny port
  na PHP, natywny Swift (F4, jeśli D3 to zatwierdzi).
- Koordynacja: utrzymywanie `docs/PLAN.md`, `docs/DECYZJE.md` i `docs/HANDOFF.md`.
- Recenzja zmian napisanych przez Gemini lub Groka, zwłaszcza dotykających sieci,
  przechowywania danych i kryptografii.

## Wskazówki

- Przed jakąkolwiek zmianą w kodzie forka uruchom testy i zapisz wynik bazowy w HANDOFF.
  Dwa testy padają, dopóki nie uruchomisz `bash tools/sync-vendor.sh` (brakuje vendorowanego
  Leafleta), to nie jest błąd.
- Plik `app/js/main.js` ma około 7900 linii. Nie czytaj go w całości bez potrzeby; szukaj
  po nazwach funkcji (przyjmowanie wiadomości około linii 2300 i dalej, wysyłanie SOS około
  6700). Numery linii dotyczą wersji 0.21.0 i będą się zmieniać.
- Commity: dopisuj stopkę `Co-Authored-By` zgodnie z ustawieniami środowiska, w którym
  pracujesz, o ile właściciel nie zdecyduje inaczej.
- Gdy zadanie okazuje się większe, niż zakładał plan, przerwij, opisz to w HANDOFF
  i zaproponuj podział. Nie rozrastaj PR-a.
