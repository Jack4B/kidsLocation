# Blisko: instrukcja dla rodziny

Krótko, dla każdego, kto dostaje Blisko na telefon.

## Instalacja

1. Rodzic instaluje **Obtainium** (sklep F-Droid albo strona projektu) i dodaje Blisko według
   `docs/PODPIS-APK.md`. Obtainium sam pokazuje nowe wersje.
2. Na telefonie dziecka prościej: rodzic pobiera plik APK z najnowszego wydania na GitHubie i
   instaluje go ręcznie. Każda nowa wersja instaluje się na poprzednią, bez utraty danych.
3. Przy pierwszym uruchomieniu zgódź się na lokalizację **„Zawsze”** i na powiadomienia.

## Ustawienia, które muszą być włączone

W Blisko, **Ustawienia, Udostępnianie**:

- **Udostępniaj po zamknięciu aplikacji** i **Także po ponownym uruchomieniu**.
- Na telefonie dziecka: **Tryb dziecka** z PIN-em rodzica. Bez PIN-u nie da się wtedy
  wyłączyć udostępniania ani wyjść z kręgu, a z powiadomienia znika „Zatrzymaj”.
- Żeby dziecko nie mogło też wyłączyć lokalizacji ani zatrzymać aplikacji w ustawieniach
  Androida: `docs/OCHRONA-TELEFONU-DZIECKA.md` (raz, kablem USB).

W ustawieniach Androida, dla aplikacji Blisko:

- Bateria: **Bez ograniczeń**.
- Xiaomi, Redmi i Poco: **Autostart** włączony, bateria **Bez ograniczeń**, lokalizacja
  **Zezwalaj zawsze**. Kłódka na Blisko w ostatnich aplikacjach tylko wtedy, gdy telefon ją
  ma (POCO X5 5G jej nie ma). Przyciski do tych ekranów są w Blisko: komunikat „Telefon
  zamknął Blisko”, „Jak temu zapobiec”.
- Xiaomi zamyka aplikacje sam (przy blokadzie ekranu, przesunięciu w ostatnich aplikacjach,
  przycisku czyszczenia), nawet gdy wszystko powyżej jest włączone. **Nie zamykaj Blisko
  z ostatnich aplikacji.** Po takim zamknięciu Blisko nic nie wysyła, dopóki ktoś go
  nie otworzy; po otwarciu udostępnianie wraca samo.
- Realme i Oppo: **Zezwalaj na działanie w tle** oraz **Autostart**.

Raport udostępniania w ustawieniach pokazuje, czego brakuje.

## Dołączenie do kręgu

1. Ktoś z kręgu otwiera **Krąg, Zaproś osobę** i pokazuje kod QR albo wysyła link.
2. Nowa osoba otwiera link albo skanuje kod i wpisuje swoje imię.
3. Obie osoby porównują **numer bezpieczeństwa**. Jeśli jest taki sam, osoba z kręgu dotyka
   **Numery się zgadzają, wpuść**. Inny numer oznacza, że trzeba zacząć od nowa.

Wspólne miejsca (Dom, Szkoła) i czat pojawią się u nowej osoby od razu po przyjęciu.

## Codziennie

- Na mapie widać, kto gdzie jest i jak dawno przyszła ostatnia pozycja.
- Powiadomienia mówią, kto dotarł do miejsca, kto je opuścił i co ktoś napisał na czacie.
- **SOS**: przytrzymaj czerwony przycisk. Krąg dostaje alarm z dźwiękiem.
- **Przycisk z ptaszkiem** (check-in): jedno dotknięcie, krąg dostaje potwierdzenie, że wszystko w porządku.

## Gdy coś nie działa

- Kogoś długo nie widać (na mapie „Brak sygnału od N min”, po 20 minutach jedno
  powiadomienie): jego telefon mógł zamknąć Blisko. Niech otworzy Blisko. Aplikacja sama
  dogania krąg i wznawia udostępnianie.
- Nadal nie widać: skopiuj na jego telefonie **raport udostępniania** (Ustawienia) i wyślij rodzicowi.
- Krąg się rozjechał (ktoś widzi innych, a jego nie widzi nikt): na tym telefonie opuść krąg
  (w trybie dziecka potrzebny PIN) i dołącz ponownie z nowego zaproszenia.

## Zgubiony albo skradziony telefon

1. Z innego telefonu w kręgu: **Krąg**, ta osoba, **Usuń tę osobę**. Krąg dostaje nowe klucze, a
   zgubiony telefon przestaje cokolwiek widzieć.
2. Na nowym telefonie zainstaluj Blisko i dołącz z nowego zaproszenia.
3. Jeśli telefon był w trybie dziecka, nowy też go potrzebuje. Zapomniany PIN: wyczyść dane
   aplikacji i dołącz ponownie.

## Prywatność

Serwer rodziny widzi tylko zaszyfrowane paczki. Nazwy miejsc, treść czatu i pozycje może
odczytać wyłącznie ktoś z kręgu. Blisko nie łączy się z nikim poza tym serwerem i serwerem map.
