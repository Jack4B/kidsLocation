# Wygląd i zasady interfejsu

Makiety (jasny i ciemny motyw, pięć plansz) leżą w prywatnym artefakcie Claude:
<https://claude.ai/artifact/UPvDtJ2VsAXsDvkiZV38Vr>. Otworzy go tylko właściciel konta.
Jeśli modele mają je oglądać, właściciel eksportuje plansze do obrazów i wrzuca je do
`docs/makiety/` w tym repozytorium.

Dane na makietach są przykładowe (osoby, godziny, poziomy baterii). Nie traktuj ich jak
wymagań.

## Kierunek

Aplikacja jest spokojna, czytelna na jednym rzucie oka i szczera wobec użytkownika.
Mapa jest głównym ekranem; wszystko inne jest o jeden dotyk stąd. Jeden element ma być
charakterystyczny: przerywany okrąg miejsca z awatarem osoby w środku. Reszta jest cicha.

Czego unikamy: kremowego tła z terakotową ozdobą, czarnego tła z jedną jaskrawą barwą,
identycznych kart z jednym cieniem, wielkich liter w etykietach, numerowanych list tam,
gdzie nie ma kolejności.

## Tokeny: motyw jasny

| Nazwa | Wartość | Użycie |
|---|---|---|
| tło | `#F1F4F2` | tło ekranu |
| powierzchnia | `#FFFFFF` | arkusze, karty, pasek nawigacji |
| powierzchnia 2 | `#E8EDEA` | karty wewnątrz arkusza, pola |
| tekst | `#14201C` | główny tekst |
| tekst pomocniczy | `#4B5A54` | opisy, czasy |
| linia | `#D3DBD7` | obramowania |
| akcent | `#0B7A64` | akcja główna, zaznaczenie |
| tekst na akcencie | `#FFFFFF` | |
| akcent blady | `#D6EFE8` | wskaźnik zaznaczenia, okręgi miejsc |
| SOS | `#C62B22` | przycisk SOS, błędy krytyczne |
| tekst na SOS | `#FFFFFF` | |
| ostrzeżenie | `#A85A00` | niska bateria, brak potwierdzenia |

Mapa jasna: ląd `#E9EEEA`, woda `#BDD8E6`, park `#CDE5D2`, droga `#FFFFFF`,
obrys drogi `#D0D8D4`, budynki `#DCE3DF`, napisy `#5B6B65`.

## Tokeny: motyw ciemny

| Nazwa | Wartość |
|---|---|
| tło | `#12141C` |
| powierzchnia | `#1C2030` |
| powierzchnia 2 | `#272C41` |
| tekst | `#EEF1F6` |
| tekst pomocniczy | `#A9B1C4` |
| linia | `#30364C` |
| akcent | `#45D9B5` |
| tekst na akcencie | `#06251D` |
| akcent blady | `#17372F` |
| SOS | `#FF7A6E` |
| tekst na SOS | `#2A0705` |
| ostrzeżenie | `#F0B35A` |

Mapa ciemna: ląd `#1A1E2B`, woda `#17283A`, park `#1B3027`, droga `#2D3450`,
obrys drogi `#12141C`, budynki `#232839`, napisy `#8C95AD`.

Kolory osób (te same w obu motywach, tekst ciemny `#14201C` na nich): różowy `#F29BB8`,
bursztynowy `#F5C04A`, fioletowy `#B7A6F5`. Pozycja własna użytkownika to akcent, nie
kolor osoby. Osoby odróżnia litera i imię, nie sam kolor.

## Typografia

- Nagłówki, imiona, duże liczby: Bricolage Grotesque, wagi 500 i 700.
- Tekst i opisy: Figtree, wagi 400 do 700.
- Skala: 26 do 30 (tytuł ekranu), 20 (nagłówek arkusza), 17 do 18 (sekcja), 15 do 15,5
  (tekst), 13 do 14 (opisy), 12,5 (najmniejszy dopuszczalny, plakietki i podpisy).
- Zdania z wielką literą na początku, bez wersalików i bez „→" doklejonego do przycisków.
- Czcionki pakujemy lokalnie (F2-7); makiety ładowały je z Google Fonts tylko dla wygody.

## Układ i nawigacja

