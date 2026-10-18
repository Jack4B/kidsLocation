# Pełna ochrona telefonu dziecka

Tryb dziecka z PIN-em pilnuje przycisków w Blisko. Żeby dziecko nie mogło też wyłączyć
lokalizacji, wymusić zatrzymania aplikacji, wyczyścić jej danych ani jej odinstalować, Blisko
musi zostać **administratorem urządzenia** (device owner). Ustawia się to raz, kablem USB.

## Co blokuje

Gdy Blisko jest administratorem i tryb dziecka jest włączony:

- lokalizacji nie da się wyłączyć (ani w ustawieniach, ani kafelkiem),
- w ustawieniach aplikacji nie działa „Wymuś zatrzymanie”, „Wyczyść dane” ani „Odinstaluj”,
- zgody na lokalizację „Zawsze” i na powiadomienia są zablokowane jako przyznane,
- nie da się włączyć trybu samolotowego, trybu awaryjnego ani przywrócić ustawień fabrycznych z
  menu.

Wyłączenie trybu dziecka (PIN) zdejmuje wszystkie blokady. Przycisk „Usuń administratora
urządzenia” w ustawieniach Blisko oddaje telefon do zwykłego stanu.

Czego to nie zmienia: telefon można wyłączyć przyciskiem, a HyperOS może nadal czasem uśpić
aplikację. Wtedy wraca ona sama (dwa budziki co 15 minut), a krąg widzi wiek ostatniej pozycji.

## Przygotowanie (raz)

Potrzebny komputer z `adb` (pakiet „Android SDK Platform Tools”) i kabel USB.

1. Na telefonie dziecka zainstaluj Blisko, dołącz do kręgu i sprawdź, że udostępnianie działa.
2. **Wyloguj wszystkie konta**: Ustawienia, Konta i synchronizacja. Usuń konto Google, konto Mi
   i każde inne z listy (WhatsApp, Telegram, poczta). Android nie pozwala ustawić
   administratora, gdy na telefonie jest jakiekolwiek konto.
3. Wyłącz **Drugą przestrzeń** i **Podwójne aplikacje**, jeśli były włączone. Tworzą one
   dodatkowych użytkowników, co też blokuje ustawienie.
4. Włącz opcje programisty: Ustawienia, O telefonie, siedem razy dotknij „Wersja OS”.
5. Ustawienia, Dodatkowe ustawienia, Opcje programisty: włącz **Debugowanie USB**.

## Ustawienie

Podłącz telefon do komputera, na telefonie zezwól na debugowanie, a na komputerze wpisz:

```sh
adb shell dpm set-device-owner app.kidslocation/app.starlingmap.AdminReceiver
```

Poprawna odpowiedź zaczyna się od `Success: Device owner set`. Jeśli widzisz „already some
accounts”, wróć do kroku 2.

Potem:

1. Otwórz Blisko. W Ustawieniach, Udostępnianie powinien być napis „Pełna ochrona jest
   włączona”. Jeśli tryb dziecka był wyłączony, włącz go i ustaw PIN.
2. Zaloguj z powrotem konta Google i Mi.
3. Wyłącz debugowanie USB i opcje programisty.

## Zapomniany PIN

Blokady zdejmuje tylko PIN. Bez niego jedyna droga to reset telefonu z trybu recovery
(przyciski przy włączaniu), który kasuje cały telefon.

## Aktualizacje

Nowe wersje Blisko instalują się jak dotąd. Administrator urządzenia przechodzi na nową wersję
sam, bo jest podpisana tym samym kluczem.
