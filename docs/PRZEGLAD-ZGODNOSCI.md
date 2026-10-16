# Przegląd zgodności forka z AGENTS.md (F0-6)

Stan na 2026-10-14. Fork `Jack4B/starling` 0.21.0 (commit `8ec6dad`), przegląd przez czytanie
kodu i wyszukiwanie (`grep`) adresów, `innerHTML` i logowania. Nic nie zmieniano. Numery linii
dotyczą tej wersji.

Zasada z `AGENTS.md`: żadnej analityki, żadnych żądań do usług firm trzecich (czcionki i kafelki
map pakujemy lokalnie albo świadomie opisujemy wyjątek), odszyfrowane pola tylko przez
`textContent`, w repozytorium żadnych adresów prywatnego relaya.

## Wynik w skrócie

| Obszar | Stan | Co dalej |
|---|---|---|
| Analityka, telemetria, raporty awarii | Brak | Nic |
| Kafelki mapy z `tile.openstreetmap.org` | Żądanie do strony trzeciej, domyślnie włączone | Decyzja właściciela: świadomy wyjątek teraz (rekomendacja), pośrednik na własnym serwerze później (F1-6) |
| Domyślny relay i linki zaproszeń na `starlingmap.app` | Serwer autora upstreamu, dopóki nie ustawi się własnego | Pierwsze uruchomienie musi ustawiać relay rodziny; linki zaproszeń do decyzji (F1-7) |
| Czcionki | Aplikacja używa czcionek systemowych; CSP `font-src 'self'` | Makiety ładują Google Fonts, w aplikacji pakować lokalnie (F2-7) |
| `innerHTML` | Dwa miejsca, oba z własnym generatorem QR, nie dane od innych | Nic; recenzent pilnuje przy F2 i F3 |
| Logowanie po stronie relaya | `relay/server.mjs` loguje tylko start i zatrzymanie | Nic; sprawdzić konfigurację logów serwera WWW na CT8 (F5-3) |

## 1. Kafelki mapy OpenStreetMap

Fakty:

- `app/js/map.js` linia 7: `TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"`;
  linie 17 do 27 dodają `preconnect` i `dns-prefetch` do tego hosta po wybraniu mapy ulic.
- CSP w `app/index.html` linia 10 i `app/help.html` linia 6 zezwala na obrazki z
  `https://tile.openstreetmap.org`.
- Domyślne ustawienie to mapa ulic w wersji ciemnej (`basemap: "dark"`, `app/js/main.js` linia
  213), więc żądania do OSM idą od pierwszego uruchomienia.
- Upstream opisuje to uczciwie: `app/privacy.html` linie 81 do 87 i `docs/THREAT-MODEL.md` linie
  145 do 147. Tryb „Off-grid" rysuje mapę lokalnie i nie wysyła żadnych żądań kafelków.
- Ujawnia się: adres IP telefonu i obszar, który ktoś ogląda na mapie (w praktyce okolica, w
  której są członkowie rodziny), operatorowi serwerów kafelków OSM. Pozycje ani treść kręgu nie
  wychodzą.

Opcje:

| Opcja | Co daje | Koszt |
|---|---|---|
| A. Świadomy wyjątek, opisany w dokumentacji rodzinnej i w aplikacji | Mapa działa od razu, zero pracy | OSM widzi IP i oglądany obszar |
| B. Domyślnie „Off-grid", mapa ulic na wyraźne włączenie | Zero żądań bez zgody | Słabsza mapa dla dzieci i dziadków; zmiana jednej wartości domyślnej w kodzie |
| C. Pośrednik kafelków na własnym serwerze (ten sam host co relay), z pamięcią podręczną | OSM widzi tylko serwer rodziny, nie telefony | Zmiana kodu (`map.js`, CSP) i serwera; pamięć podręczna musi spełniać zasady OSM (nagłówek User-Agent, bez masowego pobierania) |
| D. Kafelki pakowane w aplikacji (offline) | Zero żądań | Zasady OSM zabraniają masowego pobierania z `tile.openstreetmap.org`; potrzebne własne renderowanie albo inne źródło; duży rozmiar aplikacji |

