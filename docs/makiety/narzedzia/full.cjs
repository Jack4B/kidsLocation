const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport:{width:2560,height:1000}});
await p.goto('file://' + require('path').resolve(__dirname,'../makiety-F2-9.html'));
await p.screenshot({path: require('path').resolve(__dirname,'../png/calosc.png'), fullPage:true}); await b.close(); })();
