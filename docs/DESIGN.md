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

Zrobione (makiety): Mapa, Osoba, Czat, Krąg, Zasady.
Do zrobienia (F2-9): Miejsca, aktywny SOS i alert przychodzący, zaproszenie i QR, pierwsze
uruchomienie z pytaniem o uprawnienia lokalizacji.

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