- Telefon 390 na 844. Dolna nawigacja o wysokości 80: Mapa, Czat, Miejsca, Krąg.
  Zaznaczony element ma blady wskaźnik 64 na 32 i pogrubioną etykietę.
- Mapa: po lewej na górze przełącznik kręgu (nazwa, liczba osób, ikona kłódki). Po prawej
  kolumna okrągłych przycisków 44: styl mapy, „Pokaż wszystkich", „Moja pozycja".
- Dolny arkusz nad nawigacją w trzech położeniach. Najniższe pokazuje stan udostępniania
  („Udostępniasz", przycisk wstrzymania) i poziomą listę kart osób; ucięta trzecia karta
  zdradza, że lista się przewija.
- SOS: czerwona pigułka „Przytrzymaj SOS" nad arkuszem po prawej, w zasięgu kciuka.
  Nigdy nie wysyła od jednego dotknięcia.
- Znacznik osoby to awatar z imieniem i czasem ostatniego sygnału w podpisie. Brak sygnału:
  awatar wyszarzony, przerywana obwódka, podpis z czasem.

## Zasady, które nie podlegają negocjacji

1. Mapa startuje na pozycji użytkownika w widoku ulic.
2. Każde zaznaczenie na mapie ma imię i czas. Żadnych anonimowych kropek poza własną pozycją.
3. Cel dotyku co najmniej 48 dp (przyciski ikon mogą mieć 44 z odstępem, ale nigdy mniej).
4. Kontrast tekstu co najmniej 4,5 do 1 (3 do 1 od 24 px). Sprawdzaj w obu motywach.
5. Kolor nigdy nie niesie znaczenia sam: zawsze razem z ikoną lub słowem
   (na przykład ostrzeżenie to ikona tarczy ze znakiem i tekst „Porównaj numer").
6. Prawdziwe elementy: `button`, `a`, `input` z `label`. Przyciski z samą ikoną mają etykietę.
7. Szanuj ustawienie ograniczenia ruchu. Animacje tylko tam, gdzie pokazują zmianę stanu.
8. Interfejs mówi, czego nie robi: limit historii, 24 godziny na serwerze, brak działania
   w tle na iOS, licznik znaków w czacie.

## Ekrany

Zrobione (makiety): Mapa, Osoba, Czat, Krąg, Zasady. Z F2-9 (szkic do recenzji): Miejsca,
aktywny SOS i alert przychodzący, zaproszenie i QR, pierwsze uruchomienie z pytaniem o
uprawnienia lokalizacji; opis w sekcji „Ekrany z F2-9" na końcu pliku.

## Teksty

Pisz od strony użytkownika, nazywaj rzeczy tak, jak zrozumie je domownik. „Udostępniasz",
nie „transmisja włączona". Przycisk mówi, co się stanie: „Napisz", „Poproś o check-in",
„Wyczyść dane z tego telefonu". Ta sama czynność ma tę samą nazwę na całej ścieżce. Błędy
mówią, co się stało i co zrobić, bez przeprosin.

## Lista kontrolna wdrożenia ekranu

- [ ] Wygląda poprawnie w motywie jasnym i ciemnym
- [ ] Wszystkie teksty są w katalogu tłumaczeń, nie na sztywno w kodzie
- [ ] Cele dotyku, kontrast i etykiety sprawdzone (zasady 3 do 6)
- [ ] Działa przy dużej czcionce systemowej i na wąskim ekranie
- [ ] Nie dodano żądań do stron trzecich

## Ekrany z F2-9: Miejsca, aktywny SOS, zaproszenie i QR, pierwsze uruchomienie

Makiety: `docs/makiety/makiety-F2-9.html` (jeden samodzielny plik, oba motywy obok siebie)
i zrzuty w `docs/makiety/png/`. Odwołania do kodu dotyczą forka `Jack4B/starling`
(stan z 14.10.2026), numery linii są przybliżone i mogą się przesunąć przy scalaniu z upstreamem.
Dane na makietach są przykładowe, tak jak na pierwszych pięciu planszach.

Wspólne zasady tych ekranów:

- Przyciski i pola mają co najmniej 48 dp wysokości, także pojedyncze opcje w przełącznikach
  segmentowych (Promień, Powiadomienia). Okrągłe przyciski na mapie zostają 44 z odstępem.
- Kolor nie niesie znaczenia sam: SOS ma zawsze ikonę trójkąta i słowo „SOS", strefa
  prywatności ma ikonę tarczy i nazwę, ostrzeżenie o iPhonie ma ikonę i słowo „iPhone".
- Tekst w kolorze akcentu nie stoi na powierzchni 2 w motywie jasnym (4,45 do 1, poniżej progu).
  Przyciski tekstowe na powierzchni 2 mają kolor tekstu, nie akcentu.
- Teksty o osobach unikają form zależnych od płci i odmiany imion: „Kuba wysyła SOS",
  nie „SOS od Kuby"; „osoba, która Cię zaprosiła".

### Miejsca

Zakładka Miejsca w dolnej nawigacji. Fork trzyma miejsca wyłącznie w telefonie, który je
zapisał, i nigdy ich nie wysyła (`app/js/places.js`, linie 1 do 14). To jest najważniejsza
informacja na tym ekranie i stoi na górze.

**Lista i dodawanie** (makieta 1.1)

- Tytuł „Miejsca", pod nim szara notatka z kłódką: „Miejsca są zapisane tylko na tym telefonie.
  Serwer i reszta kręgu nie wiedzą, że istnieją."
- Karta z wierszami miejsc (wiersz co najmniej 64): ikona w bladym kółku (dom dla miejsca
  „Dom", pinezka dla pozostałych), nazwa, podpis „promień · powiadomienia" (na przykład
  „250 m · wejście i wyjście", „100 m · tylko wejście", „500 m · bez powiadomień"). Gdy miejsce
  ma strefę prywatności, pod spodem ikona tarczy i „Strefa prywatności". Po prawej awatary osób,
  które są teraz w miejscu (etykieta dostępności „Teraz tutaj: Marta"), i strzałka do edycji.
  Fork liczy to w `whoIsAt` (`app/js/main.js` około 7005): osoba bez świeżego sygnału się nie liczy.
- Pod listą pole „Dodaj kolejne" (placeholder „Np. Trening", przy pustej liście „Dodaj pierwsze
  miejsce" i placeholder „Dom") oraz dwa przyciski: „Moja pozycja" i „Wskaż na mapie".
  W forku: „Save my current spot" i „Pick on the map" (`app/js/ui.js` około 1982 i 1988).
  Bez nazwy: komunikat „Najpierw nazwij miejsce." Bez pozycji: „Nie ma jeszcze Twojej pozycji.
  Włącz udostępnianie albo wskaż miejsce na mapie."
- Stopka: „4 z 10 miejsc. Powiadomienia o wejściu i wyjściu przychodzą tylko na ten telefon.
  Na iPhonie tylko przy otwartej aplikacji." Limit 10 miejsc i 24 znaków nazwy to `MAX_PLACES`
  i `MAX_NAME_LEN` (`places.js` linie 20 i 21). Po osiągnięciu limitu pole znika i zostaje zdanie
  „To już wszystkie: limit to 10 miejsc." (`ui.js` około 1961).

**Edycja miejsca** (makieta 1.2)

- Góra: wycinek mapy, okrąg wejścia przerywany w kolorze akcentu z awatarem osoby w środku
  (charakterystyczny element z kierunku wyglądu), kropkowany okrąg wyjścia, plakietka z nazwą,
  legenda „Wejście: 250 m" i „Wyjście: od 410 m". Przycisk „Wróć do listy miejsc".
- Arkusz: pole „Nazwa" z licznikiem „6 z 24"; „Promień" jako trzy opcje 100 m, 250 m, 500 m
  (`PLACE_RADII`, domyślnie 250, `places.js` linie 18 i 19) i wyjaśnienie: „Wejście liczy się
  w okręgu 250 m, wyjście dopiero od około 410 m. Dzięki temu drgania GPS nie wysyłają
  fałszywych powiadomień." Granica wyjścia to promień razy 1,4 plus 60 m (`EXIT_FACTOR`,
  `EXIT_PAD_M`), więc tekst zmienia się z promieniem: 200 m, 410 m, 760 m.
- „Powiadomienia": Oba, Wejście, Wyjście, Wyłączone (`PLACE_ALERTS`, `places.js` linia 37;
  etykiety w `ui.js` około 1838).
- Przełącznik „Strefa prywatności" z opisem „Gdy tu jesteś, krąg widzi tylko środek miejsca.
  SOS zawsze wysyła dokładną pozycję." (`fenceSnap`, `places.js` linia 98; wyjątek dla SOS jest
  w tej funkcji).
- „Usuń miejsce" jako obrysowany przycisk w kolorze SOS. Zmiany zapisują się od razu, jak
  w forku (`openPlaces`, `main.js` około 6958), więc nie ma przycisku „Zapisz".
- Fork nie pozwala przesunąć środka istniejącego miejsca. Zmiana położenia to usunięcie
  i dodanie na nowo (patrz lista decyzji).

**Wskazanie na mapie** (makieta 1.3)

- Pełna mapa z celownikiem i podglądem okręgu 250 m, plakietka „Basen, 250 m".
- Baner u góry: „Dotknij mapy tam, gdzie jest Basen." i „Albo przesuń mapę i użyj jej środka.",
  przyciski „Użyj środka mapy" i „Anuluj". W forku baner `banner-pick` i tekst „Tap the map where
  {name} is." (`startPlacePick`, `main.js` około 7017).
- Nad nawigacją podpowiedź: „Promień 250 m. Zmienisz go po zapisaniu."
- Po zapisaniu komunikat jak w forku: „Zapisano: Basen. Wie o tym tylko ten telefon."

### Aktywny SOS

SOS wysyła się przytrzymaniem przez 1,2 s (`ui.holdToFire`, `main.js` około 734). Krótkie
dotknięcie pokazuje tylko podpowiedź „Przytrzymaj, aby wysłać SOS". Wysłanie włącza
udostępnianie, jeśli było wyłączone, i przełącza wysyłanie pozycji na co 15 sekund
(`fireSos`, `main.js` około 6639).

**U osoby wysyłającej** (makieta 2.1, telefon Kuby)

- Na mapie: własna pozycja w czerwonym okręgu i plakietka „Ty, SOS" (ikona trójkąta).
- Stały pasek u góry w kolorze SOS: „SOS aktywny od 14:32", pod spodem „Krąg widzi Twoją pozycję
  na żywo". Rola `status`, czytnik ekranu ogłasza zmianę.
- Arkusz rozwija się sam do połowy (jak w forku) i pokazuje: nagłówek „SOS jest aktywny", tekst
  „Krąg dostał alarm i widzi, gdzie jesteś. Gdy wszystko jest w porządku, odwołaj SOS. Krąg
  dostanie wtedy wiadomość, że wszystko u Ciebie w porządku.", stan dostarczenia „Dostarczono do
  kręgu o 14:32" i „Pozycja idzie co 15 sekund, także przy wygaszonym ekranie".
- Główny przycisk: „Wszystko w porządku, odwołaj SOS" (52 wysokości). W forku odwołanie to
  check-in (`doCheckin`, `main.js` około 6582), po nim komunikat „SOS odwołany. Krąg widzi, że
  dajesz znać." W forku ten przycisk to sam znak zaznaczenia obok przycisku SOS; makieta daje mu
  pełne słowa.
- Drugi przycisk: „Pomoc spoza kręgu", pod nim „Link dla kogoś obok, bez aplikacji. Działa 6
  godzin." Fork tworzy taki link automatycznie przy SOS (`startBeaconForSos`, `BEACON_TTL_MS`,
  `main.js` około 6714; arkusz `openHelpSheet`, `ui.js` około 1274).
