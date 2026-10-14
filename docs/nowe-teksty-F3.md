# Nowe teksty: czat rodzinny (F3)

Teksty źródłowe są po angielsku w `starling/app/js/chat.js`, `chatview.js` i `main.js`
(funkcja `t()`). Kolumna „Polski” jest wpisana do `strings-pl.js` (z formami mnogimi
`{one, few, many, other}` tam, gdzie jest liczba). W `strings-de/es/fr/pt.js` dodano je
z wartością angielską. `{name}`, `{n}`, `{time}`, `{who}`, `{place}` to zmienne, nie tłumaczyć.

## Aplikacja (nowe)

| English | Polski |
|---|---|
| Chat | Czat |
| Messages | Wiadomości |
| Short messages to your circle, end-to-end encrypted | Krótkie wiadomości do kręgu, szyfrowane end-to-end |
| {n} new message | {n} nowa wiadomość |
| {n} new messages | 2 do 4: {n} nowe wiadomości; 5 i więcej: {n} nowych wiadomości |
| Back to the map | Wróć do mapy |
| About chat | O czacie |
| End-to-end encrypted | Szyfrowane end-to-end |
| Write to your circle | Napisz do kręgu |
| Message to your circle | Wiadomość do kręgu |
| Send message | Wyślij wiadomość |
| Quick replies | Szybkie odpowiedzi |
| I'm here | Jestem |
| Back in 10 min | Wracam za 10 min |
| Pick me up | Odbierz mnie |
| OK | OK |
| No messages yet. Write the first one. | Jeszcze nie ma wiadomości. Napisz pierwszą. |
| Show earlier messages | Pokaż wcześniejsze wiadomości |
| Today | Dziś |
| Yesterday | Wczoraj |
| Sending... | Wysyłanie… |
| Sent {time} | Wysłano {time} |
| Not sent yet. Trying again. | Jeszcze nie wysłano. Ponawiam. |
| Not sent. Tap to try again. | Nie wysłano. Dotknij, aby spróbować ponownie. |
| A message can have at most {n} characters. | Wiadomość może mieć najwyżej {n} znaków. |
| This message is too long to send. Letters with accents and emoji take more space, so shorten it a little. | Ta wiadomość jest za długa. Polskie litery i emoji zajmują więcej miejsca, skróć ją trochę. |
| {name}: 1 message could not be read. This phone was probably offline for too long. | {name}: nie udało się odczytać 1 wiadomości. Ten telefon był prawdopodobnie zbyt długo offline. |
| {name}: {n} messages could not be read. This phone was probably offline for too long. | {name}: nie udało się odczytać {n} wiadomości. Ten telefon był prawdopodobnie zbyt długo offline. |
| The server keeps messages for at most 24 hours. This phone keeps them for 30 days. | Serwer trzyma wiadomości najwyżej 24 godziny. Ten telefon trzyma je 30 dni. |
| Messages are end-to-end encrypted. The server sees only that something was sent. | Wiadomości są szyfrowane end-to-end. Serwer widzi tylko, że coś zostało wysłane. |
| The server keeps a message for at most 24 hours, and less when the sender is moving and posting often. A phone that was offline for longer than its history setting may miss messages. You see a note when that happens. | Serwer trzyma wiadomość najwyżej 24 godziny, a krócej, gdy nadawca jest w ruchu i często wysyła pozycję. Telefon, który był offline dłużej niż jego ustawienie historii, może przegapić wiadomości. Wtedy zobaczysz o tym informację. |
| Sent means the server accepted the message. It does not mean anyone has read it. | „Wysłano” znaczy, że serwer przyjął wiadomość. Nie znaczy, że ktoś ją przeczytał. |
| Without the app lock, messages on this phone are stored unencrypted. | Bez blokady aplikacji wiadomości są zapisane na tym telefonie bez szyfrowania. |
| On iPhone you hear about new messages only while the app is open. | Na iPhonie o nowych wiadomościach dowiesz się tylko przy otwartej aplikacji. |
| Here you hear about new messages only while this page is open. | Tutaj o nowych wiadomościach dowiesz się tylko przy otwartej stronie. |
| Show message text in notifications | Pokaż treść wiadomości w powiadomieniu |
| Off, a notification says only who wrote. | Wyłączone: powiadomienie mówi tylko, kto napisał. |
| Also on the lock screen | Także na ekranie blokady |
| Anyone holding the phone can read them without unlocking. Only matters when the switch above is on. | Każdy, kto trzyma telefon, przeczyta je bez odblokowania. Ma znaczenie tylko przy włączonym przełączniku wyżej. |
| New message from {name} | {name}: nowa wiadomość |
| Open the app to read it. | Otwórz aplikację, aby ją przeczytać. |
| Chat is off in the demo. | Czat jest wyłączony w trybie demo. |
| Chat starts once you are in a circle. | Czat działa po dołączeniu do kręgu. |

## Aplikacja (istniejące teksty użyte ponownie)

| English | Polski |
|---|---|
| {who} arrived at {place} | {who}: przyjście do {place} |
| {who} left {place} | {who}: wyjście z {place} |
| Someone | Ktoś |
| You | Ty |
| A member | Członek kręgu |

## Android (`res/values*/strings.xml`)

| Klucz | English | Polski |
|---|---|---|
| `notif_chat_channel` | Messages | Wiadomości |
| `notif_chat_text` | New message | Nowa wiadomość |

`notif_chat_text` to tekst na ekranie blokady, gdy treść nie jest tam dozwolona. Domyślny
`values/strings.xml` jest po polsku i ma oba teksty po polsku; de/es/fr/pt mają własne
tłumaczenia.
