# Nowe teksty: nowy wygląd (F2-1 do F2-5, F2-7, F2-8)

Teksty źródłowe są po angielsku w `starling/app/js/main.js`, `ui.js` i `index.html`
(funkcja `t()`, `el()`, `data-i18n`). Kolumna „Polski” jest wpisana do `strings-pl.js`
(z formami mnogimi `{one, few, many, other}` tam, gdzie jest liczba). W `strings-de/es/fr/pt.js`
dodano je z wartością angielską. `{name}`, `{n}`, `{time}`, `{who}`, `{place}`, `{dist}`,
`{min}`, `{pct}`, `{r}`, `{exit}`, `{radius}`, `{alerts}`, `{max}` to zmienne, nie tłumaczyć.

## Aplikacja (nowe lub zmienione)

| English | Polski |
|---|---|
| A link for someone nearby, no app needed. It works for 6 hours. | Link dla kogoś obok, bez aplikacji. Działa 6 godzin. |
| Accuracy {dist} | Dokładność {dist} |
| All settings | Wszystkie ustawienia |
| arrive and leave | wejście i wyjście |
| arrive only | tylko wejście |
| Arriving counts inside {r}. Leaving counts only past about {exit}, so a jumpy GPS fix does not send false alerts. | Wejście liczy się w promieniu {r}. Wyjście dopiero po oddaleniu się na około {exit}, żeby skaczący GPS nie wysyłał fałszywych powiadomień. |
| Battery low, {pct}% | Słaba bateria, {pct}% |
| Chat | Czat |
| Check before you trust it. | Sprawdź, zanim zaufasz. |
| Circle, keys changed | Krąg, zmienione klucze |
| Clear data from this phone | Wyczyść dane z tego telefonu |
| Compare number | Porównaj numer |
| Compare the safety number | Porównaj numer bezpieczeństwa |
| connected | działa |
| Default | Domyślny |
| Directions to {who} | Nawiguj do: {who} |
| History on this phone | Historia na telefonie |
| History reaches only as far back as the window in Circle settings. Older positions are deleted for good. | Historia sięga tylko tak daleko, jak okno z ustawień Kręgu. Starsze pozycje są nieodwracalnie usuwane. |
| Hold for SOS | Przytrzymaj SOS |
| I am okay, cancel SOS | Wszystko w porządku, odwołaj SOS |
| Identity not verified | Tożsamość niepotwierdzona |
| Identity verified | Tożsamość potwierdzona |
| Invite a person | Zaproś osobę |
| Last 10 minutes | Ostatnie 10 minut |
| Last 24 hours | Ostatnie 24 godziny |
| Last 6 hours | Ostatnie 6 godzin |
| Last hour | Ostatnia godzina |
| leave only | tylko wyjście |
| Main | Nawigacja główna |
| Map style | Styl mapy |
| Message | Napisz |
| My position | Moja pozycja |
| Neighborhood, about 1 km | Okolica, około 1 km |
| no alerts | bez powiadomień |
| No signal | Brak sygnału |
| not connected | nie działa |
| Nothing in this window yet. | W tym okresie nic jeszcze nie ma. |
| On the move | W drodze |
| Or move the map and use its center. | Albo przesuń mapę i użyj jej środka. |
| Passcode and biometrics | Kod i biometria |
| People | Osoby |
| People in your circle | Osoby w twoim kręgu |
| People with no recent update | Osoby bez świeżej aktualizacji |
| Places are stored only on this phone. The server and the rest of your circle do not know they exist. | Miejsca są zapisane tylko na tym telefonie. Serwer i reszta kręgu nie wiedzą, że istnieją. |
| Privacy | Prywatność |
| Radius | Promień |
| Remove place | Usuń miejsce |
| Safety number compared | Numer bezpieczeństwa porównany |
| Sending SOS | Wysyłanie SOS |
| Server | Serwer |
| Sharing my location | Udostępniam lokalizację |
| Since {time} | Od {time} |
| SOS active since {time} | SOS aktywny od {time} |
| SOS is active | SOS jest aktywny |
| SOS sent | SOS wysłany |
| Stayed in one spot | Bez ruchu w jednym miejscu |
| Switch circle: {name}, {n} people | 1: Zmień krąg: {name}, {n} osoba; 2 do 4: Zmień krąg: {name}, {n} osoby; 5 i więcej: Zmień krąg: {name}, {n} osób |
| Until {time}, {min} min | Do {time}, {min} min |
| While you are here, your circle sees only the middle of this place. An SOS always sends your exact position. | Gdy tu jesteś, krąg widzi tylko środek tego miejsca. SOS zawsze wysyła twoją dokładną pozycję. |
| You are not sharing your location. Tap to start. | Nie udostępniasz lokalizacji. Dotknij, żeby zacząć. |
| You are sharing your location. Tap to stop. | Udostępniasz lokalizację. Dotknij, żeby przestać. |
| You, SOS | Ty, SOS |
| Your circle does not see where you are. Turn this on to share. | Krąg nie widzi, gdzie jesteś. Włącz, żeby udostępniać. |
| Your circle got the alarm and sees where you are. When you are safe, cancel the SOS. Your circle then gets word that you are okay. | Krąg dostał alarm i widzi, gdzie jesteś. Gdy wszystko jest w porządku, odwołaj SOS. Krąg dostanie wtedy wiadomość, że wszystko u ciebie w porządku. |
| Your circle sees you every {n} seconds. | 1: Krąg widzi cię co {n} sekundę.; 2 do 4: Krąg widzi cię co {n} sekundy.; 5 i więcej: Krąg widzi cię co {n} sekund. |
| Your circle sees your live position | Krąg widzi twoją pozycję na żywo |
| Your position goes out every 15 seconds while the SOS lasts. | Twoja pozycja idzie co 15 sekund, dopóki trwa SOS. |
| {dist} in {min} min | {dist} w {min} min |
| {n} of {max} places. Arrive and leave alerts come only to this phone. | {n} z {max} miejsc. Powiadomienia o wejściu i wyjściu przychodzą tylko na ten telefon. |
| {n} people | 1: {n} osoba; 2 do 4: {n} osoby; 5 i więcej: {n} osób |
| {n} person | {n} osoba |
| {radius} · {alerts} | {radius} · {alerts} |
| {time} ago | {time} temu |
| {who}, SOS, {time} | {who}, SOS, {time} |
| {who}, {place} | {who}, {place} |
| {who}, {time} | {who}, {time} |

## Usunięte z katalogów (nowe ekrany ich nie używają)

- A place with the privacy fence on shares only its center while you are inside it, never your exact spot within. Your circle still sees you are there; what they stop seeing is where in there. An SOS always sends your real position.
- Close member card
- Name the spots that matter, like Home or School, and Starling tells you when someone in your circle arrives or leaves. Places are stored only on this phone. They are never sent anywhere, and the relay cannot learn they exist.
- Save my current spot
- SOS is armed
- Your circle sees an alert at your live position. Tap the check mark above to cancel it and let everyone know you are okay.
- Short messages to your circle, end-to-end encrypted
