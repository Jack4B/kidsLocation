# Aktualizacje z oryginalnego Starlinga

Blisko jest forkiem `munzzyy/starling` (kod w `starling/`, z pełną historią). Zasady
przenoszenia zmian z oryginału:

## Jak często

- **Raz w miesiącu** przegląd nowych commitów i wydań upstreamu.
- **Od razu**, gdy upstream publikuje poprawkę bezpieczeństwa (`SECURITY.md`, opis wydania
  albo commit dotykający `crypto.js`, `wire.js`, relaya lub WebView).

## Jak

1. Nowa gałąź `zadanie/upstream-RRRR-MM`.
2. `git subtree pull --prefix=starling https://github.com/munzzyy/starling main`.
3. Konflikty rozwiązuj na korzyść zmian rodziny w UI, tekstach i Androidzie (Blisko, polski
   katalog, tryb dziecka, wznawianie na Xiaomi). W `crypto.js`, `wire.js`, `PROTOCOL.md` i
   podpisach relaya bierz wersję upstreamu, chyba że łamie zgodność z działającymi telefonami.
4. `npm test`, `tools/check-clean.sh`, `tools/check-notification-privacy.sh`, oraz testy e2e
   czatu, miejsc i trybu dziecka (`test/e2e_*.mjs`).
5. Podbij `VERSION` w `starling/app/sw.js`.
6. PR z listą przeniesionych zmian i informacją, czy relay na CT8 też wymaga aktualizacji
   (`aktualizuj-relay.sh`).

## Czego nie przenosić bez decyzji właściciela

- Zmian formatu na drucie, które wymagają nowych wersji na wszystkich telefonach naraz.
- Nowych zależności w czasie działania i jakichkolwiek połączeń do innych serwerów.
- Zmian, które przywracają nazwę Starling albo angielskie teksty w polskim interfejsie.
