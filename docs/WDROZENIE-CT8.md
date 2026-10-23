# Wdrożenie na CT8: relay rodziny i aplikacja

Ten dokument nie zawiera prawdziwego adresu relaya i nie wolno go tu wpisać. Wszędzie
poniżej `https://relay.TWOJA-DOMENA.ct8.pl` to przykład; w jego miejsce podstaw własny
adres tylko w ustawieniach GitHuba i na serwerze, nigdy w plikach repozytorium.

## Relay rodziny jako domyślny serwer aplikacji

Od zadania F1-7 aplikacja nie ma wpisanego na stałe żadnego serwera. Adres relaya rodziny
trafia do APK w czasie budowania w CI, z sekretu repozytorium `RELAY_URL`:

- staje się domyślnym relayem aplikacji (plik `js/build-config.js` wewnątrz APK, tworzony
  przez Gradle; w repozytorium leży wersja bez adresu),
- staje się hostem linków zaproszeń (`https://relay.TWOJA-DOMENA.ct8.pl/#j=...`) i hostem
  App Links w `AndroidManifest.xml`, więc stuknięty link otwiera aplikację.

Bez sekretu (na przykład PR z forka) APK też się buduje, ale przy pierwszym uruchomieniu
prosi o wpisanie adresu relaya i do tego czasu nigdzie nic nie wysyła.

Uwaga: adres i tak da się odczytać z gotowego APK. Sekret chroni go przed trafieniem do
historii gita i do logów CI, a nie przed osobą, która ma plik APK.

### Krok 1: sekret `RELAY_URL` (właściciel, raz)

1. GitHub, repozytorium kidsLocation, **Settings**, **Secrets and variables**, **Actions**,
   **New repository secret**.
2. Nazwa: `RELAY_URL`. Wartość: sam adres relaya, na przykład
   `https://relay.TWOJA-DOMENA.ct8.pl`. Tylko `https://`, sama domena (opcjonalnie port),
   bez ukośnika na końcu, bez ścieżki. Inny format przerywa budowanie z komunikatem
   „RELAY_URL must be a bare https origin” (sam adres nie jest wypisywany).
3. Uruchom ponownie „Aplikacja CI” (**Actions**, **Aplikacja CI**, **Run workflow**) albo
   scal dowolną zmianę do `main`. W logu kroku „Build release APK” pojawi się tylko
   `family relay: set from secrets`.

### Krok 2: odcisk certyfikatu z logu CI

App Links działają tylko wtedy, gdy relay potwierdzi, że aplikacja podpisana kluczem
rodziny należy do jego domeny. Potrzebny jest odcisk SHA-256 certyfikatu (to informacja
publiczna, nie sekret).

1. Otwórz ostatni udany przebieg „Aplikacja CI” na `main`, zadanie `android`, krok
   „Sign with the family key”.
2. Znajdź linię `ANDROID_CERT_SHA256=AB:CD:...` (32 pary znaków rozdzielone dwukropkami).
   Ta sama linia jest też w podsumowaniu przebiegu (**Summary**).
3. Odcisk zmienia się tylko przy zmianie klucza podpisu, więc wystarczy zrobić to raz.

### Krok 3: zmienne relaya na CT8

Relay działa na CT8 przez `~/start-relay.sh`, który ustawia zmienne i uruchamia
`node relay/server.mjs` z katalogu `~/starling`; cron wznawia go, gdy proces padnie.
Dopisz w `~/start-relay.sh`, obok istniejących `PORT`, `TRUST_PROXY` i `PUBLIC_ORIGIN`:

```sh
export ANDROID_PACKAGE=app.kidslocation
export ANDROID_CERT_SHA256=AB:CD:...   # wartość z kroku 2
```

Zasady:

- Obie zmienne razem albo żadna. Bez obu relay podaje oryginalne dane upstreamu
  (`app.starlingmap`). Gdy ustawiona jest tylko jedna albo wartość jest błędna,
  `/.well-known/assetlinks.json` odpowiada błędem 500 `assetlinks misconfigured`, żeby
  pomyłka była widoczna.
- Odcisk można podać z dwukropkami albo bez, wielkimi lub małymi literami. Kilka odcisków
  (na przykład stary i nowy klucz w okresie przejściowym) rozdziela się przecinkami.
