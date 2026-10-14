# Dziennik przekazań

Dopisuj nowe wpisy na górze. Każdy wpis: data, model, zadanie, co zrobiono, czego nie
zrobiono, co sprawdzono (i jak), co sprawdzono tylko przez czytanie, następny krok,
pytania do właściciela. Drugi model zaczyna od zera, więc pisz konkretnie.

---

## 2026-10-14, Claude, F1-1 (obciążenie relaya)

Zrobiono: policzono zapisy na jeden post w `relay/src/index.js` (około 8 wierszy D1) i
oszacowano dobę dla 7 osób w trzech scenariuszach. Wynik w `docs/OBCIAZENIE-RELAYA.md` i
skrót w D1: darmowy plan Cloudflare wystarcza tylko na spokojny dzień.

Sprawdzono przez czytanie kodu: zapytania relaya, kadencje w `main.js`, `net.js` i
`LocationPlanTest.kt`. Limity D1 sprawdzono na stronie cennika Cloudflare. Niczego nie mierzono
pod prawdziwym ruchem.

Następny krok: recenzja Groka (sprawdzić rachunek wierszy na post i założenia scenariuszy),
potem decyzja D1 po sprawdzeniach na CT8.

---

## 2026-10-14, Claude, F0-1 (wynik CT8, część pierwsza)

Zrobiono:

- Wpisano do D1 wynik od właściciela: na CT8 (`s1`) `node -v` to `v22.22.2`.
- Sprawdzono, że relay nie potrzebuje Node 24: używa tylko podstawowego API `node:sqlite`,
  dostępnego bez flagi od Node 22.13. W kontenerze na Node 22.22.0: `node --test
  test/relay.test.mjs` 61/61, `node --test test/server.test.mjs` 13/13, cały zestaw 1084
  przeszło, 34 pominięte, 0 błędów; `node relay/server.mjs` z plikową bazą odpowiada na
  `/api/v2/health` treścią `{"ok":true}`.
- Poprawiono zdanie „wymaga Node 24" w `ARCHITEKTURA.md` i `KONTEKST-ROZMOWY.md`.

Nie zrobiono: nic nie uruchamiano na CT8. Kontener to nie CT8 (inny system, możliwa inna
kompilacja Node).

Następny krok (właściciel): trzy sprawdzenia na CT8 wypisane w D1. Potem decyzja D1.

Pytanie do właściciela: czy zmienić w `AGENTS.md` wymóg „Node 24 lub nowszy" na „Node 22.22
lub nowszy", skoro tak działa serwer? Zmiana `engines` w forku to osobna sprawa (D4).

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
