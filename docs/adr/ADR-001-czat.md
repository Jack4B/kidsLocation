# ADR-001: Gdzie żyją wiadomości czatu i jak długo

| | |
|---|---|
| Status | **przyjęta** 2026-10-14 (wariant A; decyzje w sekcji „Decyzje przyjęte 2026-10-14”; wdrożenie na gałęzi `zadanie/F3-czat`) |
| Data | 2026-10-14 |
| Autor | Claude |
| Recenzenci | Gemini, Grok |
| Zatwierdza | właściciel projektu |
| Dotyczy | decyzja D2 w `docs/DECYZJE.md`, zadania F3-0 do F3-8 w `docs/PLAN.md` |
| Podstawa | fork Starling 0.21.0, commit `8ec6dad`; numery linii z tego stanu |
| Pomiary | `ADR-001-pomiary.md` obok tego pliku (skrypty w `pomiary/`) |

Ścieżki bez prefiksu dotyczą kodu forka (`app/`, `relay/`, `docs/PROTOCOL.md`, `test/`).
Ścieżki `docs/DECYZJE.md`, `docs/PLAN.md`, `AGENTS.md` dotyczą repozytorium kidsLocation.

## Decyzje przyjęte 2026-10-14

Prowadzący przyjął rozsądne wartości domyślne dla pytań z sekcji 8. Właściciel może każdą
z nich zmienić; tam, gdzie to tanie, wdrożenie ma przełącznik albo stałą w jednym miejscu.

- **Wariant A.** Nowy typ `t:"chat"` w istniejącym strumieniu członka, koperta E6
  `{v:2, ts, t:"chat", k, q, x}`. Bez zmian w `crypto.js`, `wire.js` i w relayu. A1 i A2
  nie są wdrożone; czekają na pomiary z sekcji 7.
- **P1: tak.** Świadome odejście od reguły upstreamu „nowe funkcje jako pola, nie jako
  typy”, przy zasadzie, że w rodzinie działają tylko nasze buildy.
- **P2: budżet bajtów.** Twardy limit 402 B dla `x` po zakodowaniu JSON (stała
  `CHAT_TEXT_BUDGET` w `app/js/chat.js`) i miękki limit 280 znaków. Licznik w polu pokazuje
  `znaki / sufit`, gdzie sufit to mniejsza z liczb: 280 albo tyle znaków, ile faktycznie
  zmieści się w bajtach. Tekst za długi jest **blokowany** z jasnym komunikatem, nigdy nie
  jest obcinany (to zmienia zapis w wierszu F3-2 w sekcji 6, który mówił o obcinaniu).
- **P3: archiwum 30 dni.** Archiwum zapisywane przez `atRestForm`: przy włączonej blokadzie
  aplikacji zapieczętowane kluczem sejfu, bez blokady zapisane jawnym tekstem, co ekran
  czatu uczciwie mówi. Wpisy starsze niż 30 dni są usuwane (oraz twardy limit 3000 wpisów
  na krąg). Archiwum czyści panic wipe, kod przymusu (ten sam panic), „wyczyść dane”,
  opuszczenie kręgu i jego usunięcie. W osi rozmowy jedna uczciwa linia: „Serwer trzyma
  wiadomości najwyżej 24 godziny. Ten telefon trzyma je 30 dni.”
- **P4: nazwa z rejestru członków**, nie w każdej wiadomości.
- **P5: tylko jedna linia.** Znak nowej linii zamieniany na spację przed wysłaniem.
- **P6, P7, P8: nie.** Bez A2, bez dłuższego okna historii, bez odpowiedzi na konkretną
  wiadomość.
- **Luki** wykrywane z `q` i pokazywane uczciwie w osi rozmowy („{imię}: N wiadomości nie
  dało się odczytać. Ten telefon był prawdopodobnie zbyt długo offline.”). Spóźniona
  wiadomość zmniejsza albo dzieli lukę.
- **Stan „Wysłano”** oznacza tylko, że relay przyjął post (odpowiedź 2xx), nie że ktoś
  przeczytał. Ekran informacji mówi to wprost.
- **Szybkie odpowiedzi:** Jestem / Wracam za 10 min / Odbierz mnie / OK. Wysyłane od razu.
- **Zdarzenia kręgu w osi:** przyjście i wyjście z miejsca, które zauważył ten telefon.
  Tylko lokalnie, nic nie idzie przez sieć.
- **Powiadomienia.** Android: osobny kanał „Wiadomości” (`events_chat`). Domyślna treść
  „{imię}: nowa wiadomość”; treść wiadomości tylko po włączeniu „Pokaż treść
  w powiadomieniu” (`chatPreview`), a na ekranie blokady tylko po osobnym włączeniu
  (`chatOnLock`); bez tego ekran blokady pokazuje ogólne „Nowa wiadomość”.
  `tools/check-notification-privacy.sh` przechodzi. iOS i przeglądarka: powiadomienie
  tylko przy otwartej aplikacji, co ekran informacji mówi wprost. Licznik nieprzeczytanych
  na przycisku czatu.
- **Wysyłanie** przez `sender.send` z własną kolejką FIFO (ponowienia po 4 s, 15 s, 60 s,
  najwyżej 6 prób, potem stan „Nie wysłano” z przyciskiem ponowienia). Nigdy przez
  `outbox`.
