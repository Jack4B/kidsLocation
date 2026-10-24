# Dziennik przekazań

Dopisuj nowe wpisy na górze. Każdy wpis: data, model, zadanie, co zrobiono, czego nie
zrobiono, co sprawdzono (i jak), co sprawdzono tylko przez czytanie, następny krok,
pytania do właściciela. Drugi model zaczyna od zera, więc pisz konkretnie.

---

## 2026-10-24, Claude, F5-21: mapa pusta po otwarciu, prostsze ustawienia, pytanie przed Stop

- Zgłoszenie 2026-10-24: po otwarciu aplikacji, która długo działała w tle, mapa była pusta; wymuszenie zatrzymania pomagało.
- Przyczyna (z kodu): poller nie miał limitu czasu. Zapytanie, które zawisło (połączenie zerwane, gdy strona była zamrożona), trzymało `inFlight` na zawsze i każde kolejne pobranie od razu się kończyło; wysyłanie działało, bo nadawca ma swój limit 20 s.
- `net.js`: zapytanie do relaya przerywane po 25 s; zaległe zapytanie jest porzucane i idzie nowe. Porzucana jest tylko część sieciowa, nigdy odczyt zaległości, żeby wiadomość kontrolna nie została obsłużona dwa razy (test).
- Ustawienia: klucze, blokada aplikacji, relay i Tor, eksport i strefa niebezpieczna schowane pod „Pokaż ustawienia zaawansowane”; skróty z ekranu kręgu rozwijają je same. Osoby i klucze: lista osób na górze, numery bezpieczeństwa pod „Pokaż numery bezpieczeństwa”.
- Wyłączenie udostępniania pyta „Wyłączyć udostępnianie?” (w trybie dziecka zamiast tego PIN).
- Tekst o relayu: „usuwa je najpóźniej po tygodniu” (pl; inne języki mają stare tłumaczenie).
- Sprawdzone: testy jednostkowe 1255/0, `e2e_child_mode.mjs` 2 z 3 uruchomień zielone; raz pojawił się błąd mapy „Invalid LatLng (NaN, NaN)”, przyczyna nieustalona, na main 1 uruchomienie zielone. Do zbadania.
- Service worker v61.

## 2026-10-23, Claude, F5-20: relay trzyma dane 7 dni

- Właściciel 2026-10-23: telefon po awarii ma sam dociągać nowe klucze, bez zakładania kręgu od nowa.
- Ustalone z kodu: telefon po wybudzeniu czyta zaległości z relaya, zanim usunie stare klucze (`holdTrimForBacklog`), a zapadka dogania do 30 dni (`MAX_CATCHUP_EPOCHS`). Jedynym ograniczeniem było sprzątanie relaya po 24 h.
- `relay/src/index.js`: `retentionMs(env)` (TTL_MS, chyba że `RETENTION_MS` dłuższe, maks. 30 dni). `relay/server.mjs` domyślnie 7 dni. Cloudflare bez zmiennej zostaje przy 24 h. `wire.js` nietknięty.
- Właściciel musi uruchomić `aktualizuj-relay.sh` na CT8.
- Nie zrobiono: automatyczne ponowne przyjęcie telefonu wyłączonego dłużej niż retencja (nowy typ wiadomości w protokole, osobna decyzja).
- Sprawdzone: testy jednostkowe (nowy `test/relay-retention.test.mjs`), `check-clean.sh`.

## 2026-10-23, Claude, F5-19: krąg nie rozjeżdża się po uśpieniu telefonu

- Zgłoszenie 2026-10-23: telefon córki po dobie bez procesu (OneKeyClean, mało pamięci) wysyła pozycje, ale nikogo nie widzi; telefon właściciela działa.
- Przyczyna (z kodu): codzienna zmiana kluczy. Telefon, który przespał cudzą zmianę, budzi się ze swoim licznikiem już po terminie i robi własną zmianę na starym kanale. Pozostali dawno z niego wyszli, więc krąg rozpada się na dwa. Gdy uśpienie trwa ponad dobę, opakowanie klucza wygasa na relayu (TTL 24 h w `wire.js`, zamrożony) i telefon nie ma jak dogonić kręgu.
- Zmiana: dzienna zmiana kluczy tylko wtedy, gdy telefon od wybudzenia odebrał poprawną odpowiedź relaya i widział w ostatniej godzinie wpis innego członka na tej generacji. Telefon, który nikogo nie widzi, nie zmienia kluczy, tylko czeka na cudzą zmianę z relaya.
- Nowe ostrzeżenie: gdy generacja ma ponad dobę, odczyt działa od 30 minut, a nikt inny nic nie wysłał przez 30 minut, mapa mówi, że telefon mógł przegapić klucze, i radzi nowe zaproszenie.
- Nie zrobiono: automatyczny powrót telefonu uśpionego dłużej niż TTL; wymagałby trzymania starych kluczy albo zmiany protokołu.
- Sprawdzone: testy jednostkowe (nowy `test/rekey-liveness-source.test.mjs`), `check-clean.sh`. Service worker v60. Nie sprawdzone na dwóch telefonach.

## 2026-10-19, Claude, F5-18: tryb dziecka chowa ustawienia i krąg

- Zgłoszenie właściciela 2026-10-19: córka sama zmienia ustawienia i wypada z kręgu; raport z 17:07Z pokazuje udostępnianie wyłączone bez zapisanego powodu.
- W trybie dziecka PIN rodzica jest teraz potrzebny przed: ustawieniami (klucze, relay, Tor, blokada, wymazanie, opuszczenie kręgu, eksport), listą kręgów (przełączanie), osobami i kluczami (usuwanie, ponowne klucze), nowym kręgiem, dołączaniem przez wklejony link i otwarciem linku zaproszenia, gdy telefon jest już w kręgu.
- Dobry PIN otwiera te ekrany na 60 s; wyjście z aplikacji zamyka je od razu.
- Raport udostępniania ma linię „Child mode: yes/no”.
- Sprawdzone: testy jednostkowe (nowy `test/child-mode-guards-source.test.mjs`), `test/e2e_child_mode.mjs` z nowymi krokami dla ustawień, `check-clean.sh`. Service worker v59.
- Nie sprawdzone na telefonie. Bez administratora urządzenia córka nadal może wyłączyć lokalizację w Androidzie lub wyczyścić dane aplikacji.

