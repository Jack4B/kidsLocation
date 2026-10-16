const L = (hex) => { const c = hex.replace('#','').match(/../g).map(h => parseInt(h,16)/255).map(v => v <= 0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
const cr = (a,b) => { const [x,y] = [L(a),L(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
const T = {
 jasny:{bg:'#F1F4F2',surface:'#FFFFFF',surface2:'#E8EDEA',ink:'#14201C',ink2:'#4B5A54',accent:'#0B7A64',accentInk:'#FFFFFF',accentSoft:'#D6EFE8',sos:'#C62B22',sosInk:'#FFFFFF',warn:'#A85A00'},
 ciemny:{bg:'#12141C',surface:'#1C2030',surface2:'#272C41',ink:'#EEF1F6',ink2:'#A9B1C4',accent:'#45D9B5',accentInk:'#06251D',accentSoft:'#17372F',sos:'#FF7A6E',sosInk:'#2A0705',warn:'#F0B35A'},
};
const pairs = [
 ['ink','bg','tytuły, tekst na tle ekranu'],['ink2','bg','podpowiedzi na tle ekranu'],
 ['ink','surface','tekst w arkuszach i kartach'],['ink2','surface','opisy w arkuszach'],
 ['ink','surface2','pola, plakietki, numer bezpieczeństwa'],['ink2','surface2','placeholder, notatki, etykieta numeru'],
 ['accent','surface','przyciski tekstowe, Strefa prywatności, Działa'],['accent','surface2','unikać: w makietach nieużywane, przycisk w polu numeru ma kolor tekstu'],['accent','bg','przycisk Użyj własnego serwera, Nie teraz'],
 ['accentInk','accent','przycisk główny, zaznaczony segment, chip Ty'],
 ['sos','surface','Usuń miejsce, Odrzuć, Anuluj ten link'],['sos','bg','Anuluj ten link (tło ekranu)'],['sosInk','sos','pasek SOS, nagłówek alarmu, chip Kuba SOS'],
 ['warn','surface','iPhone: w ramce ostrzeżenia'],['ink','accentSoft','etykieta nawigacji nad bladym wskaźnikiem (tekst obok)'],
];
const out = [];
for (const [tn, t] of Object.entries(T)) for (const [a,b,u] of pairs) { const r = cr(t[a], t[b]); out.push(`${tn.padEnd(7)} ${a.padEnd(9)} na ${b.padEnd(10)} ${r.toFixed(2).padStart(5)}:1 ${r>=4.5?'OK':'ZA MAŁO'}  (${u})`); }
for (const c of ['#F29BB8','#F5C04A','#B7A6F5']) { const r = cr('#14201C', c); out.push(`oba     #14201C na ${c}    ${r.toFixed(2).padStart(5)}:1 ${r>=4.5?'OK':'ZA MAŁO'}  (litera awatara)`); }
for (const [a,b,u] of [['#FFFFFF','#0E1110','podgląd aparatu: ramka'],['#FFFFFF','#000000','plakietka Szukam kodu'],['#14201C','#FFFFFF','kod QR na białej karcie (oba motywy)'],['#14201C','#B9C1BD','opisy plansz poza telefonem'],['#26332E','#B9C1BD','podpisy plansz poza telefonem']]) { const r = cr(a,b); out.push(`stałe   ${a} na ${b}    ${r.toFixed(2).padStart(5)}:1 ${r>=4.5?'OK':'ZA MAŁO'}  (${u})`); }
console.log(out.join('\n'));
console.log('\nElementy nietekstowe (próg 3:1):');
for (const [tn,t] of Object.entries(T)) for (const [a,b,u] of [['accent','accentSoft','ikona miejsca w kółku, ikona zaznaczonej zakładki'],['sos','surface','obrys karty alarmu i przycisków SOS'],['ink2','surface','obrys przełącznika wyłączonego'],['ink2','surface2','wyłączony przełącznik: gałka i obrys']]) { const r = cr(t[a],t[b]); console.log(`${tn.padEnd(7)} ${a.padEnd(9)} na ${b.padEnd(10)} ${r.toFixed(2).padStart(5)}:1 ${r>=3?'OK':'ZA MAŁO'}  (${u})`); }