- **F3-7 (pole możliwości w `loc`)** nie jest wdrożone w tym zadaniu; obowiązuje zasada
  „tylko nasze buildy w rodzinie”.
- **F3-8:** `PROTOCOL.md` jest zamrożony. Opis typu `chat` jest w sekcji 10 tego ADR
  i w `starling/docs/CHAT.md`; dopisek do `PROTOCOL.md` wymaga zgody właściciela.

## 1. Problem

Rodzina chce krótkich wiadomości tekstowych w kręgu (makieta 3, zadania F3-1 do F3-8).
Protokół Starling ma jeden strumień wpisów na członka, wspólny limit 240 wpisów na
relayu, ścisły wzrost znaku czasu, okno kluczy domyślnie 1 godzina i 24 godziny
przechowywania na serwerze. Trzeba zdecydować, gdzie czat żyje (ten sam strumień czy
osobna linia), ile tekstu mieści się w jednej wiadomości i co uczciwie obiecujemy
osobie, której telefon był offline.

## 2. Fakty z kodu, na których opiera się ta decyzja

| Fakt | Gdzie |
|---|---|
| `PAD_LEN` 512, `PAD_RESERVE` 24, `MAX_BODY` 2048, `TRAIL_CAP` 240, `TTL_MS` 24 h | `app/js/wire.js:7-12` |
| Każdy plaintext dopełniany do 512 B, inaczej wyjątek „message too large" | `app/js/crypto.js:92-96` |
| `cleanText` usuwa znaki kontrolne (także `\n`) i samotne surogaty | `app/js/wire.js:124-129` |
| Relay widzi tylko `m, alg, pk, epk, e, ts, n, c, sig`; typ `t` jest w szyfrogramie | `app/js/wire.js:180-198`, `relay/src/index.js:217` |
| Relay: 409 przy `ts <= last_ts` członka | `relay/src/index.js:250`, także `:315-317` (konflikt w transakcji) |
| Relay: przycinanie do 240 najnowszych wpisów członka, losowo w 1 na `TRIM_EVERY`=16 postów | `relay/src/index.js:80`, `:298-312` |
| Relay: usuwanie wierszy starszych niż 24 h przy każdym odczycie i zapisie | `relay/src/index.js:102-105`, `:313`, `:340` |
| Klucz główny `(channel, member, ts)` | `relay/schema.sql:29-39` |
| Odczyt: `since` po czasie serwera `srv`, wszystkie wiersze kanału od `since` | `relay/src/index.js:332-353` |
| Wysyłanie: jedna łańcuchowa kolejka, `ts = max(now, last + 1)`, `last` zapisywany przed POST | `app/js/net.js:442-488` (ts: `:450-452`) |
| `lastSentTs` czytany raz i trzymany w pamięci | `app/js/main.js:2147-2169` |
| Klucz epoki wybierany przy wysyłce przed POST, co przesuwa i przycina łańcuch | `app/js/net.js:455-456`, `app/js/ratchet.js:154-166`, `:204-210` |
| Pozycje: znacznik `(e, ts)` rosnący ściśle na członka | `app/js/net.js:126-135`, `:249` |
| Wiadomości kontrolne: osobny zbiór `(member, e, ts)`, 512 wpisów | `app/js/net.js:103-124`, `:230-244` |
| Nieznany typ jest pomijany w całości (od 0.18.0) | `app/js/net.js:91`, `:245-246`; `CHANGELOG.md:213-216` |
| Klienci do 0.17.1 czytają nieznany `t` jak żywą pozycję | `docs/PROTOCOL.md:342-349` |
| Brak klucza dla epoki: wpis po cichu odrzucony | `app/js/net.js:233-237`, `app/js/ratchet.js:174-189` |
| Okno historii: 1, 6 (domyślnie), 36 albo 144 epok po 10 min | `app/js/ratchet.js:25`, `:31-36`; `docs/PROTOCOL.md:116-131` |
| Po powrocie aplikacji przycinanie wstrzymane do 5 min na odczyt zaległości; z zaległości przyjmowany jest tylko re-key, pozycje poniżej `backlogFloor` odrzucane | `app/js/ratchet.js:146-149`, `:261-264`; `app/js/net.js:248`; `app/js/main.js:1820-1832`, `:7484-7488`; `docs/PROTOCOL.md:133-151` |
| Na dysk trafia najstarszy zachowany klucz łańcucha (migawka) | `app/js/ratchet.js:303-310`, `app/js/main.js:312-324` |
| Kolejka ponowień `outbox`: tylko w RAM, **jedno miejsce na typ** (nowszy wpis tego samego typu zastępuje starszy) | `app/js/outbox.js:5-15`, `:58-62`; użycie `app/js/main.js:370-391` |
| Ruch: post po przesunięciu o ponad 25 m, nie częściej niż co 3 s; timer co `cadenceS()` | `app/js/main.js:6277-6289`, `:6404`, `:5385` |
| Kadencja kręgu 15, 60 albo 300 s, domyślnie 15; tryb bezruchu Androida 300 s (`stillSave` domyślnie włączone) | `app/js/circles.js:144`, `app/js/main.js:217-218`, `:300-307` |
| Zapis w spoczynku jest szyfrowany tylko przy włączonej blokadzie aplikacji | `app/js/atrest.js:49-53` |
| Na łączu nie ma wersji aplikacji (tylko `v: 2`) | `app/js/main.js:6460-6475`, `docs/PROTOCOL.md:346-351` |
| Największy obecny komunikat: test trzyma budżet `PAD_LEN - PAD_RESERVE` | `test/crypto.test.mjs:549-583` |