- Gdy `ANDROID_PACKAGE` jest ustawione, relay pod samym adresem `/` pokazuje prostą stronę
  po polsku dla linku zaproszenia otwartego w przeglądarce (bez skryptów i bez
  zewnętrznych zasobów). Klucz kręgu jest w części linku po `#`, której przeglądarka nie
  wysyła do serwera.

### Krok 4: restart relaya

Na CT8 przez SSH:

```sh
pkill -f "node relay/server.mjs"
~/start-relay.sh
```

(Jeśli nie uruchomisz go ręcznie, cron zrobi to sam przy następnym sprawdzeniu.)

### Krok 5: sprawdzenie

```sh
curl -s https://relay.TWOJA-DOMENA.ct8.pl/api/v2/health
curl -s https://relay.TWOJA-DOMENA.ct8.pl/.well-known/assetlinks.json
```

Pierwsze zwraca `{"ok":true}`. Drugie zwraca JSON z `"package_name":"app.kidslocation"`
i odciskiem z kroku 2. Adres `/.well-known/assetlinks.json` musi odpowiadać bez
przekierowania i z typem `application/json`, inaczej Android nie zweryfikuje linków.

Na telefonie (Android 12 i nowsze), po zainstalowaniu nowego APK: **Ustawienia**,
**Aplikacje**, aplikacja rodziny, **Otwieraj domyślnie**: domena relaya powinna być na
liście zweryfikowanych linków. Jeśli nie jest, linki otworzą się w przeglądarce na stronie
z instrukcją, a dołączenie dalej działa przez skan kodu QR albo wklejenie linku w
aplikacji.

## Jak długo relay trzyma dane

Relay na CT8 trzyma zaszyfrowane wiadomości 7 dni (domyślnie w `relay/server.mjs`, zmienna `RETENTION_MS`). Dzięki temu telefon, który był wyłączony albo ubity przez system nawet kilka dni, po włączeniu sam odczyta zmianę kluczy i wróci do kręgu bez nowego zaproszenia. Górna granica to 30 dni; `RETENTION_MS=0` przywraca 24 godziny.

Koszt: zaszyfrowane dane i link zaproszenia, gdyby wyciekł, są na serwerze dłużej. Relay nadal nie widzi treści ani kluczy.

## Kopia zapasowa bazy relaya

Baza (`~/starling/relay/data/starling.db`) trzyma tylko zaszyfrowane paczki i klucze publiczne.
Bez niej telefony i tak działają dalej, ale kopia oszczędza ponowne łączenie kręgu po awarii.

Po `aktualizuj-relay.sh`, raz:

```sh
sh ~/blisko/tools/kopia-relay.sh --install
```

Skrypt dopisuje do crona kopię o 03:17, od razu robi pierwszą i trzyma 7 ostatnich w
`~/kopie-relay/` (log: `~/kopie-relay.log`). Kopia powstaje przez `VACUUM INTO`, więc relay
nie musi stać. Przywrócenie: zatrzymaj relay, skopiuj wybrany plik na miejsce bazy, uruchom
`~/start-relay.sh`.

## Czego aplikacja nie wysyła nigdzie indziej

- Relay: tylko relay rodziny (albo adres wpisany ręcznie w ustawieniach).
- Kafelki mapy: `tile.openstreetmap.org` (decyzja właściciela w toku).
- Linki „kod źródłowy” i autor w ustawieniach prowadzą do GitHuba upstreamu, ale otwierają
  się tylko po stuknięciu, w przeglądarce systemowej (wymóg licencji GPL i podziękowanie).

Test `starling/test/family-build.test.mjs` pilnuje, żeby w kodzie aplikacji nie wróciły
adresy upstreamu jako domyślne.

## Ograniczenia, o których warto wiedzieć

- Link do pomocy awaryjnej (beacon, `/help`) wskazuje relay rodziny, ale relay na Node nie
  serwuje strony `/help`. Dla osób z aplikacją link otwiera się w aplikacji; osoba bez
  aplikacji zobaczy błąd 404. Do zrobienia osobno, jeśli będzie potrzebne.
- iOS (`starling/ios`) nie jest objęty tą zmianą (decyzja D3 otwarta).
