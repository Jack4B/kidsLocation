# Dziennik przekazań

Dopisuj nowe wpisy na górze. Każdy wpis: data, model, zadanie, co zrobiono, czego nie
zrobiono, co sprawdzono (i jak), co sprawdzono tylko przez czytanie, następny krok,
pytania do właściciela. Drugi model zaczyna od zera, więc pisz konkretnie.

---

## 2026-10-14, Claude, F3-0 (szkic ADR czatu)

Zrobiono: szkic `docs/adr/ADR-001-czat.md` (status „proponowana") z pomiarami w
`docs/adr/ADR-001-pomiary.md` i skryptami w `docs/adr/pomiary/`. Skrypty tylko importują
`wire.js`, `crypto.js` i `ratchet.js` z lokalnego klonu forka; uruchomione ponownie dają ten sam
wynik co zapisane pliki `wynik-measure*.txt`. Skrót w D2.

Nie sprawdzono: kodu klientów 0.17.1 (wiedza o traktowaniu nieznanego typu pochodzi z
`PROTOCOL.md` i `CHANGELOG`), równoległej wysyłki z dwóch kontekstów JS na Androidzie, rytmu
postów na prawdziwym telefonie.

Następny krok: recenzja Gemini i Groka, potem odpowiedzi właściciela na pytania P1 do P8 z ADR.
Kod czatu (F3-1 i dalej) dopiero po zatwierdzeniu ADR i zdjęciu zakazu pisania kodu.

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