## 3. Odpowiedzi na pytania z D2

### 3.1. Ile tekstu mieści się w 512 B i czy 280 znaków jest realne

Zmierzone prawdziwym `JSON.stringify` i `TextEncoder`, z `ts` = `Number.MAX_SAFE_INTEGER`
jak w teście `PAD_RESERVE`; szczegóły i skrypty w `ADR-001-pomiary.md`. Budżet przyjmuję jak dla
każdego innego komunikatu: `PAD_LEN - PAD_RESERVE` = 488 B, żeby rezerwa została na
przyszłe pola.

Proponowana koperta czatu (E6):

```json
{"v":2,"ts":<ts>,"t":"chat","k":"<11 znaków b64u>","q":<numer kolejny>,"x":"<tekst>"}
```

- `k`: losowy identyfikator wiadomości (64 bity), stały przy ponowieniach; potrzebny,
  bo ponowienie dostaje nowy `ts` (patrz 3.3).
- `q`: numer kolejny czatu u nadawcy, rosnący o 1; pozwala odbiorcy wykryć lukę (3.4).
- `x`: tekst po `cleanText`.

Narzut koperty E6 to 86 B, na tekst zostaje 402 B (bajty po zakodowaniu JSON, czyli
cudzysłów i ukośnik liczą się podwójnie).

| Rodzaj tekstu (długość w jednostkach UTF-16, jak `.length`) | E6, budżet 488 B | E1 `{v,ts,t,x}` |
|---|---|---|
| Sam ASCII | 402 | 441 |
| Typowy polski tekst (próbka: 7,3% liter z diakrytykami, 1,07 B na znak) | 371 | 407 |
| Same polskie litery z diakrytykami (2 B) | 201 | 220 |
| Emoji (4 B, 2 jednostki UTF-16) | 201 jednostek, czyli 100 emoji | 221 |
| Cudzysłowy (`\"`, 2 B) | 201 | 220 |
| CJK (3 B) | 134 | 147 |

280 znaków w kopercie E1: typowy polski tekst zajmuje 351 B (mieści się), tekst z samych
liter z diakrytykami 607 B, 140 emoji 607 B (nie mieszczą się nawet w 512 B).

Wariant z polami `name`, `emoji`, `hue` w każdej wiadomości (E2, E5) kosztuje 127 B
więcej i obniża gwarantowaną długość polskiego tekstu do 137 znaków; nazwę nadawcy
lepiej brać z rejestru członków (otwarte pytanie P4).

Wariant „czat jako pole na istniejącym komunikacie" (styl upstreamu) odpada: największy
obecny komunikat ma 482 B, po dodaniu pustego pola `x` zostaje minus 1 B w budżecie
z rezerwą i 23 B do samego `PAD_LEN`.

Wniosek: **280 znaków jest realne dla zwykłego polskiego tekstu, ale nie jest
gwarantowane**. Ograniczeniem nadrzędnym musi być budżet bajtów (402 B dla pola `x`
w kopercie E6), a 280 znaków może być tylko dodatkowym, miękkim limitem w interfejsie.
Gwarantowana długość dla dowolnego polskiego tekstu z emoji to około 200 znaków.
Uwaga praktyczna: `cleanText` usuwa znak nowej linii, więc wiadomości wieloliniowe
wymagają osobnej decyzji (P5).

Sprawdzone również prawdziwym `sealMessage` i `buildPost`: szyfrogram ma 528 B (tyle
samo co pozycja), pole `c` ma 704 znaki b64u przy limicie 720 w `checkPostShape`, ciało
POST 1063 B przy `MAX_BODY` 2048. Relay nie odróżni czatu od pozycji po rozmiarze.

### 3.2. Wpływ na TRAIL_CAP 240 i czy wiadomość może wypaść przed odbiorem

Najważniejsza obserwacja: wiadomość nadawcy wypiera z relaya **ruch samego nadawcy**,
nie odbiorcy. Każdy członek ma własne 240 wpisów (`relay/src/index.js:306-310`), więc
o tym, jak długo wiadomość leży na serwerze, decyduje to, jak często nadawca publikuje
po jej wysłaniu.

