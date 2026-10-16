# Plan pracy

Stan na 2026-10-14. Wszystkie zadania: **do zrobienia**, o ile nie napisano inaczej.
Podział pracy to propozycja; właściciel może go zmienić.

## Zasady prowadzenia planu

- Jedno zadanie to jeden PR. Identyfikator zadania trafia do nazwy gałęzi i opisu PR.
- Zadanie jest skończone, gdy spełnia kryterium z tabeli, ma testy, ma recenzję innego
  modelu i właściciel je scalił.
- Kto bierze zadanie, wpisuje się w kolumnie „Status" (na przykład `w toku: Gemini`).
- Autor i recenzent to różne modele. Kolumna „Kto" wskazuje autora, „Recenzja" recenzenta.

Skróty: C = Claude, G = Gemini, X = Grok, W = właściciel.

## Faza 0: przygotowanie

| ID | Zadanie | Kto | Recenzja | Kryterium ukończenia |
|---|---|---|---|---|
| F0-1 | Sprawdzić hosting CT8: `node -v`, czy działa `node:sqlite`, czy można trzymać długo działający proces i wystawić go na HTTPS przez domenę | W | C | Wynik wpisany w `docs/DECYZJE.md` (D1) |
| F0-2 | Ustalić ścieżkę iOS: czy jest Mac z Xcode, czy płatne konto Apple, czy syn może dostać telefon z Androidem | W | C | Decyzja D3 zamknięta |
| F0-3 | Założyć repozytorium i podpiąć modele (`docs/PODLACZENIE-AGENTOW.md`) | W | brak | Repo istnieje, Claude ma dostęp do zapisu, Gemini i Grok mają sposób pracy |
| F0-4 | Rozstrzygnąć układ repozytoriów (D4): kod w forku, tu tylko dokumenty, czy wszystko razem | W | C | Decyzja D4 zamknięta. **Zrobione 2026-10-14: B, kod w `starling/` (PR F0-4).** |
| F0-5 | Baza testowa: sklonować fork, `bash tools/sync-vendor.sh`, uruchomić testy na Node 24 | C | G | Liczba testów i wynik w HANDOFF (wersja 0.21.0: 1118 testów, 34 pominięte). Stan: wykonane 2026-10-14, czeka na recenzję G |

## Faza 1: własny serwer pośredniczący (relay)

Zależy od F0-1 i D1.

| ID | Zadanie | Kto | Recenzja | Kryterium ukończenia |
|---|---|---|---|---|
| F1-1 | Policzyć zapisy na jeden post w `relay/src/index.js` i oszacować dzienne obciążenie dla 6 do 7 osób (kadencja 15 s w ruchu, 60 do 300 s w bezruchu) | C | X | Liczby w D1; wiadomo, czy darmowy limit zapisów Cloudflare wystarcza |
| F1-2 | Uruchomić relay wg D1: Node na CT8, albo Cloudflare Worker, albo port PHP + SQLite | C | G | `GET /api/v2/health` odpowiada przez HTTPS; relay działa po restarcie |
| F1-3 | Konfiguracja produkcyjna: `PUBLIC_ORIGIN`, `TRUST_PROXY`, `ALLOWED_ORIGINS`, limity `RATE_POST_MIN` i `RATE_GET_MIN` | C | X | Opisane w `docs/` bez żadnych sekretów |
| F1-4 | Test na dwóch telefonach z Androidem: utworzenie kręgu, zaproszenie, widoczność wzajemna, SOS, check-in, praca z wygaszonym ekranem | W | C | Lista wyników; pomiar zużycia baterii i opóźnień |
| F1-5 | Jeśli port PHP: uruchomić zestaw testów relaya (`test/relay.test.mjs`) przeciw implementacji PHP | C | G | Te same przypadki przechodzą na obu implementacjach |
| F1-7 | Relay rodziny jako domyślny, bez adresu w repo: `RELAY_URL` z sekretu CI do `build-config.js` i App Links, linki zaproszeń na domenie relaya, `assetlinks.json` z `ANDROID_PACKAGE` i `ANDROID_CERT_SHA256` (`docs/WDROZENIE-CT8.md`) | C | G | Świeża instalacja nie łączy się z `starlingmap.app`; link zaproszenia otwiera aplikację. Stan: kod gotowy 2026-10-14, czeka na sekret `RELAY_URL` i zmienne relaya od właściciela |
| F1-8 | Własne APK: `applicationId` `app.kidslocation`, rosnący `versionCode` z numeru przebiegu CI, podpis kluczem rodziny w CI, wydania pod Obtainium (`docs/PODPIS-APK.md`) | C | G | Nowe APK z CI instaluje się na poprzednie jako aktualizacja. Stan: w toku 2026-10-14, czeka na klucz od właściciela |