- Stan „nie dostarczono": w miejscu „Dostarczono..." ikona ostrzeżenia i „SOS jeszcze nie
  dotarł. Ponawiam." (fork: „SOS not delivered yet. Starling keeps trying.").
- Brak SOS bez potwierdzenia: odwołanie nie wymaga przytrzymania, bo jest bezpieczną akcją.

**U odbiorcy, w aplikacji** (makieta 2.2, telefon Marty)

- Na mapie znacznik osoby z czerwoną obwódką, czerwonym okręgiem i małym trójkątem na awatarze,
  podpis „Kuba, SOS, 10 s temu" (imię i czas, zgodnie z zasadą 2).
- Karta alarmu na górze arkusza (rola `alert`): czerwony nagłówek z trójkątem „Kuba wysyła SOS",
  treść „Od 14:32. Pozycja na żywo jest na mapie i zostaje tam, dopóki Kuba nie odwoła SOS.",
  ostatni sygnał i bateria. Gdy telefon nadawcy umilknie, treść jak w forku: „Telefon Kuby przestał
  nadawać 4 min temu. Na mapie jest ostatnia pozycja." (`alertItems`, `main.js` około 950).
- Przyciski: „Pokaż na mapie" (główny), „Napisz" (czat z F3), „Rozumiem, ukryj kartę" i notatka
  „Ukrycie karty nie wyłącza alarmu. Znacznik SOS zostaje na mapie."
