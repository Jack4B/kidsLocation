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
- Commity: podpis według sekcji „Podpis” poniżej.
- Gdy zadanie okazuje się większe, niż zakładał plan, przerwij, opisz to w HANDOFF
  i zaproponuj podział. Nie rozrastaj PR-a.

## Stack

- Kod aplikacji to fork Starlinga w `starling/` (GPL-3.0-or-later), aktualizacje upstreamu
  według `docs/AKTUALIZACJE-UPSTREAM.md`.
- Android: `compileSdk = 36` (`starling/android/app/build.gradle.kts`).
- `starling/app/js/main.js` ma około 7900 linii. Szukaj po nazwach funkcji, nie czytaj całości.
- Relay działa na CT8 (`docs/WDROZENIE-CT8.md`).
- APK budowane i podpisywane przez `.github/workflows/aplikacja.yml`, publikowane jako
  GitHub Releases, instalowane i aktualizowane przez Obtainium (`docs/PODPIS-APK.md`).

## Workflow

1. Każda zmiana to osobny branch i jeden PR według `.github/pull_request_template.md`.
2. Recenzja „[Forge]” z uwagami P0, P1, P2.
3. Poprawki według recenzji, w tym samym PR-ze.
4. Po „[Forge] APPROVE” scalasz sam (squash), bez czekania na osobną zgodę.
5. Bez APPROVE nigdy nie scalaj. Nigdy nie pushuj bezpośrednio do `main`.

## Podpis

- Commity i komentarze podpisuj tylko „[Jack4B]”, bez `Co-Authored-By` i bez linków
  `Claude-Session`.
- W repo używaj tylko „Jack4B”, żadnych prawdziwych imion.

## versionCode

- `versionCode = 2100 * 1000 + FAMILY_BUILD`, gdzie `FAMILY_BUILD` to `github.run_number`.
- Musi zawsze rosnąć. Przy aktualizacji upstreamu podnoś wyższą część, nigdy jej nie zmniejszaj.
- Lokalny build ma `FAMILY_BUILD=0`. Nie publikuj go jako release.
- `run_number` od 1000 wchodzi na część upstreamu. Otwarte ryzyko, zapisane w `docs/DECYZJE.md`
  (D8).

## Język

Wszystko po polsku, krótko. Dokumentacja, opisy PR, commity i komentarze po polsku.
Identyfikatory w kodzie po angielsku (zgodność z upstreamem Starlinga).

## Każdy PR

- Testy przed zmianą i po niej, oba wyniki w `docs/HANDOFF.md`.
- W opisie: co zmieniono i jak to sprawdzić na telefonie.
