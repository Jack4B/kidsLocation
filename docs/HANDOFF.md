# Dziennik przekazań

Dopisuj nowe wpisy na górze. Każdy wpis: data, model, zadanie, co zrobiono, czego nie
zrobiono, co sprawdzono (i jak), co sprawdzono tylko przez czytanie, następny krok,
pytania do właściciela. Drugi model zaczyna od zera, więc pisz konkretnie.

---

## 2026-10-14, Claude, F0-5 (testy bazowe)

Zrobiono (fork `Jack4B/starling`, wersja 0.21.0, commit `8ec6dad`, lokalny klon tylko do odczytu):

```
node -v                          # v24.21.0 (oficjalna paczka z nodejs.org, suma SHA-256 sprawdzona)
npm ci --ignore-scripts          # instaluje tylko Leaflet 1.9.4 (zależność deweloperska)
bash tools/sync-vendor.sh        # vendor synced: leaflet 1.9.4 (unminified)
node --test test/*.test.mjs
  tests 1118, pass 1084, fail 0, cancelled 0, skipped 34, duration_ms 32618
```

Ten sam zestaw na Node 22.22.0 (wersja zbliżona do CT8): tests 1118, pass 1084, fail 0,
skipped 34. Jedyna różnica to ostrzeżenie `ExperimentalWarning` dla `node:sqlite` w logu.
Dwa testy, które padały w fazie 0, przechodzą po `sync-vendor.sh` (to był brak Leafleta).

Nie zrobiono: testów e2e (wymagają Firefoksa i Pythona z Marionette), testów Kotlina w
`android/` ani niczego na urządzeniach. W forku nic nie zmieniono, nic nie wypchnięto.

Następny krok: recenzja Gemini (powtórzyć te cztery komendy i porównać liczby). Ten wynik jest
punktem odniesienia dla każdego przyszłego PR-a z kodem.

---

## 2026-10-14, Claude, przekazanie do nowej sesji

Dodano `docs/KONTEKST-ROZMOWY.md` (streszczenie rozmowy, ograniczenia, pytania) i źródła
makiet w `docs/makiety/zrodla/`. Kodu nie zmieniano. Nowa sesja zaczyna od
`docs/KONTEKST-ROZMOWY.md`.

---

## 2026-10-14, Claude, faza 0 (przygotowanie)

Zrobiono:

- Przeanalizowano fork `Jack4B/starling` w wersji 0.21.0 (commit `8ec6dad`): README,
  `SELF-HOSTING.md`, `IOS.md`, `PROTOCOL.md`, relay, strukturę `app/`, `android/`, `ios/`.
  Wyniki w `docs/ARCHITEKTURA.md`.
- Uruchomiono testy jednostkowe na Node 22.22: 1118 testów, 1082 przeszło, 34 pominięto,
  2 nie przeszły. Oba to kontrola istnienia plików Leaflet w `/vendor/` (brak
  `tools/sync-vendor.sh`), nie błąd kodu. Repo wymaga Node 24; nie sprawdzono, czy na 24
  jest tak samo.
- Przygotowano makiety interfejsu w motywie jasnym i ciemnym oraz tokeny (`docs/DESIGN.md`).
- Spisano plan (`docs/PLAN.md`), decyzje (`docs/DECYZJE.md`) i zasady dla modeli.

Nie zrobiono:

- Nie zmieniano kodu aplikacji. Nie uruchamiano relaya. Nie testowano na urządzeniach.
- Nie sprawdzano CT8 (wersja Node, długo działające procesy).
- Makiety nie były sprawdzane wizualnie ani na prawdziwym ekranie.

Repozytorium `Jack4B/kidsLocation` założył właściciel; Claude wgrał do niego tę zawartość
na `main` (commit `5ffc0c8`). F0-3 jest w połowie: zostaje podpięcie Gemini i Groka.

Następny krok: właściciel wykonuje F0-1 i F0-2 oraz podpina Gemini i Groka; potem F0-5 i F1-1.

Pytania do właściciela: wynik `node -v` na CT8; czy jest Mac; gdzie ma leżeć kod (D4).