- Po odwołaniu: komunikat „Kuba daje znać, że wszystko w porządku. SOS odwołany." (fork:
  „{who} checked in", „The SOS is cleared.", `main.js` około 7073).

**U odbiorcy, ekran blokady** (makieta 2.3)

- Powiadomienie na kanale „Alarmy" z dźwiękiem dzwonka, przechodzi przez tryb Nie przeszkadzać.
  Tytuł „Starling", treść „Otwórz Starling teraz." Bez imienia i bez miejsca, bo fork celowo nie
  wkłada treści do powiadomień (`android/.../Events.kt` linie 42 do 45, `res/values/strings.xml`
  linie 9 i 10). Polski katalog musi przetłumaczyć te teksty natywne osobno (F2-6).
- iPhone: alarm dzwoni tylko przy otwartej aplikacji. Ta informacja jest w pierwszym uruchomieniu
  i w opisie kręgu; nie da się jej pokazać na ekranie blokady.

### Zaproszenie i kod QR

Zaproszenie jest jednorazowe i wygasa po godzinie (`INVITE_TTL_MS`, `app/js/wire.js` linia 14).
Kto użyje linku, wysyła prośbę; wchodzi dopiero po porównaniu numeru bezpieczeństwa
i akceptacji (`app/js/joinflow.js`, opis na górze pliku).