## 2026-10-18, Claude, F5-16: Blisko jako administrator urządzenia

- Zgoda właściciela 2026-10-18 (karta decyzji „Tak, rób”).
- `ChildLock.kt` + `AdminReceiver`: gdy Blisko jest device owner, włączenie trybu dziecka nakłada ograniczenia (lokalizacja, zarządzanie aplikacjami, tryb awaryjny, reset fabryczny, tryb samolotowy), blokuje odinstalowanie i przyznaje na stałe zgody na lokalizację i powiadomienia; wyłączenie trybu zdejmuje je. „Usuń administratora urządzenia” wymaga PIN-u i woła `clearDeviceOwnerApp`.
- Ustawienie przez `adb shell dpm set-device-owner app.kidslocation/app.starlingmap.AdminReceiver`, opis w `docs/OCHRONA-TELEFONU-DZIECKA.md`.
- Nie sprawdzone na telefonie: zachowanie HyperOS przy ograniczeniach (kafelek lokalizacji, kafelek trybu samolotowego) i czy przyznanie zgody na lokalizację w tle przez device owner przechodzi na Androidzie 14.

## 2026-10-18, Claude, F5-15: drugi budzik wznawiania

- Córka (Poco) znowu znikała mimo wznawiania. Obok alarmu co 15 minut jest teraz zadanie okresowe JobScheduler (`ShareJob`, 15 minut, przetrwa restart), które woła ten sam `ShareResume.onWatchdog`, więc wznowienie nie odpali się dwa razy.
- Czeka: raport udostępniania z telefonu córki po kolejnym zniknięciu. Tryb administratora urządzenia (blokada lokalizacji i wymuszenia zatrzymania) czeka na wyraźną zgodę właściciela.

## 2026-10-18, Claude, F5-3, F5-4, F5-5, F3-8: kopia relaya, instrukcja, upstream, protokół

- Zgoda właściciela 2026-10-18 („Rób wszystko, masz moje zgody”) obejmuje dopisek w `PROTOCOL.md`.
- `starling/tools/kopia-relay.sh`: dzienna kopia bazy relaya przez `VACUUM INTO`, 7 ostatnich, instalacja do crona jednym poleceniem (`docs/WDROZENIE-CT8.md`). Sprawdzone lokalnie na Node 22; na CT8 do uruchomienia przez właściciela.
- `docs/INSTRUKCJA-RODZINY.md`: instalacja, ustawienia baterii, dołączanie, codzienne użycie, zgubiony telefon.
- `docs/AKTUALIZACJE-UPSTREAM.md`: raz w miesiącu i od razu przy poprawkach bezpieczeństwa, przez `git subtree pull` na gałęzi zadania.
- `starling/docs/PROTOCOL.md`: sekcja „Chat and place messages” (bez zmian w kryptografii i formacie ramki), odnośniki do `CHAT.md` i `PLACES.md`.
- Nie zrobiono: F5-1 przegląd innym modelem (Gemini niepodpięty).

## 2026-10-18, Claude, F5-14: tryb dziecka

- Prośba właściciela: córka (9 lat) nie może przypadkiem wyłączyć udostępniania.
- Ustawienia, Udostępnianie, „Tryb dziecka”: PIN rodzica (4 do 8 cyfr, PBKDF2 w `app/js/shareguard.js`, w bazie tylko sól i skrót). Wyłączenie udostępniania, wyjście z kręgu i wyłączenie trybu wymagają PIN-u. Po trzech błędach rośnie czas oczekiwania (od 30 s do 15 min).
- Android: przy włączonym trybie z powiadomienia znika „Zatrzymaj”, a już wysłane polecenie Stop jest ignorowane (`PageHost.shareGuard`). Przełączniki „Udostępniaj po zamknięciu aplikacji” i wznawiania po restarcie są zablokowane, gdy są włączone.
- Uczciwie w opisie: ustawienia Androida nadal pozwalają wyłączyć lokalizację albo wymusić zatrzymanie; krąg widzi wtedy wiek ostatniej pozycji. Zapomniany PIN: wyczyszczenie aplikacji i ponowne dołączenie.
- Testy: `test/shareguard.test.mjs`, nowy test źródła powiadomienia, `test/e2e_child_mode.mjs` (ręcznie, przechodzi lokalnie).

## 2026-10-18, Claude, F6-8: miejsca od razu dla nowych osób, test e2e

- `test/e2e_shared_places.mjs` (Playwright, dwa telefony, uruchamiany ręcznie): A dodaje miejsce, B je dostaje, B zmienia nazwę i promień, A to dostaje, A usuwa, B traci; feed relaya nie zawiera nazwy. Przechodzi lokalnie.
- Nowa osoba w kręgu dostaje miejsca od razu: gdy roster urośnie albo kanał się zmieni (przyjęcie nowej osoby zmienia klucze), telefon wysyła swoje miejsca poza sześciogodzinnym rytmem.

## 2026-10-18, Claude, F5-13: powiadomienia mówią, kto i co

- Prośba właściciela: treść czatu i konkretne zdarzenia w powiadomieniach zamiast „Otwórz Blisko, żeby zobaczyć, co się stało”.
- Domyślnie włączone: szczegóły zdarzeń, także na zablokowanym ekranie, oraz nadawca i treść wiadomości czatu. Telefony z zapisanymi starymi ustawieniami dostają to raz (`wordyDefault`); każdą opcję można wyłączyć w ustawieniach.
- Przy włączonych szczegółach przez `notifyDetail` idą wszystkie zdarzenia kręgu: miejsca, bateria, check-in, prośby, SOS (SOS zostaje na kanale alarmowym z dzwonkiem). Dotknięcie otwiera tę osobę.
- `tools/check-notification-privacy.sh` dalej przechodzi: bez zgody na zablokowany ekran nic z treści nie trafia do powiadomienia.

## 2026-10-18, Claude, F2-11: metry w polskiej aplikacji, raport jako Blisko

- Jednostki „Automatycznie” idą za językiem aplikacji: polska aplikacja pokazuje metry i kilometry, nawet gdy telefon ma język angielski (USA). Wcześniej telefony z angielskim pokazywały stopy i mile.
- Raport udostępniania zaczyna się od „Blisko sharing report”. „Okolica, około 1 km” nie łamie się przed „km”. Linia „Wspólne / Tylko na tym telefonie” na liście miejsc ma styl drugiej linii.
- Zrzuty przy szerokości 360 px: mapa, lista, karta osoby, Miejsca, Czat, Krąg bez wyjść poza ekran. Czekam na zrzuty od właściciela z miejsc, gdzie układ się rozjeżdża.