Rekomendacja: A teraz (wpisać wyjątek do dokumentacji rodzinnej, F5-4), C jako zadanie po
uruchomieniu relaya, jeśli właściciel chce ukryć adresy IP telefonów przed OSM. B tylko, jeśli
właściciel woli prywatność od wygody. Decyzja należy do właściciela.

## 2. Domyślny relay i linki zaproszeń

Fakty:

- `app/js/env.js` linia 9: `CANONICAL = "https://starlingmap.app"` (serwer autora upstreamu).
  Linia 156: aplikacja zainstalowana z paczki rozmawia z tym serwerem, dopóki nie ustawi się
  własnego relaya.
- `app/js/env.js` linie 101 do 103: linki zaproszeń z aplikacji zaczynają się od
  `https://starlingmap.app/`. Sekret zaproszenia jest we fragmencie adresu (po `#`), którego
  przeglądarka nie wysyła do serwera, ale otwarcie linku w przeglądarce kontaktuje się z
  `starlingmap.app` (adres IP i czas). Zaproszenie z własnego relaya niesie jego adres
  (`docs/PLAN.md`, uwagi do fazy 1).
- Strona pomocy awaryjnej (`/help`, link „beacon") też jest serwowana z `starlingmap.app` i od
  razu ładuje kafelki OSM (`docs/THREAT-MODEL.md` linia 450).

Wniosek: przy samym kodzie upstreamu członek rodziny, który utworzy krąg przed ustawieniem
relaya rodziny, wyśle zaszyfrowane dane na cudzy serwer. Szyfrowanie end to end chroni treść,
ale to narusza zasadę „żadnych żądań do stron trzecich" i rozbija krąg (wszyscy muszą używać
tego samego relaya).

Co dalej (propozycje zadań, do akceptacji właściciela):

- Makieta pierwszego uruchomienia (F2-9) zaczyna od ustawienia relaya rodziny albo od
  zeskanowania zaproszenia, które go niesie.
- F1-7: zdecydować, czy zmienić domyślny adres i bazę linków na domenę rodziny. Wymaga zmiany
  kodu (`env.js`, nie jest zamrożony) i decyzji D4 (gdzie leży kod). Adres relaya nie może
  trafić do publicznego repozytorium (`AGENTS.md`), więc przy D4 = A (publiczny fork) trzeba go
  wstrzykiwać przy budowaniu, a nie wpisywać do kodu.

## 3. Czcionki

`app/css/app.css` używa zmiennych `--font` i `--mono` bez `@font-face`, czyli czcionek
systemowych. CSP ma `font-src 'self'`, więc zewnętrzna czcionka i tak by się nie załadowała.
Makiety (`docs/makiety/zrodla/*.dc.html`) ładują Google Fonts; to dotyczy tylko makiet. F2-7
musi spakować Bricolage Grotesque i Figtree lokalnie i dodać je do `PRECACHE` w `app/sw.js`.

## 4. Odszyfrowane dane w DOM

`grep innerHTML app/js/*.js`: tylko `app/js/ui.js` linie 1035 i 1539, oba wstawiają SVG z
własnego kodera QR (`app/js/qr.js` linia 506), z komentarzem, że to geometria, nie dane
użytkownika. Kod QR zaproszenia koduje jednak link z sekretem; to wciąż nasz własny generator, a
nie tekst od innego członka. Zgodne z zasadą.

## 5. Szersze uwagi

- CSP `connect-src 'self' https:` (`app/index.html` linia 10) pozwala łączyć się z dowolnym
  adresem HTTPS. To celowe (własny relay ustawiany w aplikacji), ale oznacza, że CSP nie chroni
  przed wysłaniem danych gdzie indziej, jeśli ktoś zmieni kod. Pilnuje tego recenzja.
- Linki w `app/index.html` (GitHub, F-Droid) to linki do kliknięcia, nie automatyczne żądania.

## Czego nie sprawdzono

- Ruchu sieciowego na prawdziwym telefonie (dopiero F1-4 lub F2-8, na przykład przez serwer
  pośredniczący na komputerze).
- Kodu natywnego Androida pod kątem żądań sieciowych poza WebView (przejrzano tylko plan
  lokalizacji).
