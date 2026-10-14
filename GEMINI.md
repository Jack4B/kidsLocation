# Gemini: rola i wskazówki

Najpierw `AGENTS.md`. Ten plik tylko go uzupełnia.

## Proponowana rola

- Niezależny recenzent pull requestów, szczególnie zmian napisanych przez Claude:
  bezpieczeństwo, prywatność, zgodność z `docs/DESIGN.md`.
- Wdrożenie interfejsu według makiet (faza F2): tokeny CSS, motyw jasny i ciemny, układ
  mapy, arkusze, dolna nawigacja. Zmiany głównie w `app/css/app.css`, `app/js/ui.js`
  i `app/js/map.js`.
- Polski katalog tłumaczeń (zadanie F2-6) i korekta polskich tekstów w całej aplikacji.

## Wskazówki

- Jeśli Twoje okno kontekstu na to pozwala, możesz przeczytać cały `app/js/ui.js` i
  `app/js/main.js` naraz, co ułatwia znalezienie wszystkich miejsc, które dotyka zmiana
  interfejsu. Nadal trzymaj PR mały.
- Nie dotykaj plików zamrożonych z `AGENTS.md`, nawet gdy wydaje się to wygodne.
- Przy recenzji zawsze odpowiadaj na listę kontrolną z `AGENTS.md` punkt po punkcie
  i podawaj numery linii. Ogólne „wygląda dobrze" nie jest recenzją.
- Uruchomienie testów lokalnie może być niemożliwe w Twoim środowisku. W takim razie
  napisz wprost, że testów nie uruchomiłeś, i oprzyj recenzję na czytaniu kodu.