## 2026-10-18, Claude, F5-12: krąg, który ucichł, czyta okno od nowa

- 2026-10-18 krąg rozjechał się po zmianie kluczy: telefon w tle nie przeszedł na nowy kanał, a po otwarciu aplikacji od razu dogonił resztę (świeża strona czyta całe okno jeszcze raz).
- Teraz robi to sam: gdy przez 20 minut nikt inny w kręgu nic nie wysłał, strona czyści roster i czyta okno relaya od początku (`poller.rewind`), najwyżej raz na 20 minut. Zgubiona wiadomość ze zmianą kluczy trafia wtedy ponownie do obsługi.
- Testy: `test/quiet-rewind.test.mjs`, cały zestaw zielony. Do sprawdzenia na telefonach przy następnej dziennej zmianie kluczy.

## 2026-10-18, Claude, F6: wspólne miejsca w kręgu

- D7 według odpowiedzi domyślnych: każdy w kręgu zmienia i usuwa; nowe miejsce jest wspólne, przełącznik „Udostępniaj w kręgu” robi z niego prywatne; stare miejsca zostają prywatne; alerty liczy każdy telefon sam.
- Wiadomość `t:"place"` w strumieniu członka (jak czat), ostatni zapis wygrywa po `(w, członek)`, znaczniki usunięcia przez 7 dni, każdy telefon co 6 h ponownie wysyła swoje zapisy. Opis: `starling/docs/PLACES.md`.
- Kod: `places.js` (format, parser, scalanie), `net.js` (kierowanie do `onPlace`), `main.js` (wysyłka, odbiór, ponowne wysyłanie), `ui.js` (przełącznik, kto ostatnio zmienił). Testy: `test/places-shared.test.mjs`, cały zestaw zielony (1257 testów, 0 błędów).
- Nie zrobione: e2e z dwoma telefonami (F6-6) i dodatek do `PROTOCOL.md` (wymaga zgody właściciela). Do sprawdzenia na telefonach.

## 2026-10-16, Claude, F5-11: śmierć strony przy czyszczeniu HyperOS nie blokuje wznowienia

- Raport z Xiaomi 2407FPN8EG (wersja 36): „SwipeUpClean” godzinę wcześniej, a ostatnie zatrzymanie zapisane jako „the page crashed”. HyperOS najpierw zabija renderer WebView, więc `onRenderProcessGone` zapisywało trasę `renderer`, a budzik uznawał ją za decyzję człowieka i nie wznawiał.
- `ShareResume.killedBySystem` traktuje teraz `renderer` i `stalled` jak `system`. Gdy strona padnie bez okna, a „udostępniaj po zamknięciu” jest włączone, budzik startuje za 60 s.
- Testy: `node --test test/share-auto-resume.test.mjs` zielone. Sprawdzić na Xiaomi i Poco po instalacji.

## 2026-10-16, Claude, F5-10: zamknięcie z listy ostatnich na Xiaomi nie kończy udostępniania

- Raport z Xiaomi (wersja 34) pokazał przyczynę: „Last share stopped by: a swipe” i wyjścia
  procesu „SwipeUpClean”. HyperOS przy zamknięciu karty w ostatnich aplikacjach zabija stronę,
  a potem cały proces. `onTaskRemoved` zapisywał to jako zatrzymanie przez osobę („swipe”),
  więc strażnik nigdy nie wznawiał udostępniania.
- Teraz przy włączonym „Udostępniaj po zamknięciu aplikacji” takie zamknięcie kończy usługę
  jako zatrzymanie przez system i ustawia strażnika na 60 s (`ShareResume.AFTER_SWIPE_MS`),
  który wznawia udostępnianie bez otwierania aplikacji. Bez tej opcji zachowanie bez zmian.
- Do sprawdzenia na telefonie: zamknąć Blisko z listy ostatnich i po około minucie zobaczyć
  powiadomienie o wznowieniu oraz świeżą pozycję u innych.

## 2026-10-15, Claude, F5-9: raport udostępniania mówi, jak zginął proces

- Zgłoszenie: udostępnianie dalej staje na Xiaomi 14T Pro i Poco X5 5G. Raport z Poco był
  zrobiony już po ponownym otwarciu aplikacji, więc nie mówił, co zakończyło poprzednie
  udostępnianie.
- Raport ma teraz „Last share stopped by” (trasa zatrzymania z `PREF_STOP_ROUTE`, o ile strona
  jej jeszcze nie odczytała) i do 4 wpisów `ApplicationExitInfo` (Android 11+): powód, wiek,
  ważność procesu i opis systemu oczyszczony do bezpiecznych znaków (na Xiaomi zwykle nazywa
  proces, który zabił aplikację).
- Następny krok: raport z telefonu po zatrzymaniu, potem poprawka w miejscu, które wskaże.

## 2026-10-15, Claude, F5-8: relay hostuje stronę pomocy SOS

- Link pomocy SOS prowadzi na `<relay>/help`, a relay odpowiadał 404. `relay/server.mjs` podaje
  teraz pliki aplikacji z folderu `app/` obok relaya (lub `STATIC_DIR`, pusty wyłącza), tylko dla
  GET i HEAD, na które API odpowiedziało 404. `/help` to `help.html`. Ścieżki są sprawdzane przez
  `realpath`, nic spoza folderu nie wychodzi. Nagłówki jak w `app/_headers`.
- Na CT8 skrypt `aktualizuj-relay.sh` (w plikach projektu) kopiuje cały `starling/` i uruchamia
  `npm ci` oraz `tools/sync-vendor.sh`, bo strona potrzebuje Leafleta.
- Testy w `test/server.test.mjs`. Nie sprawdzone na prawdziwym CT8.

## 2026-10-15, Claude, F2-10c: lista rodziny zwija się do samej nazwy kręgu

- Zgłoszenie: na widoku ogólnym lista rodziny nie daje się zwinąć. Najniższa pozycja („peek”)
  zajmowała około 40% ekranu (przyciski i rząd osób).