**Pokaż kod** (makieta 3.1, z Krąg, „Zaproś osobę")

- Biała karta z kodem QR w obu motywach (kod musi być ciemny na jasnym, inaczej część skanerów
  go nie czyta). Etykieta dostępności „Kod QR zaproszenia". Kod generuje fork lokalnie
  (`app/js/qr.js`).
- „Pokaż kod osobie obok. Zeskanuje go w aplikacji, w ekranie Dołącz do kręgu."
- Plakietka z zegarem: „Jednorazowy, wygasa za 58 min" (odliczanie). Po wygaśnięciu: „Ten link już
  nie działa. Zamknij i dotknij Zaproś osobę, aby dostać nowy."
- Link w polu o stałej szerokości, ucięty wielokropkiem. Przyciski „Wyślij link" (systemowe
  udostępnianie) i „Kopiuj link". Fork czyści schowek po 5 minutach (`ui.js` około 592).
- Notatka: „Wyślij przez coś zaufanego, na przykład Signal. Kto otworzy link, poprosi o
  dołączenie. Ta osoba wejdzie dopiero, gdy porównacie numer i ją wpuścisz."
- Stan oczekiwania: „Nikt jeszcze nie użył tego linku. Prośba pojawi się tutaj."
- „Anuluj ten link" (obrys SOS) z wyjaśnieniem w forku: link przestaje działać od razu.
- Gdy ktoś czeka na decyzję, kod QR znika, żeby nie wpuścić drugiej osoby przy niezałatwionej
  pierwszej (`openInviteSheet`, `ui.js` około 1450).