| Nadawca po wysłaniu wiadomości | Wpisów na minutę | Wiadomość leży na relayu około |
|---|---|---|
| Jedzie samochodem lub szybko rowerem (25 m szybciej niż co 3 s, próg 3 s) | 20 | 12 min |
| Rower około 5 m/s | około 16 | 15 min |
| Idzie pieszo | około 7 | 33 min |
| Kadencja 15 s (domyślna, także w bezruchu bez trybu bezruchu, iOS, „stałe wysyłanie") | 4 | 60 min |
| Kadencja 60 s | 1 | 4 h |
| Kadencja 300 s albo tryb bezruchu Androida | 0,2 | 20 h |
| Nadawca nie udostępnia lokalizacji | prawie 0 | do 24 h (TTL) |

Losowe przycinanie (`TRIM_EVERY` 16) daje średnio kilkanaście wpisów zapasu, ale nie
wolno na tym polegać. Wiadomość wypada też najpóźniej po 24 h niezależnie od ruchu.

Odbiorca dostaje wiadomość, jeśli połączy się z relayem, zanim minie **krótszy** z dwóch
czasów: horyzont `TRAIL_CAP` nadawcy (tabela wyżej) i okno kluczy odbiorcy (3.4).
Przykłady przy ustawieniach domyślnych:

1. Telefon dziecka w kieszeni, Android, aplikacja w tle z usługą lokalizacji: odpytuje
   relay co 30 do 60 s (`app/js/net.js:30-40`), więc dostaje wiadomość w ciągu minuty.
   Tu nie ma problemu.
2. Rodzic pisze „będę o 15:30" i od razu jedzie samochodem; telefon dziecka jest bez
   zasięgu 20 minut. Wiadomość znika z relaya po około 12 minutach. **Wypada przed
   odbiorem**, mimo że mieści się w oknie kluczy.
3. Telefon dziecka bez zasięgu 2 godziny, aplikacja działa. Klucze sprzed ponad godziny
   zostały zniszczone przy próbach wysyłki (`app/js/net.js:455-456`). **Wypada** nawet
   wtedy, gdy rodzic siedzi w miejscu z kadencją 300 s.
4. Telefon dziecka wyłączony (bateria) od 12:30 do 14:00, wiadomość o 12:40. Migawka
   łańcucha na dysku pozwala odczytać zaległości, ale obecna reguła przyjmuje z nich tylko
   re-key (`docs/PROTOCOL.md:141-143`). Przy wariancie A bez zmian **wypada**; przy
   wariancie A2 (niżej) zostaje odczytana, o ile nadawca nie wyparł jej ruchem.

Wpływ czatu na pozycje jest pomijalny: każda wiadomość zabiera jedno z 240 miejsc
nadawcy, czyli przy 15 s skraca jego ślad pozycji o 15 s.

### 3.3. Ścisły wzrost ts na członka (409) i wspólna kolejka wysyłki

- Kolejka w `createSender` jest już wspólna i szeregowa (`app/js/net.js:445-488`): każde
  wysłanie czeka na poprzednie, a `ts = max(Date.now(), last + 1)` i zapis `last` przed
  POST gwarantują ścisły wzrost także w tej samej milisekundzie i po cofnięciu zegara.
  Czat **musi** iść przez ten sam `sender.send`; wtedy 409 z powodu kolizji nie powstanie.
  Kryterium F3-3 (czat i pozycja w tej samej milisekundzie) da się sprawdzić testem na
  `createSender` bez zmian w protokole.
- **Nie wolno** używać `outbox` dla czatu w obecnej postaci: ma jedno miejsce na typ
  (`app/js/outbox.js:13-15`, `:58-62`), więc druga wiadomość wysłana w czasie ponawiania
  pierwszej usunęłaby pierwszą. Czat potrzebuje własnej kolejki FIFO (najprościej w RAM,
  jak `outbox`; trwała kolejka to część F3-5 i musi przejść przez `atRestForm`).
- Ponowienie zawsze dostaje nowy `ts` i jest szyfrowane od nowa (`outbox.js:7-9`). Jeśli POST
  dotarł, a odpowiedź zginęła (limit 20 s, `app/js/net.js:464-467`), odbiorca dostanie
  dwie kopie z różnymi `ts`. Dlatego pole `k` i deduplikacja po `(członek, k)`
  w uzupełnieniu do `(członek, e, ts)` z F3-1.
- 409 może też przyjść z przechwyconego wyjątku transakcji (`relay/src/index.js:315-317`);
  klient traktuje to jak zwykły błąd i ponawia z nowym `ts`, co jest poprawne.
- Wiadomość czatu może czekać do 20 s za zawieszonym POST pozycji. Do zaakceptowania.
- Niesprawdzone: czy na Androidzie mogą jednocześnie działać dwa konteksty JS z tą
  samą tożsamością (wątek „headless", `app/js/main.js:5661-5680`). Jeśli tak, oba
  czytają `lastSentTs` osobno i mogą dostać 409. Dotyczy też dzisiejszych pozycji;
  do sprawdzenia w F3-3.

### 3.4. Okno kluczy (1 h) a odczyt czatu

Co widzi osoba, która była offline dłużej niż okno:

- Aplikacja działała bez sieci: przy każdej próbie wysłania pozycji łańcuch przesuwa się
  i niszczy klucze starsze niż okno. Po powrocie sieci wiadomości z epok poza oknem są
  po cichu odrzucane (`app/js/net.js:233-237`). Odbiorca **nie dowie się**, że coś było,
  chyba że dodamy pole `q` i wykrywanie luk.
- Aplikacja była zamknięta lub telefon wyłączony (także zwykły przypadek na iOS):
  migawka trzyma klucze od chwili wyłączenia minus okno. Kod technicznie może odczytać
  zaległości, ale obecna reguła odrzuca wszystko poza re-key spoza bieżącego okna.
- Okno jest ustawieniem użytkownika (10 min, 1 h, 6 h, 24 h). Na „Wysokim ryzyku"
  czat praktycznie wymaga, żeby odbiorca był online.

Czy to jest akceptowalne dla czatu rodzinnego? **Tak, pod warunkiem uczciwego opisu**:
czat w tej aplikacji to krótkie bieżące ustalenia („jestem", „odbieram o 15:30"), a nie
komunikator z gwarancją doręczenia. Do spraw pilnych jest SOS i prośba o meldunek.
Nie jest akceptowalne, żeby wiadomość znikała **po cichu**; dlatego rekomenduję pole `q`
od pierwszej wersji.

Teksty do interfejsu (propozycje dla F3-4, do akceptacji właściciela):

- Pod polem wpisywania lub w opisie czatu: „Wiadomości są szyfrowane. Serwer trzyma je
  najwyżej 24 godziny. Telefon, który był bez internetu dłużej niż godzinę, może ich nie
  dostać."
- Przy wykrytej luce: „Nie udało się odczytać 2 wiadomości od Mamy. Ten telefon był
  prawdopodobnie bez internetu zbyt długo."
- Stan wysłanej wiadomości: „Wysłano" (dotarła na serwer), nigdy „Dostarczono" ani
  „Przeczytano", bo tego nie wiemy.
- Przy ustawieniu historii: „Dłuższa historia pozwala odczytać więcej wiadomości po
  powrocie do sieci, ale zabrany telefon zdradzi więcej."
- Przy archiwum (F3-5): „Wiadomości są zapisane na tym telefonie przez 7 dni. Bez
  blokady aplikacji są zapisane bez szyfrowania." (zgodne z `app/js/atrest.js:49-53`).

Uwaga o prywatności: lokalne archiwum czatu z czasem przechowywania dłuższym niż okno
kluczy osłabia obietnicę „zabrany telefon zdradza ostatnią godzinę" dla treści czatu.
To jest świadomy wybór właściciela (P3), nie szczegół implementacji.

### 3.5. Kompatybilność ze starszymi klientami

- Klienci od 0.18.0 (w tym nasz fork 0.21.0 przed dodaniem czatu) pomijają nieznany typ
  w całości: nie zmieniają statusu, znacznika ani rekordu nadawcy
  (`app/js/net.js:245-246`, `CHANGELOG.md:213-216`). Nie zobaczą wiadomości, ale nic im
  się nie zepsuje.
- Klienci do 0.17.1 czytają nieznany `t` jak żywą pozycję, co zastępuje SOS na ich
  ekranie (`docs/PROTOCOL.md:346-349`). Kodu 0.17.1 nie sprawdziłem: repozytorium forka
  ma jeden commit (`8ec6dad`), więc opieram się na dokumentacji i CHANGELOG.
- Na łączu nie ma wersji aplikacji, więc nadawca nie wie, czy w kręgu jest stary klient.
- Relay nie wymaga zmian w wariancie A; działa z dowolnym relayem v2.

Wniosek dla F3-7: w rodzinie instalujemy wyłącznie nasze buildy (wszystkie od 0.21.0),
więc ryzyko 0.17.1 jest praktycznie zerowe, jeśli nikt nie dołączy z oryginalnym starym
Starlingiem. Tanie zabezpieczenie: nowe **pole** (nie typ) w `loc`, na przykład `cap`
lub `av`, które starsi klienci ignorują. Dzięki niemu czat może pokazać „Ola ma starszą
wersję aplikacji i nie zobaczy wiadomości". To pole zmienia budżet największego
komunikatu, więc test `PAD_RESERVE` musi je objąć (zostało 30 B, `ADR-001-pomiary.md`).

## 4. Warianty

Relay **nie widzi typu**: `t` jest w szyfrogramie, rozmiar jest stały, a do relaya trafia
tylko dziewięć pól koperty (`app/js/wire.js:180-198`). „Osobne zliczanie TRAIL_CAP dla
czatu po stronie relaya" jest więc niemożliwe bez ujawnienia typu relayowi. Każdy sposób
ujawnienia (jawne pole, osobna ścieżka, osobna tabela) mówi serwerowi, kiedy i ile rodzina
pisze, i daje mu możliwość wybiórczego wstrzymywania samych wiadomości. W wariancie A
relay tego nie potrafi, bo czat wygląda jak pozycja.

| Wariant | Co zmienia | Rozwiązuje wypieranie przez TRAIL_CAP | Rozwiązuje okno kluczy | Rusza pliki zamrożone | Koszt | Ryzyko |
|---|---|---|---|---|---|---|
| **A** | Typ `t:"chat"` w istniejącym strumieniu, koperta E6, własna kolejka FIFO, dedup, `q` | Nie | Nie | Nie (`PROTOCOL.md` dostaje opis typu: patrz uwaga niżej) | Mały: `net.js`, `main.js`, `ui.js`, testy | Wiadomości gubią się przy dłuższym braku sieci; łagodzone wykrywaniem luk |
| A1 | Relay przycina do własnego, konfigurowalnego limitu (np. 1440 = 6 h przy 15 s) zamiast `TRAIL_CAP` | Częściowo (w samochodzie 72 min zamiast 12) | Nie | Nie dotyka podpisów ani przypinania; odbiega od stałej opisanej w `PROTOCOL.md:41`, więc wymaga zgody | Mały w kodzie; odczyt `since=0` przy każdym zimnym starcie aplikacji rośnie z około 1,3 MB do 7,6 MB (6 osób) | Transfer danych na telefonie dziecka, wolniejszy start |
| A2 | Odczyt zaległości przyjmuje także czat z kluczy wstrzymanych przy powrocie (nie tylko re-key) | Nie | Tak, dla telefonu wyłączonego lub zamkniętej aplikacji; nie dla działającej aplikacji bez sieci | Zmienia regułę opisaną w `PROTOCOL.md:141-143`; kryptografia bez zmian | Mały: `net.js:248` plus testy | Pokazuje treść starszą niż okno, które użytkownik wybrał; klucze i tak były na dysku, ale obietnica „nie pokazujemy starszego niż okno" się zmienia |
| A3 | Osobna ścieżka lub tabela relaya dla czatu z własnym limitem | Tak | Nie | `handlePost` z podpisami i przypinaniem trzeba rozdzielić lub powielić | Średni | Relay poznaje typ i rytm rozmowy; wybiórcze tłumienie czatu. **Odradzam** |
| B | Osobny kanał czatu z nowej etykiety HKDF z kotwicy generacji, ten sam łańcuch kluczy | Tak (czat ma własne 240 wpisów, granicą jest 24 h) | Nie | Tak: `PROTOCOL.md`, nowa etykieta, wektory, podbicie wersji; prawdopodobnie `ratchet.js` lub `crypto.js` | Duży: drugi poller, przypinanie w drugim kanale, re-key przenosi oba kanały | Podwojona liczba odczytów; przy 16 osobach przekracza domyślny limit 240 zapytań na minutę z jednego adresu (`relay/src/index.js:74-79`); dla rodziny 6 osób mieści się |
| B+ | B z osobnym łańcuchem lub dłuższym oknem kluczy tylko dla czatu (np. 24 h) | Tak | Tak | Tak, jak B, plus zmiana modelu zagrożeń | Duży | Świadome osłabienie tajności przyszłej dla treści czatu; wymaga recenzji kryptograficznej |
| Pole | Tekst jako pole na istniejącym komunikacie | Nie | Nie | Nie | Mały | **Niewykonalne**: zostaje 23 B do `PAD_LEN` (3.1) |
| C | A teraz, A1, A2 albo B dopiero po pomiarach | Zależnie od wyniku | Zależnie od wyniku | Początkowo nie | Mały na start | Wymaga zbierania pomiarów i dyscypliny w decyzji |

Uwaga o `PROTOCOL.md`: dodanie typu `chat` nie zmienia kryptografii ani formatu na łączu,
ale `docs/PROTOCOL.md:338` wymienia zamkniętą listę typów, a `:346-349` mówi wprost, że
nowe funkcje jadą jako pola, nie jako typy. Wariant A jest więc **świadomym odejściem
od reguły upstreamu**, uzasadnionym tym, że pole się nie mieści. Wymaga zgody
właściciela i wpisu w `PROTOCOL.md` w F3-8, bez podbijania wersji protokołu i bez nowych
wektorów (kryptografia bez zmian). Odejście jest bezpieczne tylko przy braku klientów do
0.17.1 w kręgu (3.5).

Podniesienie `TRAIL_CAP` w `wire.js` (wariant „podniesiony limit" z D2) odrzucam:
`wire.js` jest zamrożony, ta sama stała przycina ślad pozycji w pamięci klienta
(`app/js/net.js:277`) i dotyczyłaby wszystkich użytkowników upstreamu. A1 osiąga to samo
po stronie naszego relaya bez ruszania `wire.js`.

## 5. Rekomendacja

**Wariant C, doprecyzowany:**

1. Teraz (F3-1 do F3-8): **A** z kopertą E6 `{v, ts, t:"chat", k, q, x}`, bez zmian
   w kryptografii, w `wire.js`, w `crypto.js` i w relayu.
   - Tekst ograniczony budżetem bajtów (402 B dla `x` po zakodowaniu JSON); 280 znaków
     tylko jako miękki limit w interfejsie z licznikiem, który pokazuje faktyczne miejsce.
   - Czat idzie przez `sender.send`, ma własną kolejkę FIFO, nigdy przez `outbox`.
   - Odbiór: osobna gałąź w `ingest` przed pominięciem nieznanych typów, poza
     znacznikiem pozycji i poza `rec.ts`; deduplikacja po `(członek, e, ts)` i
     `(członek, k)`, oparta na archiwum, bo po przeładowaniu poller czyta okno od nowa
     (`app/js/net.js:304-315`).
   - Wykrywanie luk z `q` i uczciwe komunikaty z 3.4.
   - F3-7: zasada „tylko nasze buildy w rodzinie" plus pole możliwości w `loc`.
2. A2 i A1 są przygotowane jako tanie poprawki, ale **nie wchodzą bez pomiarów i zgody
   właściciela**. Kolejność, jeśli pomiary pokażą straty: najpierw A2 (pomaga przy
   wyłączonym telefonie i iOS, nic nie kosztuje w transferze), potem A1.
3. B lub B+ tylko wtedy, gdy pomiary pokażą straty, których A1 i A2 nie usuwają, albo gdy
   właściciel zdecyduje, że czat ma przetrwać dłuższy brak sieci kosztem tajności
   przyszłej. To decyzja o kryptografii, nie o wygodzie.

Dlaczego nie B od razu: B nie rozwiązuje okna kluczy (głównej przyczyny strat przy
długim braku sieci), kosztuje zmianę zamrożonych plików, wektory i podwojony ruch,
a jedyną jego przewagą nad A plus A1 jest niezależność czatu od ruchu nadawcy. Ta
przewaga ma znaczenie tylko wtedy, gdy pomiary ją pokażą.

## 6. Konsekwencje dla zadań F3

| Zadanie | Co wynika z tego ADR |
|---|---|
| F3-1 | Gałąź `t === "chat"` w `ingest` przed `POSITION_KINDS` (`app/js/net.js:245-246`), bez `accepted()` i `rec.ts`; dedup `(członek, e, ts)` i `(członek, k)`; trwały dedup przez archiwum; nadawca nieprzypięty przed tym przebiegiem traktowany jak przy pozycjach (TOFU), nie jak re-key |
| F3-2 | Limit nadrzędny w bajtach (402 B dla `x` w E6); 280 znaków jako limit miękki; test: 280 znaków typowego polskiego tekstu przechodzi, tekst z samych liter z diakrytykami jest obcinany do budżetu z komunikatem; test w stylu `test/crypto.test.mjs:549-583` dla koperty czatu |
| F3-3 | Test na `createSender`: czat i pozycja w tej samej milisekundzie dają `ts` i `ts + 1`, oba przyjęte; osobna kolejka FIFO; sprawdzić kwestię wielu kontekstów JS |
| F3-4 | Teksty z 3.4; stan „Wysłano"; komunikat o luce |
| F3-5 | Archiwum przez `atRestForm`; czas przechowywania jako świadomy wybór (P3); czyszczenie przy panic wipe |
| F3-6 | Bez zmian względem tego ADR |
| F3-7 | Zasada jednego źródła buildów plus pole możliwości w `loc`, objęte testem `PAD_RESERVE` |
| F3-8 | Opis typu `chat`, kolejności sprawdzeń i odejścia od reguły „nowe funkcje jako pola" w `PROTOCOL.md` (za zgodą); bez wektorów, bo kryptografia bez zmian |

## 7. Plan pomiarów, które rozstrzygną C

Zasada: zero telemetrii. Wszystko liczone lokalnie na telefonach albo na naszym relayu
z danych, które relay i tak ma (czasy i liczności, nigdy treść), i odczytywane ręcznie
przez właściciela. Szczegóły zapytań w `ADR-001-pomiary.md`, część 3.

| Pomiar | Skąd | Co mówi |
|---|---|---|
| M1. Horyzont relaya na członka: `max(srv) - min(srv)` i liczba wierszy, próbkowane co godzinę | zapytanie SQL na relayu | Jak długo w praktyce leży wiadomość każdego nadawcy |
| M2. Przerwy w publikowaniu na członka (różnice kolejnych `srv`) | zapytanie SQL na relayu | Jak często i jak długo telefony są bez sieci |
| M3. Luki w `q` po stronie odbiorcy, z podziałem: brak klucza (licznik w `net.js:236-237`) i brak na relayu | licznik lokalny w raporcie udostępniania | Ile wiadomości ginie i z jakiej przyczyny |
| M4. Opóźnienie: czas odbioru minus `ts` | licznik lokalny | Czy czat jest „bieżący" |
| M5. Liczba wiadomości na dzień | licznik lokalny | Czy czat zabiera zauważalne miejsce w strumieniu |

Okres: 14 dni zwykłego życia rodziny, ustawienia domyślne.

Reguła decyzji (proponowana, do zatwierdzenia):

- Luki poniżej 1% wiadomości i żadnej utraty przy odbiorcy offline krócej niż 1 h:
  zostajemy przy A.
- Straty głównie przy odbiorcy offline krócej niż okno, a nadawca w ruchu (M1 krótszy
  niż M2): A1, a jeśli koszt `since=0` okaże się za duży, B.
- Straty głównie przy telefonie wyłączonym lub zamkniętej aplikacji: A2.
- Straty głównie przy działającej aplikacji bez sieci dłużej niż okno: tylko B+ lub
  dłuższe okno historii; to pytanie do właściciela o tajność przyszłą, nie o kod.

## 8. Otwarte pytania do właściciela

- P1. Czy akceptujesz odejście od reguły upstreamu „nowe funkcje jako pola, nie jako
  typy" (typ `chat`) przy zasadzie, że w rodzinie działają tylko nasze buildy?
- P2. Limit długości: 280 znaków miękko plus twardy budżet bajtów (rekomendacja), czy
  twarde 200 znaków gwarantowane dla każdego polskiego tekstu z emoji?
- P3. Jak długo archiwum czatu ma leżeć na telefonie (domyślnie i maksymalnie) i czy
  czat ma być dostępny bez włączonej blokady aplikacji, skoro wtedy archiwum jest
  zapisane bez szyfrowania?
- P4. Nazwa nadawcy: z rejestru członków (tańsze, rekomendacja) czy w każdej wiadomości
  (127 B mniej na tekst)? Dotyczy rodzica, który tylko patrzy i nigdy nie udostępnia.
- P5. Czy wiadomości mogą mieć wiele linii (`cleanText` dziś usuwa `\n`, a każda nowa
  linia to 2 B po zakodowaniu)?
- P6. Czy zgadzasz się na wariant A2 (odczyt czatu z zaległości) jako pierwszą poprawkę,
  jeśli pomiary pokażą straty przy wyłączonych telefonach?
- P7. Czy rozważasz dłuższe okno historii dla telefonu dziecka (6 h) jako zwykłe
  ustawienie zamiast zmian w protokole?
- P8. Czy w pierwszej wersji potrzebne są odpowiedzi na konkretną wiadomość (pole `re`,
  około 33 B mniej na tekst)?

## 9. Czego nie sprawdzono

- Kodu klientów 0.17.1 i starszych (brak historii w repozytorium forka).
- Zachowania na prawdziwym telefonie: częstotliwość postów w ruchu wyliczona z progów
  w kodzie (25 m, 3 s, timer), nie zmierzona; częstotliwość poprawek GPS w usłudze
  Androida nie była sprawdzana.
- Czy na Androidzie mogą jednocześnie wysyłać dwa konteksty JS (3.3).
- Testy forka nie były uruchamiane w ramach tego zadania; pomiary używały tylko modułów
  `wire.js`, `crypto.js` i `ratchet.js` zaimportowanych do odczytu.
- Zachowania czatu przy re-key (wiadomości w locie na kanale poprzedniej generacji);
  do opisania w F3-8.

## 10. Opis protokołu typu `chat` (stan wdrożenia)

Ten opis odpowiada kodowi w `app/js/chat.js` i `app/js/net.js` na gałęzi
`zadanie/F3-czat`. Wersja angielska: `starling/docs/CHAT.md`.

**Koperta.** Wewnątrz szyfrowanego postu członka (ten sam ratchet, ta sama ramka, to samo
dopełnienie do 512 B co pozycja):

```
{"v":2,"ts":<ms>,"t":"chat","k":"<11 znaków base64url>","q":<liczba >= 1>,"x":"<tekst>"}
```

- `ts` nadaje `createSender` (`max(teraz, ostatni + 1)`), więc czat i pozycja w tej samej
  milisekundzie dostają `ts` i `ts + 1`; relay nie odpowie 409.
- `k`: 8 losowych bajtów, identyfikator wiadomości, służy do deduplikacji ponowień.
- `q`: numer kolejny wiadomości czatu tego urządzenia w tym kręgu, od 1. Służy do wykrywania
  luk. Licznik żyje w archiwum; po reinstalacji zaczyna się od 1.
- `x`: tekst, jedna linia, po `cleanText`, najwyżej 402 B po zakodowaniu JSON. Wysyłający
  odrzuca dłuższy tekst; odbiorca przycina na 1024 znakach, zanim cokolwiek sprawdzi.
- Brak nazwy nadawcy: odbiorca bierze ją z rejestru członków (P4).
- Relay nie widzi typu: szyfrogram ma tę samą długość co pozycja.

**Kolejność sprawdzeń przy odbiorze** (w `ingest` w `net.js`, po odszyfrowaniu
i weryfikacji podpisu, tak samo jak dla pozycji):

1. Gałąź `t === "chat"` stoi **przed** pominięciem typów pozycji. Nie przechodzi przez
   `accepted()`, nie zmienia `rec.ts`, statusu ani znacznika na mapie. Wiadomość ze starszym
   `ts` niż ostatnia pozycja nie jest odrzucana.
2. Reguła zaległości: post z epoką poniżej `backlogFloor` (zaległości sprzed dołączenia)
   jest pomijany, jak wiadomości kontrolne.
3. Deduplikacja w pamięci po `(członek, e, ts)` (ograniczony zbiór, czyszczony przy
   `clear()`), potem w archiwum po `(członek, k)` oraz `(członek, e, ts)`. Archiwum daje
   deduplikację po przeładowaniu, gdy poller czyta okno od nowa.
4. `readChat` sprawdza kształt (`k`, `q`, niepusty `x`); błędny wpis jest cicho pomijany.
5. Luki: dla każdego nadawcy `hi` = najwyższe `q`. `q > hi + 1` tworzy lukę `hi+1..q-1`;
   spóźniona wiadomość zmniejsza lub dzieli lukę; `q === 1` poniżej `hi` bez luki oznacza
   nowy początek (reinstalacja). Pierwsza wiadomość od nadawcy niczego nie zgłasza.
6. Nadawca nieprzypięty przed tym przebiegiem: tak samo jak przy pozycjach (TOFU), czat nie
   ma własnej ścieżki zaufania.

**Re-key.** Czat jedzie na kanale bieżącej generacji. Rejestr okresu łaski (poller starej
generacji po re-key) nie ma `onChat`, więc wiadomość czatu wysłana jeszcze na kanale
poprzedniej generacji w czasie wyścigu re-key jest pomijana; odbiorca zobaczy ją jako lukę
przy następnej wiadomości tego nadawcy. To świadome uproszczenie do sprawdzenia
w praktyce. Archiwum jest kluczowane identyfikatorem tego urządzenia w kręgu, który
re-key nie zmienia.

**Wysyłanie.** `chatFields` buduje pola, `sender.send` szyfruje i publikuje. Własna kolejka
FIFO: jedna wiadomość naraz, kolejna dopiero po przyjęciu poprzedniej; ponowienie wysyła
te same `k` i `q`, więc odbiorca nie pokaże jej dwa razy. Wiadomość niewysłana przed
zamknięciem aplikacji wraca po starcie jako „Nie wysłano” i czeka na dotknięcie
„Spróbuj ponownie”.