- Nowa najniższa pozycja arkusza `min`: widać tylko uchwyt i nazwę kręgu. Arkusz zjeżdża tam
  po dotknięciu lub przeciągnięciu mapy i po przesunięciu palcem w dół. Uchwyt wraca do „peek”.
  Ukryte przyciski i rząd osób są `inert`.
- `test/e2e_card_fold.mjs` sprawdza też arkusz. Service worker v52.

## 2026-10-15, Claude, F2-10b: karta osoby naprawdę się zwija

- Przyczyna zgłoszenia „karta się nie zwija”: `renderFocusCard` nadpisywał `className` przy każdym
  odświeżeniu (nowa pozycja, ruch mapy) i gubił `fc-min`. Teraz klasa zwinięcia zostaje.
- Karta zwija się też przesunięciem palca w dół od jej górnej części i rozwija w górę
  (zdarzenia dotyku, bo przewijanie listy anuluje zdarzenia pointer).
- Dotknięcie mapy (pointerdown na kontenerze Leafleta, poza znacznikami) zwija kartę od razu.
- Nowy test e2e `test/e2e_card_fold.mjs` (CDP, dotyk) i test źródła. Service worker v51.

## 2026-10-15, Claude, F2-10: powrót z karty osoby i zwijanie

Właściciel: z karty osoby nie da się wrócić do mapy inaczej niż przez inną zakładkę; nie da
się zwinąć karty ani arkusza kręgu, żeby zobaczyć całą mapę.

Zrobiono: systemowe „Wstecz” na Androidzie najpierw pyta stronę (`window.__starlingBack`,
`stepBack()` w `main.js`): zamyka okno, czat, kartę osoby, wraca z zakładki na mapę, zwija
arkusz; dopiero mapa w stanie początkowym oddaje „Wstecz” dotychczasowym regułom. Ponowne
dotknięcie zakładki Mapa zamyka kartę osoby. Uchwyt karty osoby jest przyciskiem: zwija kartę
do pierwszego wiersza i rozwija. Przesunięcie lub dotknięcie mapy zwija kartę osoby albo
arkusz kręgu do minimum. sw cache v50.

Sprawdzono: `npm test` 1238, 0 błędów; e2e sheet_drag i wrapper przechodzą. Nie sprawdzono
na telefonie ani zrzutem ekranu zwiniętej karty.

---

## 2026-10-15, Claude, F5-7: udostępnianie zabijane na Xiaomi i Poco

Właściciel: na Xiaomi 14T Pro i Poco X5 5G udostępnianie znika po kilku godzinach mimo
zgód „zawsze”, braku ograniczeń baterii, autostartu i zablokowania w ostatnich.

Zrobiono: alarm-strażnik (`ShareResume.armWatchdog`, co 15 min, odnawiany przy każdym ticku
usługi). Alarm przeżywa zabity proces; gdy przyjdzie, a usługa nie działa i udostępnianie
jest nadal uzbrojone, a od uzbrojenia nikt go nie zatrzymał (`killedBySystem`), idzie tą
samą ścieżką co po restarcie telefonu: przy włączonym automatycznym wznawianiu wraca samo,
w przeciwnym razie powiadomienie „Telefon zatrzymał Blisko w tle. Dotknij…”. Zatrzymanie
przez osobę kasuje alarm. Bez nowych uprawnień.

Sprawdzono: `npm test` 1237, 0 błędów (testy źródłowe Kotlina). Nie sprawdzono na telefonie;
pełne wymuszone zatrzymanie (force stop) kasuje też alarmy, więc wtedy strażnik nie pomoże.

---

## 2026-10-15, Claude, F5-6: poprawki po wydaniu 1.0

Zrobiono:

- Powiadomienia o miejscach (`detailAlerts`): bez zgody na zablokowany ekran powiadomienie
  nie zawiera imienia ani miejsca także w wersji prywatnej, tak samo jak czat (F3-9).
  Strażnik w `Events.kt` obejmuje teraz każdy rodzaj; `check-notification-privacy.sh` i
  `detail-alerts.test.mjs` sprawdzają ogólny warunek.
- Oś zdarzeń osoby: przy każdym przejeździe prędkość maksymalna („maks. 95 km/h”), liczona
  na telefonie odbiorcy z punktów trasy, które już ma. Wymaga dwóch odcinków z rzędu
  (odporność na pojedynczy zły odczyt), pokazywana od 25 km/h. Bez zmian w protokole.
- Powiadomienie o szybkiej jeździe (Ustawienia, Powiadomienia): próg 80, 100, 120 lub 140 km/h,
  domyślnie wyłączone. Liczone na telefonie odbiorcy z trasy z ostatnich 3 minut tą samą
  metodą (`peakKmh`); jedno powiadomienie na osobę na 15 minut. Bez zmian w protokole i na
  serwerze, więc działa tylko dla osób, które wysyłają pozycję w tle (dziś Android).
- sw cache v49.

Sprawdzono: `npm test` 1235 testów, 1201 przechodzi, 34 pominięte, 0 błędów;
`check-clean.sh` i `check-notification-privacy.sh` czyste. Nie sprawdzono na telefonie.

Nie zrobiono: link pomocy SOS `/help` nadal prowadzi do strony, której serwer Node nie ma;
wymaga serwowania strony pomocy (z vendorowanym Leafletem) przez relay albo osobnego
hostingu. Brak testu end-to-end powiadomienia o szybkiej jeździe (logika `peakKmh` ma testy).

---

## 2026-10-14, Claude, F6 (plan) i README

Zrobiono: rozpisano fazę 6 „Wspólne miejsca w kręgu” (F6-0 do F6-7) w `docs/PLAN.md` i
dodano otwartą decyzję D7 z czterema pytaniami do właściciela. Zaktualizowano `README.md`
do stanu po wydaniu `apk-0.21.0-16` (nazwa Blisko, kod w `starling/`, status).
Zrobiono też zrzuty ekranu aplikacji (Playwright, 390x844, oba motywy) dla właściciela.
Nie trafiły do repozytorium.

Nie zrobiono: kodu dla F6 (czeka na ADR-002 i D7).

Sprawdzono: tylko dokumenty; kodu nie zmieniano. Przez czytanie kodu: miejsca są dziś tylko
lokalne (`starling/app/js/places.js`, linia 1), czat jest jeden dla całego kręgu.