Uwagi: aplikacja przyjmuje wyłącznie adresy `https://` dla własnego relaya. Wszyscy
członkowie kręgu muszą używać tego samego relaya. Zaproszenie wygenerowane na własnym
relayu niesie jego adres.

## Faza 2: interfejs według makiet

Makiety i tokeny: `docs/DESIGN.md`. Zmiany głównie w `app/css/app.css`, `app/js/ui.js`,
`app/js/map.js`. Nie ruszać kryptografii.

| ID | Zadanie | Kto | Recenzja | Kryterium ukończenia |
|---|---|---|---|---|
| F2-1 | Tokeny CSS motywu jasnego i ciemnego, przełącznik: system, jasny, ciemny | G | C | Oba motywy działają na wszystkich istniejących ekranach, kontrast 4,5 do 1 |
| F2-2 | Mapa startuje na pozycji użytkownika w widoku ulic (dziś na sztywno widok świata, `map.js` około linii 42); przyciski „Pokaż wszystkich" i „Moja pozycja" | G | C | Po uruchomieniu widać ulicę, w której jest użytkownik; przed pierwszym odczytem GPS zachowanie jest sensowne i opisane |
| F2-3 | Znaczniki z imieniem i czasem ostatniego sygnału, okręgi miejsc, wyszarzony stan „brak sygnału" | G | C | Zgodne z makietą 1 w obu motywach |
| F2-4 | Dolny arkusz z kartami osób i rozwinięty arkusz osoby (akcje, oś zdarzeń z ostatniej godziny) | G | C | Zgodne z makietą 2; oś pokazuje tylko dane, które aplikacja naprawdę ma |
| F2-5 | Dolna nawigacja (Mapa, Czat, Miejsca, Krąg), przytrzymanie SOS, plakietka nieprzeczytanych | G | C | Zgodne z makietami; SOS nie wysyła się przypadkowo |
| F2-6 | Polski katalog tłumaczeń (`app/js/strings-pl.js`) i rejestracja w `i18n.js`; test pokrycia zmusza do pełnego katalogu | G | X | Wszystkie teksty po polsku, test pokrycia przechodzi, korekta językowa Groka |
| F2-7 | Czcionki lokalnie, bez Google Fonts (Bricolage Grotesque, Figtree; obie na licencji OFL, sprawdzić) i dodanie do precache service workera | G | C | Brak żądań do `fonts.googleapis.com`; aplikacja działa offline |
| F2-8 | Dostępność: etykiety przycisków, kolejność fokusu, cele dotyku, przegląd na prawdziwym telefonie | G | X | Lista kontrolna z `docs/DESIGN.md` odhaczona na urządzeniu |
| F2-9 | Makiety brakujących ekranów: Miejsca, aktywny SOS, zaproszenie i QR, pierwsze uruchomienie | C | G | Makiety w obu motywach, dopisane do `docs/DESIGN.md` |

## Faza 3: czat

Zależy od D2. Najpierw projekt, dopiero potem kod.

Stan 2026-10-14: ADR-001 przyjęty z decyzjami domyślnymi (`docs/adr/ADR-001-czat.md`).
F3-1 do F3-6 i opis protokołu (F3-8, poza `PROTOCOL.md`) wdrożone na gałęzi
`zadanie/F3-czat`, czeka na scalenie. Otwarte: F3-7 (pole możliwości), dopisek do
`PROTOCOL.md` za zgodą właściciela, sprawdzenie na prawdziwym telefonie.

