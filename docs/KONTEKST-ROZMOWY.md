# Kontekst z rozmowy początkowej

Streszczenie rozmowy, w której powstał ten projekt, dla nowej sesji (Claude Code lub inny
model). Zaczynasz od zera: przeczytaj to, potem `AGENTS.md`, `docs/PLAN.md`,
`docs/DECYZJE.md`, `docs/HANDOFF.md`.

## Cel właściciela

- Prywatna, rodzinna alternatywa dla Life360 na bazie forka `Jack4B/starling` (upstream
  `munzzyy/starling`, GPL-3.0-or-later): mapa na żywo, SOS, check-in, miejsca, bateria.
- Do tego szyfrowany end-to-end komunikator w aplikacji: krótkie wiadomości, powiadomienia.
- Własny relay na hostingu CT8, maksymalnie 6 do 7 osób.
- Nie podoba mu się obecny interfejs: słabo widoczne zaznaczenia, mapa startuje na widoku
  kontynentu (`app/js/map.js` około linii 42: `map.setView([20, 0], 3)`), a nie na jego pozycji.
- Syn ma iPhone'a. Właściciel ma abonamenty Gemini Pro i SuperGrok i chce ich użyć jako
  recenzentów, żeby oszczędzać limity Claude'a.
- Właściciel pisze po polsku (strefa Warszawa). Dokumenty po polsku, kod i commity po angielsku.

## Ograniczenie obowiązujące do odwołania

Właściciel powiedział: nie pisać kodu aplikacji, tylko analiza, makiety i plan. Nie ruszaj
kodu forka, dopóki tego wyraźnie nie zmieni.

## Co zrobiono

- Ocena potencjału i głęboki przegląd kodu forka v0.21.0 (commit `8ec6dad`): `docs/ARCHITEKTURA.md`.
- Testy na Node 22.22: 1118 testów, 1082 przeszło, 34 pominięto, 2 nie przeszły (brak
  vendorowanego Leafleta; naprawia `bash tools/sync-vendor.sh`). Na Node 24 nie sprawdzano.
- Makiety jasne i ciemne (5 plansz): źródła w `docs/makiety/zrodla/`, tokeny w `docs/DESIGN.md`.
  Opublikowano je też jako prywatny artefakt właściciela
  (https://claude.ai/artifact/UPvDtJ2VsAXsDvkiZV38Vr); może on mieć w nim własne poprawki
  (planszę Krag edytował ręcznie), więc w razie rozbieżności źródłem prawdy jest artefakt.
- Plan, decyzje, zasady dla Claude/Gemini/Grok w tym repozytorium.

## Czego nie zrobiono

- Zero zmian w kodzie aplikacji, relay nie uruchomiony, nic nie testowano na urządzeniach.
- CT8 niesprawdzony (wersja Node, `node:sqlite`, długo działający proces).
- Makiety bez weryfikacji wizualnej. Brakujące ekrany: Miejsca, aktywny SOS, zaproszenie i QR,
  pierwsze uruchomienie (F2-9).

## Kluczowe fakty techniczne (szczegóły w ARCHITEKTURA.md)

- Aplikacja: HTML/CSS/JS w WebView (Android Kotlin, iOS WKWebView), bez zależności runtime.
- Protokół v2: rachet epok co 10 min, AES-256-GCM, tekst dopełniany do 512 B, podpisy
  Ed25519 (zapas P-256), ECDH P-256. TRAIL_CAP 240 wpisów na członka, TTL 24 h.
- Relay: `relay/src/index.js`, tabela `points_v3`, czas `ts` ściśle rosnący na członka (409
  inaczej). `relay/server.mjs` wymaga Node 24+. Aplikacja przyjmuje tylko `https://`.
- Pliki zamrożone: `app/js/crypto.js`, `app/js/wire.js`, podpisy i pinning w relayu,
  `docs/PROTOCOL.md`. `tools/check-clean.sh` w forku odrzuca myślniki długie i atrybucję AI.
- Ryzyko czatu: limit 240 jest wspólny dla pozycji i wiadomości; starsze klienty (do 0.17.1)
  mogą traktować nieznany typ jak pozycję. Patrz D2 i F3-0.
- iOS: brak pracy w tle; opcje w D3.

## Pytania do właściciela, wciąż bez odpowiedzi

1. Wynik `node -v` na CT8 oraz czy działa `node:sqlite` i długo działający proces (F0-1, D1).
2. Czy jest Mac z Xcode i płatne konto Apple, czy syn może dostać Androida (F0-2, D3).
3. Gdzie ma leżeć kod (D4; rekomendacja A: w forku).
4. Zadania właściciela: ochrona gałęzi `main`, potwierdzenie, że repo jest prywatne,
   podpięcie Gemini i Groka (`docs/PODLACZENIE-AGENTOW.md`).

## Jak zacząć nową sesję

1. Otwórz Claude Code w repozytorium `Jack4B/kidsLocation` (`CLAUDE.md` wczyta się sam).
2. Przeczytaj ten plik, `AGENTS.md`, `docs/PLAN.md`, `docs/DECYZJE.md`, `docs/HANDOFF.md`.
3. Dołącz też `Jack4B/starling`, gdy dojdzie do F0-5 (testy bazowe na Node 24).
4. Dopóki właściciel nie zwolni zakazu, nie pisz kodu aplikacji. Bezpieczne następne kroki:
   F0-5, F1-1, F2-9 (makiety), czekanie na odpowiedzi z punktów powyżej.