Następny krok: właściciel odpowiada na pytania z D7, potem F6-0 (ADR-002).

---

## 2026-10-14, Claude, wydanie 1.0: integracja na gałęzi `wydanie/1.0`

Zrobiono:

- Scalone do `wydanie/1.0` (PR #12 do main): F1-7 (własny serwer i linki zaproszeń),
  F1-8 (własne APK), F2-6 (polski, marka Blisko, ikony), F3 (czat, ADR-001 wariant A),
  F2-1 do F2-8 (nowy wygląd według makiet, czcionki lokalne, nawigacja z Czatem),
  F2-6b (testy e2e pod polski), F3-9 (powiadomienia czatu bez imienia i treści na
  zablokowanym ekranie, chyba że użytkownik włączy), F2-5b (przesunięcie palca z SOS
  nie wysyła już SOS po 1,2 s).
- F5-1 częściowo: przegląd bezpieczeństwa całego diffu przez osobnego agenta Claude
  (nie inny model). Pliki zamrożone bez zmian, brak XSS, sekretów i zapytań do stron
  trzecich. M1 i L1 poprawione (F3-9). Pozostałe uwagi niskie: czat jawny w IndexedDB bez
  blokady aplikacji (jak miejsca), uszkodzony zapieczętowany zapis czatu nadpisywany,
  link pomocy `/help` nie istnieje na serwerze Node.

Sprawdzono: `npm test` 1231 testów, 1197 przechodzi, 34 pominięte, 0 błędów; `e2e_wrapper`,
`e2e_chat`, `e2e_share_resume`, `e2e_qrscan`, `e2e_sheet_drag` (4 razy z rzędu) przechodzą;
`check-clean.sh` i `check-notification-privacy.sh` czyste; CI na PR #12 zielone.

Nie zrobiono: test na prawdziwych telefonach (F1-4, F5-2), iOS (D3), dodatek do
`PROTOCOL.md` o typie `chat` (plik zamrożony, opis w `starling/docs/CHAT.md`, wymaga zgody
właściciela), ekrany z makiet: zgoda przed uprawnieniami, osobny edytor miejsca,
zaproszenie jako pełna strona, ilustracja powitalna.

Do decyzji właściciela: powiadomienia o miejscach (`detailAlerts`, domyślnie wyłączone) po
włączeniu nadal mogą pokazać imię i miejsce na zablokowanym ekranie przy domyślnych
ustawieniach Androida.

---

## 2026-10-14, Claude, F2-6: aplikacja po polsku i marka Blisko

Zrobiono:

- Polski katalog `starling/app/js/strings-pl.js` pokrywa każdy tekst z
  `tools/extract-strings.mjs`. Polski jest domyślny niezależnie od języka telefonu
  (`DEFAULT_LOCALE` w `i18n.js`, `lang: "pl"` w ustawieniach), pierwszy na liście; inne
  języki zostają do wyboru, opcja „Auto” zniknęła. `i18n.js` obsługuje formy liczby mnogiej
  (`{ one, few, many, other }` przez `Intl.PluralRules`): 1 miejsce, 2 miejsca, 5 miejsc.
  „relay” w polskich tekstach to „serwer” (także w nowych tekstach F1-7).
- Marka: „Blisko” w manifeście, tytule, logotypie, O aplikacji, nazwie aplikacji na
  Androidzie, powiadomieniach i nazwie na iOS. `t()` podmienia „Starling” na „Blisko” w
  szablonach innych języków (nigdy w wartościach wpisanych przez ludzi). O aplikacji:
  „Na bazie Starling, wolnego oprogramowania na licencji GPL-3.0.” Nazwy w kodzie, pakiety
  i protokół bez zmian.
- Ikona: zielona pinezka #0B7A64 z sercem na jasnym tle; źródło nadal
  `app/icons/starling.svg`, wszystkie rastry (web, Android adaptacyjna i monochromatyczna,
  iOS, og.png) wygenerowane Chromium. Ikona na pasku stanu celowo zostaje ogólną pinezką.
- Android: domyślne `values/strings.xml` po polsku (kanały powiadomień też), values-de/es/fr/pt
  zostały, z „Blisko” zamiast „Starling”. iOS: nazwa, region `pl`, polskie prośby o
  uprawnienia. `help.html` i `privacy.html` po polsku.
- Testy: polski w tych samych sprawdzeniach kompletności co inne katalogi, nowe testy
  liczby mnogiej, marki i języka domyślnego (`test/polish-default.test.mjs`).
  `test/dom-harness.mjs` przełącza stare testy DOM na angielski po starcie. Teksty
  oczekiwane w skryptach e2e (Node i Python) zmienione na polskie.

Sprawdzono: `node --test test/*.test.mjs` po scaleniu z F1-7: 1146 testów, 1112 przeszło,
34 pominięto, 0 błędów; `tools/check-clean.sh` czysto. W Chromium przeszły
`e2e_wrapper`, `e2e_sheet_drag`, `e2e_share_resume`, `e2e_qrscan` (z `chromium` w PATH
wskazującym Chromium z Playwrighta). Zrzuty ekranu w `wydanie-1.0/polski/`.

Sprawdzono tylko przez czytanie: skrypty Python/Marionette (`e2e_marionette`, `e2e_v2_ui`,
`e2e_places`, `e2e_lock`), bo tu nie ma Firefoksa; budowanie Androida i iOS (zrobi CI).

Nie zrobiono: sekcje marketingowe strony WWW (tylko web, usuwane w aplikacji) zostały po
angielsku; nowy wygląd należy do zadania UI.

Pytania do właściciela: czy wymuszać polski także na telefonie w innym języku (teraz tak);
czy usunąć values-de/es/fr/pt na Androidzie, żeby powiadomienia zawsze były po polsku.

---

## 2026-10-14, Claude, F1-7: relay rodziny i linki zaproszeń bez starlingmap.app

Zrobiono:

- Domyślny relay z budowania, nie z gita. `starling/app/js/build-config.js` w repo ma pusty
  `BUILD_RELAY`; Gradle (`syncWebAssets`) nadpisuje go w `build/webassets` wartością z
  `RELAY_URL` i ustawia z niej host App Links (`manifestPlaceholders["relayHost"]`) oraz
  `BuildConfig.RELAY_HOST` (używane przez `MainActivity.APP_HOST`). Bez `RELAY_URL`
  host to zarezerwowany `relay.invalid`, a aplikacja przy pierwszym uruchomieniu prosi o
  adres relaya (nowy arkusz „Connect to your family relay”) i blokuje tworzenie kręgu oraz
  dołączanie z linku bez relaya. `tools/gen-build-config.mjs` robi to samo dla innych
  budowań; ta sama reguła walidacji co w Gradle (test pilnuje zgodności).
- `env.js`: zamiast stałej `https://starlingmap.app` jest `defaultRelay` z build config;
  linki zaproszeń w aplikacji budowane na originie relaya rodziny (dwuczęściowe, gdy
  relay to ten wbudowany; trzyczęściowe z relayem, gdy ktoś wpisał inny).
- Usunięto link „What Starling is and how it works” do starlingmap.app ze startu w
  aplikacji i placeholder `https://starlingmap.app` w ustawieniach.
- Relay: `assetlinks.json` z `ANDROID_PACKAGE` i `ANDROID_CERT_SHA256` (domyślnie dane
  upstreamu, błędna lub połowiczna konfiguracja daje 500). Gdy `ANDROID_PACKAGE` jest
  ustawione, `GET /` zwraca statyczną polską stronę dla zaproszenia otwartego w
  przeglądarce. `relay/server.mjs` przekazuje obie zmienne ze środowiska. Logiki podpisów
  nie dotykano.
- CI: `RELAY_URL` z sekretów tylko do kroku budowania APK (adres nie jest wypisywany);
  krok podpisu wypisuje `ANDROID_CERT_SHA256=...` (też w Summary).
- `docs/WDROZENIE-CT8.md`: kroki dla właściciela.
- Testy: `test/family-build.test.mjs` (nowy), zmienione `test/env.test.mjs` (stare testy
  zakładały starlingmap.app jako domyślny relay w aplikacji; teraz sprawdzają relay z
  build config i brak relaya), nowy przypadek w `test/main-guards.test.mjs`. Skrypty e2e
  (`e2e_wrapper`, `e2e_share_resume`, `e2e_qrscan`) używają `RELAY_URL=https://relay.e2e.test`
  przez `serve_local.mjs`.

Sprawdzono: wynik bazowy przed zmianą 1118 testów, 1084 przeszło, 34 pominięto, 0 błędów.
Po zmianie: 1140, 1106 przeszło, 34 pominięto, 0 błędów. `check-clean.sh` czysty.
E2E w Chromium: `e2e_wrapper`, `e2e_share_resume`, `e2e_qrscan` przechodzą (w tym dołączenie
skanem QR). Zrzut ekranu arkusza pierwszego uruchomienia bez relaya obejrzany.

Sprawdzono tylko przez czytanie: zmiany Gradle, manifestu i Kotlina (brak SDK; pierwsze
prawdziwe sprawdzenie to CI), weryfikacja App Links na telefonie, krok CI z odciskiem.

Nie zrobiono: strona `/help` (link pomocy awaryjnej dla osób bez aplikacji) nie jest
serwowana przez relay na Node; iOS bez zmian; `privacy.html` i metadane `<head>` w
`index.html` nadal opisują starlingmap.app (to tekst, nic nie jest pobierane). Teksty
nowego arkusza są po angielsku jako klucze i przetłumaczone na es/de/fr/pt; polskie
tłumaczenie należy do F2-6 (test pokrycia go wymusi). Propozycja:
„Połącz z relayem rodziny”, „Wpisz adres relaya rodziny.”, „Ta aplikacja nie ma
wbudowanego adresu relaya. Wpisz adres relaya rodziny, na przykład
https://relay.example.org. Cała rodzina używa tego samego, a do czasu jego ustawienia nic
nie jest nigdzie wysyłane.” Klucz „What Starling is and how it works &#8599;” zniknął z
aplikacji, więc nie trzeba go tłumaczyć.

Następny krok: właściciel dodaje sekret `RELAY_URL`, po budowie przepisuje odcisk z logu do
`~/start-relay.sh` (`ANDROID_PACKAGE=app.kidslocation`, `ANDROID_CERT_SHA256=...`) i
restartuje relay; potem F1-4 (dwa telefony, link i QR).

---

## 2026-10-14, Claude, F1-8b: wydanie także z ręcznego uruchomienia

Klucz rodziny dodany przez właściciela. Ręczny przebieg „Aplikacja CI” na `main`
(run 38579655710) podpisał APK (krok podpisu: success, artefakt `kidslocation-signed`), ale
wydania nie utworzył, bo warunek wymagał zdarzenia `push`. Poprawka: wydanie powstaje na
`main` przy każdym zdarzeniu poza `pull_request`. Po scaleniu tego PR pierwsze wydanie
powstanie samo (zmiana dotyka pliku workflow, więc uruchamia CI na `main`).

---

## 2026-10-14, Claude, F1-8: własne APK z aktualizacjami

Zrobiono:

- `starling/android/app/build.gradle.kts`: `applicationId` = `app.kidslocation` (namespace
  Kotlina bez zmian, żeby nie ruszać kodu), `versionCode` = 2100 * 1000 + `FAMILY_BUILD`
  (numer przebiegu CI). Podbicie wersji w upstreamie podnosi część wysoką, więc numer
  zawsze rośnie.
- CI (`.github/workflows/aplikacja.yml`, zadanie `android`): jeśli istnieją sekrety
  `ANDROID_KEYSTORE_B64` i `ANDROID_KEYSTORE_PASSWORD`, podpisuje APK (`apksigner`, alias
  `rodzina`), wrzuca je jako artefakt, a na `main` tworzy wydanie `apk-<wersja>-<numer>`
  (dla Obtainium). Bez sekretów wszystko działa jak dotąd, krok podpisu jest pomijany.
- `.github/workflows/klucz-podpisu.yml`: jednorazowe, ręczne utworzenie klucza i hasła,
  oddane jako prywatny artefakt na 1 dzień. Klucz nie trafia do repo ani do rozmowy.
- `docs/PODPIS-APK.md`: kroki dla właściciela i Obtainium.

Sprawdzono: składnia YAML obu workflow (parser). Budowy Androida lokalnie nie ma (brak
SDK w kontenerze), więc pierwszym sprawdzeniem jest CI na tym PR.

Nie zrobiono (osobne zadania): linki zaproszeń i App Links nadal wskazują
`starlingmap.app` (`AndroidManifest.xml` linia 69, `relay/src/index.js` linia 374 ma
`package_name` `app.starlingmap`); to F1-7. Nazwa aplikacji na ekranie nadal „Starling”
(F2-6). iOS bez zmian (D3 otwarta).

Uwaga dla rodziny: to nowa aplikacja obok ewentualnie zainstalowanego Starlinga, krąg
trzeba w niej założyć od nowa.

---

## 2026-10-14, Claude, F0-4: kod aplikacji w tym repozytorium (D4 = B)

Zrobiono:

- Właściciel wybrał D4 = B i zdjął zakaz pisania kodu (karta decyzji w projekcie, 14.10).
- Zaimportowano `Jack4B/starling` (0.21.0, `8ec6dad`, 234 commity) do `starling/` przez
  `git subtree add`, z pełną historią. Licencja GPL-3.0-or-later zostaje w `starling/LICENSE`.
- Dodano `.github/workflows/aplikacja.yml`: testy na Ubuntu z Node 22 i 24, `check-clean`,
  kontrola prywatności powiadomień, budowa niepodpisanego APK z kontrolą uprawnień.
  Względem CI forka: bez macOS i Windows (minuty w prywatnym repo), iOS tylko ręcznie
  (`workflow_dispatch` z opcją `ios`), bez lustra GitLab. Uruchamia się tylko przy
  zmianach w `starling/`.
- Zaktualizowano `AGENTS.md` (ścieżki, testy, upstream), D4 w `DECYZJE.md`, F0-4 w `PLAN.md`.

Sprawdzono (uruchomione w `starling/` na Node 22.22.0, po `npm ci` i
`bash tools/sync-vendor.sh`): `node --test test/*.test.mjs` daje 1118 testów, 1084 przeszło,
34 pominięto, 0 nie przeszło (tak samo jak w forku). `bash tools/check-clean.sh`: czysto.

Nie sprawdzono: nowy workflow nie był jeszcze uruchomiony na GitHubie (pierwszy przebieg
na tym PR). Budowy Androida lokalnie nie uruchamiano.

Następny krok: F1-7 (własny applicationId, klucz podpisu, wersje, domyślny relay i linki
zaproszeń poza starlingmap.app), równolegle F1-4 (test dwóch Androidów na relayu CT8).
Otwarte PR-y z dokumentami (#1 do #6, #8) mają wpisy w HANDOFF i będą wymagały rebase.

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

---

## 2026-10-14, Claude, F3 czat (gałąź `zadanie/F3-czat`)

Wynik bazowy przed zmianą (z `origin/wydanie/1.0`, po `npm ci` i `tools/sync-vendor.sh`):
1118 testów, 1084 przeszło, 34 pominięto, 0 nie przeszło.

Zrobiono:

- Czat rodzinny według ADR-001, wariant A: typ `t:"chat"` w strumieniu członka, koperta
  `{v:2, ts, t:"chat", k, q, x}`, budżet 402 B na tekst, miękkie 280 znaków. Bez zmian
  w `crypto.js`, `wire.js`, `PROTOCOL.md` i relayu.
- `app/js/chat.js` (format, budżet, archiwum, luki, kolejka FIFO, kontroler),
  `app/js/chatview.js` (`mountChat`), `app/css/chat.css`, gałąź odbioru w `net.js`,
  podpięcie w `main.js` (przycisk w narzędziach arkusza, archiwum przez `atRestForm`,
  wipe, powiadomienia, linie miejsc w osi).
- Android: kanał „Wiadomości” (`events_chat`), ogólny tekst na ekranie blokady.
- Testy: `test/chat*.test.mjs` (59 nowych), w tym dwóch członków przez prawdziwy kod
  relaya. Zaktualizowane istniejące testy (zmiana zamierzona): `detail-alerts`,
  `notify-kinds`, `sw-manifest`, lista plików w `i18n`.
- E2E w przeglądarce: `test/e2e_chat.mjs` (dwa konteksty Playwright, lokalny relay przez
  `test/serve_local.mjs`); zrzuty w `/mnt/project-files/wydanie-1.0/czat/`.
- Dokumentacja: `docs/adr/ADR-001-czat.md` (przyjęty, sekcja decyzji i opis protokołu),
  `starling/docs/CHAT.md`, `docs/nowe-teksty-F3.md`.

Wynik po zmianie: 1178 testów, 1144 przeszło, 34 pominięto, 0 nie przeszło. Po scaleniu
nowszego `wydanie/1.0` (F1-7) do gałęzi: 1200 testów, 1166 przeszło, 34 pominięto,
0 nie przeszło; E2E czatu przechodzi. Po drugim scaleniu (F2-6: polski domyślnie, Blisko)
teksty czatu są w `strings-pl.js` z formami mnogimi, kanał „Wiadomości” w domyślnym
`values/strings.xml`; wynik: 1206 testów, 1172 przeszło, 34 pominięto, 0 nie przeszło;
E2E przechodzi po polsku, zrzuty odświeżone.
`check-clean.sh` i `check-notification-privacy.sh` przechodzą.

Nie zrobiono lub nie sprawdzono:

- Build Androida, prawdziwy telefon, iOS, dwa konteksty JS na Androidzie.
- F3-7 (pole możliwości w `loc`).
- Dopisek do `PROTOCOL.md` (plik zamrożony; wymaga zgody właściciela).
- Czat na kanale poprzedniej generacji w czasie re-key jest pomijany (widać lukę).

Następny krok: recenzja i scalenie przez prowadzącego; decyzje do ewentualnej zmiany przez
właściciela są w sekcji „Decyzje przyjęte 2026-10-14” w ADR-001.

---

## 2026-10-14, Claude, F2 nowy wygląd (gałąź `zadanie/F2-1-nowy-wyglad`)

Wynik bazowy przed zmianą (z `origin/wydanie/1.0`, po `npm ci` i `tools/sync-vendor.sh`):
1118 testów, 1084 przeszło, 34 pominięto, 0 nie przeszło.

Zrobiono (F2-1 do F2-5, F2-7, F2-8 według makiet i przeglądu z 2026-10-14):

- Tokeny jasne i ciemne w `app/css/tokens.css` (motyw systemu albo ręczny), z poprawkami
  przeglądu: `--warn` #95500A w jasnym, osobny `--outline` na obramowania kontrolek,
  obwódka pływających przycisków w ciemnym. Fonty Figtree i Bricolage Grotesque (OFL)
  kopiowane z npm przez `tools/sync-vendor.sh` do `app/vendor/fonts`, bez Google Fonts.
- Mapa: pigułka kręgu, okrągłe przyciski (styl mapy, pokaż wszystkich, moja pozycja),
  znaczniki z inicjałem i podpisem, „brak sygnału” przerywaną linią, miejsca z podpisem.
  Arkusz z kartami osób przewijanymi w bok, „Przytrzymaj SOS” na krawędzi arkusza.
- Dolna nawigacja: Mapa, Czat (czat z F3, licznik nieprzeczytanych w kolorze akcentu),
  Miejsca, Krąg. Karta osoby z chipami, akcjami, osią „Ostatnia godzina” z trasy
  (`app/js/timeline.js`) i wierszem tożsamości. Ekran Krąg; Ustawienia są pod
  „Wszystkie ustawienia” (koło zębate zniknęło z pigułki).
- F2-2: mapa przed pierwszym odczytem pokazuje zapisane miejsca albo Polskę (zoom 6),
  po pierwszym odczycie przechodzi na użytkownika w zoomie ulic, chyba że ktoś już
  przesunął mapę. Własna pozycja nie jest nigdzie zapisywana (prywatność).
- Teksty: polskie w `strings-pl.js`, lista w `docs/nowe-teksty-F2-1.md`.
- Testy: `test/timeline.test.mjs`, `test/redesign-nav.test.mjs`. Zmiana zamierzona
  w istniejących: `place-pick` i `units` otwierają Ustawienia przez `openSettings()`;
  skrypty e2e otwierają Ustawienia z zakładki Krąg i Miejsca z zakładki; `e2e_sheet_drag`
  sprawdza przewijanie na pełnej wysokości z wypełniaczem; `e2e_chat` otwiera czat zakładką.

Wynik po zmianie (po scaleniu F1-7, F2-6 i F3): 1225 testów, 1191 przeszło, 34 pominięto,
0 nie przeszło. `check-clean.sh` przechodzi. E2E w Chromium: `e2e_chat`, `e2e_sheet_drag`,
`e2e_share_resume`, `e2e_qrscan` przechodzą; `e2e_wrapper` ma 7 niepowodzeń z F2-6
(oczekuje angielskich tekstów i hiszpańskiego z systemu), niezwiązanych z wyglądem.
Zrzuty: `/mnt/project-files/wydanie-1.0/wyglad/`.

Nie zrobiono lub nie sprawdzono:

- Skrypty e2e w Pythonie (Firefox/Marionette) zaktualizowane, ale nieuruchomione.
- Ekran zgody na lokalizację przed pytaniem systemu (start-2): nowa funkcja, poza zakresem.
- Ekran powitalny według start-1 (ilustracja, lista zaufania): zostawiony, bo logo
  i treść strony startowej należą do zadania marki.
- Edytor miejsca jako osobny ekran z podglądem mapy (miejsca-2): jest rozwijany wiersz.
- Zaproszenie jako strona z przyciskami obok siebie (zaproszenie-1): zostało arkuszem.
- Przegląd na prawdziwym telefonie (F2-8), build Androida.

Następny krok: recenzja i scalenie przez prowadzącego.

## 2026-10-14, Claude, F3-9 prywatność powiadomień czatu (gałąź `zadanie/F3-9-prywatnosc-powiadomien`)

Wynik bazowy przed zmianą: 1225 testów, 1191 przeszło, 34 pominięto, 0 nie przeszło.

Zrobiono:

- M1 z przeglądu bezpieczeństwa: powiadomienie o wiadomości w tle bez `chatOnLock` mówi
  tylko „Nowa wiadomość” (bez imienia i treści) w wersji prywatnej i publicznej. Android
  pokazuje wersję prywatną na zabezpieczonym ekranie blokady, gdy w systemie jest włączone
  „pokazuj całą treść” (domyślnie), więc wcześniej imię, a przy `chatPreview` także treść,
  wyciekały na ekran blokady. Teraz imię tylko przy `chatOnLock`, treść tylko przy
  `chatOnLock` i `chatPreview`. Warunek jest w `chatNotice` (`app/js/chat.js`) i drugi raz
  w `Events.postDetail` (Kotlin), który dla czatu bez `onLock` w ogóle nie używa słów
  ze strony. Toast w aplikacji bez zmian.
- Przełączniki w panelu informacji czatu: najpierw „Pokazuj w powiadomieniach, kto
  napisał” (`chatOnLock`), potem „Pokazuj też treść wiadomości” (`chatPreview`). Klucze
  ustawień bez zmian.
- `tools/check-notification-privacy.sh` sprawdza teraz pola `setContentTitle/Text`
  (tylko `heading`, `text`, `publicHeading`, `publicText`), sposób, w jaki `show()`
  je wylicza, gałąź czatu w `postDetail` oraz, przez `node`, że `chatNotice` bez
  `chatOnLock` nie zawiera imienia ani treści. Sprawdzone mutacjami: każda z sześciu
  wprowadzonych regresji kończy skrypt błędem.
- L1: notatka o luce w czacie nie pokazuje absurdalnej liczby. Powyżej 999 (`GAP_SHOWN_MAX`)
  mówi „nie udało się odczytać części wiadomości”.

Testy: `node --test test/*.test.mjs`: 1230, 1196 przeszło, 34 pominięto, 0 nie przeszło.
`e2e_chat.mjs` w Chromium przechodzi. `check-clean.sh` i `check-notification-privacy.sh`
przechodzą.

Nie zrobiono lub nie sprawdzono:

- Build Androida i test na telefonie (brak SDK).
- Ścieżka `detailAlerts` (miejsca) ma ten sam wzorzec: przy `detailAlerts` włączonym
  i `detailOnLock` wyłączonym imię i miejsce są w wersji prywatnej, więc przy domyślnym
  ustawieniu systemu widać je na ekranie blokady. To funkcja włączana świadomie, ale
  opis przełącznika obiecuje ogólny ekran blokady. Do decyzji właściciela.
- Kto miał `chatPreview` bez `chatOnLock`, po aktualizacji dostaje tylko „Nowa wiadomość”.

Następny krok: recenzja i scalenie przez prowadzącego.