| ID | Zadanie | Kto | Recenzja | Kryterium ukończenia |
|---|---|---|---|---|
| F3-0 | ADR: gdzie żyją wiadomości czatu i jak długo (D2). Wariant A: nowy typ `t:"chat"` w istniejącym strumieniu plus zmiana limitu wpisów. Wariant B: osobna linia lub kanał wyprowadzony z łańcucha kluczy (zmiana protokołu). | C | G i X | ADR w `docs/` z odpowiedzią na pytania z `docs/DECYZJE.md` (D2); właściciel zatwierdza |
| F3-1 | Odbiór: własny zbiór deduplikacji `(członek, epoka, czas)` jak dla wiadomości kontrolnych; nie mieszać z mechanizmem „najwyższy znak czasu" dla pozycji | C | G | Test: powtórzona wiadomość nie wyświetla się dwa razy; wiadomość z czasem starszym niż pozycja nie jest odrzucana |
| F3-2 | Limity: 280 znaków i 512 B po zakodowaniu UTF-8; licznik w polu; obsługa polskich znaków | C | G | Test najdłuższej dopuszczalnej wiadomości w stylu istniejącego testu `PAD_RESERVE` |
| F3-3 | Wysyłanie: wspólna kolejka z pozycjami, ścisły wzrost znaku czasu na członka (inaczej relay odpowie 409) | C | G | Test: wysłanie czatu w tej samej milisekundzie co pozycji nie psuje żadnej z nich |
| F3-4 | Interfejs czatu według makiety 3, zdarzenia kręgu w osi rozmowy, szybkie odpowiedzi | G | C | Zgodne z makietą w obu motywach |
| F3-5 | Archiwum lokalne: szyfrowane w spoczynku (`atrest.js`), ustawialny czas przechowywania, czyszczone przy panic wipe | C | X | Test: po panic wipe nie ma śladu wiadomości |
| F3-6 | Powiadomienia: Android, kanał „Wiadomości", podgląd treści tylko za zgodą (istnieje mechanizm `notifyDetail`); iOS tylko przy otwartej aplikacji, udokumentować | C | G | Wiadomość od członka kręgu pojawia się przy wygaszonym ekranie; ekran blokady nie ujawnia treści domyślnie |
| F3-7 | Minimalna wersja klienta: starsze wersje (do 0.17.1) mogą traktować nieznany typ jak pozycję; wymusić jedną wersję w rodzinie lub ostrzegać | C | X | Opisany i przetestowany mechanizm |
| F3-8 | Aktualizacja `PROTOCOL.md` i `THREAT-MODEL.md`; wektory testowe, jeśli zmieniono kryptografię | C | G i X | Dokumentacja zgodna z kodem |

## Faza 4: iOS (warunkowo, zależy od D3)

Nie rozpisujemy zadań szczegółowych, dopóki D3 jest otwarta. Opcje:

- A: zostaje WKWebView. Udostępnianie i powiadomienia tylko przy otwartej aplikacji.
  Wymaga uczciwego komunikatu w aplikacji i na pewno nie spełnia roli aplikacji dla dziecka.
- B: natywny Swift: lokalizacja w tle (`CLLocationManager`) i port szyfrowania na
  CryptoKit (AES-GCM, HKDF-SHA-256, ECDH P-256, Ed25519), weryfikowany na wektorach z
  `test/vectors/`. Potrzebny Mac z Xcode; stabilna instalacja wymaga płatnego konta Apple.
- C: telefon z Androidem dla dziecka.

## Faza 5: utwardzanie i wdrożenie rodzinne

| ID | Zadanie | Kto | Recenzja | Kryterium ukończenia |
|---|---|---|---|---|
| F5-1 | Przegląd bezpieczeństwa całości zmian przez model inny niż autor | G | X | Raport z numerami linii; poprawki zamknięte |
| F5-2 | Test na prawdziwych telefonach: oszczędzanie baterii producentów (Samsung, Xiaomi), SOS w tle, wznowienie po restarcie i po aktualizacji | W | C | Lista wyników per model telefonu |
| F5-3 | Eksploatacja relaya: kopia zapasowa pliku bazy (opcjonalna, dane i tak wygasają po dobie), monitoring, logi bez danych osobowych | C | X | Opis i działające sprawdzenie |
| F5-4 | Instrukcja dla rodziny: instalacja, zaproszenie, co zrobić po zgubieniu telefonu (usunięcie członka, nowe klucze) | X | C | Jedna strona prostym językiem |
| F5-5 | Polityka aktualizacji z upstreamu `munzzyy/starling`: jak często, jak scalać, co robić przy konflikcie z naszymi zmianami | C | G | Opis i pierwsze scalenie na próbę |

## Faza 6: wspólne miejsca w kręgu