**Zeskanuj lub wklej** (makieta 3.2, przycisk „Mam zaproszenie")

- Podgląd aparatu z ramką i plakietką „Szukam kodu". Pod spodem „Skieruj aparat na kod zaproszenia
  na ekranie drugiej osoby." Fork ma własny dekoder QR (`app/js/qrscan.js`) i skan tylko
  w aplikacji (`api.canScanQr()`, `main.js` około 3992), uprawnienie `CAMERA` w manifeście.
- Błędy skanu jak w forku: „To kod numeru bezpieczeństwa, nie zaproszenie.", „To nie jest kod
  zaproszenia.", „Nie pozwolono na aparat. Zezwól w ustawieniach systemu i spróbuj ponownie."
  z przyciskiem „Otwórz ustawienia aplikacji", „Ten telefon nie ma aparatu."
- „albo wklej link", pole „Link zaproszenia" (placeholder „https://…/#j=…"), przycisk „Dalej".
  Zły link: „To nie wygląda na link zaproszenia." (`promptPasteInvite`, `main.js` około 3962).
- Notatka z kłódką: „Sekret kręgu jest w końcówce linku i nie trafia na żaden serwer. Po dołączeniu
  ktoś z kręgu musi porównać z Tobą numer."
- Następny krok to imię (jak „Utwórz krąg", bez nazwy kręgu) i przycisk „Poproś o dołączenie"
  (`openJoinSheet`, `ui.js` około 387). Jeśli zaproszenie wskazuje inny serwer, zdanie „Ten krąg
  używa serwera {adres}. Prośba przełączy aplikację na ten serwer."

**Prośba o dołączenie** (makieta 3.3, u zapraszającego)

- Awatar, „Hela chce dołączyć", „Przez Twój link z 14:05".
- „Imię może wpisać każdy. Tylko numer poniżej pokazuje, kto naprawdę prosi."
- Numer bezpieczeństwa: sześć grup po pięć cyfr w dwóch rzędach, pismo o stałej szerokości,
  grupy nigdy się nie łamią (`setSafety`, `ui.js` około 539; format w `docs/PROTOCOL.md`,
  „Safety numbers"). Przycisk „Pokaż duży numer do porównania".
- „Zadzwoń albo spotkaj się i porównaj ten numer z ekranem nowej osoby. Każda cyfra musi się
  zgadzać." oraz „Wpuszczenie daje całemu kręgowi nowe klucze. Nowa osoba nie przeczyta niczego,
  co wysłano wcześniej."
- „Numery się zgadzają, wpuść" (główny) i „Odrzuć" (obrys SOS). Po odrzuceniu: „Odrzucono. Link
  działa dalej dla osoby, do której był." (`reviewBlock`, `ui.js` około 1377).

### Pierwsze uruchomienie

**Powitanie** (makieta 4.1)

- Ilustracja: przerywany okrąg z własną pozycją i trzema awatarami.
- „Twoi bliscy na jednej mapie", „Widzą Cię tylko osoby, które zaprosisz. Nikt poza kręgiem nie
  wie, gdzie jesteś."
- Karta trzech faktów z ikonami: „Szyfrowane end-to-end. Serwer widzi tylko szyfrogram.",
  „Bez kont, bez numeru telefonu, bez e-maila.", „Serwer usuwa wszystko po 24 godzinach."
- Przyciski: „Utwórz krąg", „Mam zaproszenie", „Użyj własnego serwera". Fork ma te same drogi
  (`index.html` linie 171 do 180) plus „Watch the demo", którego makieta nie pokazuje.

**Lokalizacja** (makieta 4.2)

- Ekran wyjaśnia przed pytaniem systemu. Kolejność jak w forku: najpierw dokładna lokalizacja
  (`askGeolocation`, `MainActivity.kt` około 254), powiadomienia przy pierwszym udostępnianiu
  (`requestNotifyPermissionIfNeeded`, około 398), praca w tle dopiero z przełącznika i po
  wyjaśnieniu (`askBackgroundLocation`, około 300; `confirmBackgroundLocation`, `ui.js` około 1684).
- Trzy wiersze z ikonami: „Teraz: dokładna lokalizacja. Android zapyta za chwilę. Wybierz
  „Dokładna" i „Podczas korzystania z aplikacji"."; „Przy pierwszym udostępnianiu: powiadomienia.
  Bez nich SOS nie zadzwoni przy wygaszonym ekranie."; „Później, jeśli zechcesz: praca w tle.
  Wznawia udostępnianie po restarcie telefonu. Zapytamy dopiero przy tym ustawieniu."
- Ramka ostrzeżenia: „iPhone: udostępnianie, SOS i powiadomienia działają tylko przy otwartej
  aplikacji." (decyzja D3; na iPhonie ten ekran pokazuje inne nazwy opcji systemu).
- Przyciski „Zezwól na lokalizację" i „Nie teraz", pod nimi „Bez lokalizacji widzisz krąg, ale krąg
  nie widzi Ciebie." Odmowa: tekst z forka „Lokalizacja jest wyłączona dla aplikacji. Otwórz
  ustawienia aplikacji, zezwól na lokalizację i wróć." (`main.js` około 915).

**Utworzenie kręgu** (makieta 4.3)

- „Tak zobaczą Cię osoby, które zaprosisz. Te dane nie wychodzą poza krąg." (fork:
  `promptCreate`, `main.js` około 3728).
- Podgląd awatara z inicjałem, „Twoje imię" z licznikiem „5 z 24", „Nazwa kręgu" z notatką
  „Nazwę dostaje każda osoba, którą zaprosisz. Każdy może ją zmienić u siebie."
- Wiersz „Serwer" z adresem i stanem „Działa" (ikona i słowo), notatka „Wszyscy w kręgu muszą
  używać tego samego serwera. Jego adres jedzie w zaproszeniu." (`docs/PLAN.md`, uwagi do fazy 1).
- „Utwórz krąg", potem ekran zaproszenia (makieta 3.1).

**Czekanie na wpuszczenie** (makieta 4.4, telefon Heli)

- „Czekasz na wpuszczenie", „Prośba czeka na serwerze, aż osoba, która Cię zaprosiła, otworzy
  aplikację i ją zaakceptuje."
- „Twój numer" w tym samym formacie co u zapraszającego, „Przeczytaj te cyfry osobie, która Cię
  zaprosiła. Ten sam numer widzi przy Twojej prośbie. Tak wie, że to naprawdę Ty."
- Adres serwera kręgu i „Anuluj prośbę" (fork: `join-waiting`, `index.html` linie 147 do 157).

### Do decyzji właściciela

1. Nazwa aplikacji w tekstach i na ekranie blokady. Makiety mówią „Starling", bo tak brzmi
   `app_name` w forku. Rodzinna nazwa wymaga zmiany w zasobach Androida i w katalogu tekstów.
2. Pierwsze uruchomienie pyta o lokalizację od razu. Fork pyta dopiero przy pierwszym „Udostępniaj".
   Makieta 4.2 to nowy ekran i nowe miejsce pytania; trzeba potwierdzić, że ma tak być.
3. Miejsca są tylko lokalne. Każda osoba musi zapisać „Dom" i „Szkołę" u siebie. Wcześniejsza
   plansza Osoba ma podpis „Powiadomienie wysłano do kręgu", który temu przeczy; trzeba go poprawić
   przy F2-4 albo świadomie zaplanować wspólne miejsca (to byłaby zmiana protokołu).
4. Przesuwanie środka istniejącego miejsca: fork tego nie ma (tylko nazwa, promień, powiadomienia,
   strefa, usunięcie). Czy dodać, czy zostać przy „usuń i dodaj"?
5. Promień przy dodawaniu: fork zapisuje 250 m, zmiana dopiero w edycji. Makieta tak to pokazuje.
6. „Pomoc spoza kręgu" (link dla osób bez aplikacji, 6 godzin): czy ma działać na prywatnym
   serwerze rodziny i z jakiego adresu otwiera się strona podglądu. Nie sprawdzono tego na
   własnym relayu. Jeśli nie, przycisk znika z makiety 2.1.
7. Awatary: makiety używają liter i kolorów osób; fork pozwala wybrać emoji. Kto przydziela kolor
   osoby i czy emoji zostaje?
8. Przycisk „Watch the demo" na powitaniu: makieta go pomija, bo rodzinna aplikacja go nie potrzebuje.
9. „Użyj własnego serwera" na powitaniu: jeśli cała rodzina używa jednego prywatnego serwera,
   może on być wpisany na stałe w kompilacji i wtedy ten przycisk znika.
10. Polskie nazwy opcji z systemowego okna Androida („Dokładna", „Podczas korzystania
    z aplikacji") trzeba sprawdzić na prawdziwym telefonie; różnią się między wersjami i
    producentami. Fork pobiera nazwę opcji „zawsze" z systemu (`backgroundLabel`, `main.js`
    około 5752) i tak powinno zostać.
11. Jak długo prośba o dołączenie czeka na serwerze, zanim przepadnie. Makieta 4.4 nie podaje
    czasu, bo nie ustaliłem go z kodu.
12. Skanowanie kodu kamerą na iPhonie nie było testowane na urządzeniu (D3).
