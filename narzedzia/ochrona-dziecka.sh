#!/data/data/com.termux/files/usr/bin/bash
# Blisko: pełna ochrona telefonu dziecka, uruchamiana z Termuxa na telefonie rodzica.
# Oba telefony w tej samej sieci Wi-Fi. Na telefonie dziecka, przed startem:
#   - Blisko zainstalowane, dołączone do kręgu, udostępnianie działa,
#   - wylogowane WSZYSTKIE konta (Google, Mi, WhatsApp, Telegram...),
#   - wyłączona Druga przestrzeń i Podwójne aplikacje,
#   - Opcje programisty, Debugowanie bezprzewodowe: włączone.
# Uruchomienie:  bash ochrona-dziecka.sh
set -u
PKG=app.kidslocation
ADMIN=$PKG/app.starlingmap.AdminReceiver

say() { printf '\n== %s\n' "$*"; }
die() { printf '\nBŁĄD: %s\n' "$*"; exit 1; }
ask() { local v; read -r -p "$1: " v; printf '%s' "$v"; }

command -v adb >/dev/null 2>&1 || { say "Instaluję adb"; pkg install -y android-tools || die "nie udało się zainstalować android-tools"; }

say "Parowanie"
echo "Na telefonie dziecka: Debugowanie bezprzewodowe, 'Sparuj urządzenie za pomocą kodu'."
echo "Zostaw ten ekran otwarty i przepisz dane."
PAIR=$(ask "Adres i port parowania (np. 192.168.1.23:37123)")
CODE=$(ask "Sześciocyfrowy kod")
adb pair "$PAIR" "$CODE" || die "parowanie nie wyszło (sprawdź adres, port i kod; kod jest ważny krótko)"

say "Łączenie"
echo "Teraz zamknij okienko parowania. Na głównym ekranie Debugowania bezprzewodowego"
echo "jest 'Adres IP i port' (inny port niż do parowania)."
CONN=$(ask "Adres i port połączenia")
adb connect "$CONN" | grep -q connected || die "nie udało się połączyć z $CONN"
A="adb -s $CONN shell"

say "Sprawdzam telefon dziecka"
$A pm list packages "$PKG" | grep -qx "package:$PKG" || die "Blisko nie jest zainstalowane na tym telefonie"
echo "Model: $($A getprop ro.product.model | tr -d '\r'), Android $($A getprop ro.build.version.release | tr -d '\r')"
USERS=$($A pm list users | grep -c 'UserInfo{')
[ "$USERS" -le 1 ] || die "na telefonie jest $USERS użytkowników: wyłącz Drugą przestrzeń i Podwójne aplikacje"
ACC=$($A dumpsys account | grep -c 'Account {')
if [ "$ACC" -gt 0 ]; then
  $A dumpsys account | grep 'Account {' | sed 's/^ */  /'
  die "na telefonie są konta ($ACC): wyloguj je w Ustawieniach, Konta i synchronizacja, i uruchom skrypt ponownie"
fi

say "Ustawiam Blisko jako administratora urządzenia"
if $A dpm list-owners 2>/dev/null | grep -q "$PKG"; then
  echo "Już ustawione."
else
  OUT=$($A dpm set-device-owner "$ADMIN" 2>&1)
  echo "$OUT"
  echo "$OUT" | grep -q 'Success' || die "Android odmówił (treść wyżej)"
fi

say "Zgody i bateria"
for p in ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION ACCESS_BACKGROUND_LOCATION POST_NOTIFICATIONS CAMERA; do
  $A pm grant "$PKG" "android.permission.$p" 2>/dev/null && echo "  zgoda: $p"
done
$A cmd deviceidle whitelist +"$PKG" >/dev/null 2>&1 && echo "  bez optymalizacji baterii"
$A cmd appops set "$PKG" RUN_IN_BACKGROUND allow 2>/dev/null
$A cmd appops set "$PKG" RUN_ANY_IN_BACKGROUND allow 2>/dev/null && echo "  praca w tle dozwolona"
# HyperOS/MIUI: Autostart (operacja 10008) i start z tła (10021).
$A cmd appops set "$PKG" 10008 allow 2>/dev/null && echo "  Autostart (Xiaomi) włączony"
$A cmd appops set "$PKG" 10021 allow 2>/dev/null
$A am set-standby-bucket "$PKG" active 2>/dev/null

say "Uruchamiam Blisko"
$A monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1

cat <<'TXT'

== Gotowe. Teraz na telefonie dziecka:
 1. W Blisko: Ustawienia, Udostępnianie. Włącz Tryb dziecka (PIN rodzica), jeśli jeszcze nie jest.
    Powinien pojawić się napis "Pełna ochrona jest włączona".
 2. Sprawdź, czy kafelek lokalizacji jest zablokowany.
 3. Zaloguj z powrotem konta Google i Mi.
 4. Wyłącz Debugowanie bezprzewodowe i Opcje programisty.
TXT
adb disconnect "$CONN" >/dev/null 2>&1