Dziś miejsce (Dom, Szkoła) istnieje tylko na telefonie, na którym je dodano
(`starling/app/js/places.js`, linia 1), i każdy musi dodać je u siebie. Cel: miejsce dodane
przez jedną osobę pojawia się u wszystkich w kręgu, razem z alertami wejścia i wyjścia.
Zależy od D7. Najpierw ADR, dopiero potem kod. Wzór: czat (ADR-001, `starling/docs/CHAT.md`),
czyli nowy typ wiadomości w istniejącym strumieniu członka, bez zmian w kryptografii i w relayu.

| ID | Zadanie | Kto | Recenzja | Kryterium ukończenia |
|---|---|---|---|---|
| F6-0 | ADR-002: format wiadomości `t:"place"` (dodanie, zmiana, usunięcie), rozstrzyganie konfliktów, ponowne rozsyłanie dla osób, które były offline lub dołączyły później, wpływ na limit 240 wpisów; odpowiedzi na pytania z D7 | C | G | ADR w `docs/adr/`; właściciel zatwierdza |
| F6-1 | Format i budżet: koperta `{v, ts, t:"place", k, op, id, n, la, lo, r}` mieści się w 512 B z rezerwą 24 B przy nazwie 24 znaków z polskimi literami; parser odrzuca złe pola (współrzędne, promień spoza `PLACE_RADII`) | C | G | Test najdłuższej wiadomości w stylu `PAD_RESERVE`; testy odrzucania |
| F6-2 | Odbiór i scalanie: lista miejsc kręgu to wynik ostatniego zapisu na miejsce, wygrywa wyższe `(ts, członek)`; usunięcie zostawia znacznik, żeby starsza wiadomość nie przywróciła miejsca; limit `MAX_PLACES` liczony dla kręgu | C | G | Testy: kolejność wiadomości nie zmienia wyniku; usunięte miejsce nie wraca; powtórzona wiadomość nic nie zmienia |
| F6-3 | Rozsyłanie: wysłanie przy każdej zmianie i ponowne rozesłanie całej listy po dołączeniu nowej osoby oraz rzadko w tle (kadencja według ADR, z kosztem w zapisach relaya z F1-1) | C | G | Test: osoba dołączająca po dodaniu miejsca dostaje je bez działania innych; pomiar liczby postów na dobę |
| F6-4 | Interfejs: ekran Miejsca pokazuje, kto dodał miejsce; edycja i usuwanie zgodnie z D7; nowy tekst zamiast „Miejsca są zapisane tylko na tym telefonie”; polskie teksty w katalogu | C | G | Zgodne z `docs/DESIGN.md` w obu motywach; test pokrycia tłumaczeń przechodzi |
| F6-5 | Migracja: istniejące lokalne miejsca po aktualizacji zostają tylko na telefonie, dopóki właściciel ich nie udostępni (bez cichego wysyłania) | C | G | Test aktualizacji: nic nie wychodzi bez decyzji użytkownika |
| F6-6 | Testy e2e (`test/e2e_places.py` lub nowy test w Playwright): A dodaje miejsce, B je widzi i dostaje alert wejścia; zrzut bazy relaya nie zawiera nazwy ani współrzędnych | C | G | Test przechodzi w CI lub lokalnie z wklejonym wynikiem |
| F6-7 | Dokumentacja: `starling/docs/PLACES.md` (format, jak `CHAT.md`), `THREAT-MODEL.md` (miejsca opuszczają telefon, choć zaszyfrowane), dodatek do `PROTOCOL.md` tylko za zgodą właściciela | C | G | Dokumentacja zgodna z kodem |

Uwagi: relay nadal nie odróżni miejsca od pozycji (ten sam rozmiar i szyfrowanie), ale
miejsca przestają być tylko lokalne: zobaczy je każdy członek kręgu, także ten dodany
później. Starsze klienty (do 0.17.1) mogą potraktować nieznany typ jak pozycję (F3-7).

## Co celowo jest poza zakresem

- Wykrywanie wypadków i raporty jazdy w stylu płatnych funkcji Life360 (D5).
- Konta, numery telefonów, logowanie przez usługi zewnętrzne.
- Długa historia pozycji po stronie serwera.
- Wersja dla przeglądarki jako miejsce przechowywania kręgu (upstream świadomie to blokuje).
