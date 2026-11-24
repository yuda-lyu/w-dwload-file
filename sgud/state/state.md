# w-dwload-file 狀態

## 功能

| 項目 | 現況 |
|---|---|
| `WDwloadFile(url, fp, opt)`(`src/WDwloadFile.mjs`) | 已做:以 axios stream 下載、寫入 `fp`(上層資料夾不存在則建立)、`opt.funProg(prog, nn, na)` 回報進度(throttle 每秒一次,最後固定回報 `(100, na, na)`)、`opt.timeout`(預設 5 分鐘)、`opt.maxRedirects`、`opt.headers`;url 非字串 reject;resolve `'ok'` |

## 測試(規則 R1:測試不連外網)

| 檔 | 內容 |
|---|---|
| `test/WDwloadFile.test.mjs`(僅 Windows 執行,既有閘門) | R1:`download`(樣本由本機服務供應、axios 對外請求一律經不通代理;斷言大小 140769、回傳 `'ok'`、sha256 同樣本、本機服務只收到 1 次 `GET /video/aigen.mp4`)、`download funProg`(末次回報 `(100, 140769, 140769)`;100% 前至少 1 次回報、進度值＝已下載量/總量×99、已下載量遞增、次數不超過耗時整秒數＋2) |
| `test/api-sampleServer.test.mjs` | R1:夾具逐位元同原檔(大小、sha256 釘住)、本機服務只綁 127.0.0.1／GET／HEAD／404／405／請求紀錄／關閉釋放埠／不寫死埠、`isolateExternal`(axios 之 http 與 https 對外請求被不通代理拒絕且本機直連、還原含原無值者) |
| `test/unit-testNetworkGuard.test.mjs` | R1:靜態掃描——掃描範圍不為空、測試與工具無 CDN 網域、無非本機網址、真跑 `WDwloadFile(` 之測試檔皆接上本機服務與隔離、夾具存在、README〈測試之網路需求〉 |
| `test/tools/sampleServer.mjs`、`test/fixtures/aigen.mp4` | R1:共用夾具(本機樣本服務、`isolateExternal`、樣本之大小與雜湊常數)與樣本(138 KB,與 jsDelivr 上之檔逐位元相同) |

網路需求:`npm test` **不需外網**(README〈測試之網路需求〉).

最近一次驗證(2026-11-25,測試樣本改本機供應輪;只改測試端、`src/` 0 行改動):全套 `npm test`(`mocha --parallel`,經測試鎖)**14 passing、0 failing**;連跑 5 次全綠、`WDwloadFile.test.mjs` 與 `api-sampleServer.test.mjs` 單獨連跑 20 次全綠;環境代理指向不通之 `127.0.0.1:9` 且無 `NO_PROXY` 時(模擬斷網)全綠,舊版 `test/WDwloadFile.test.mjs`(自 jsDelivr 下載)於同環境 `connect ECONNREFUSED 127.0.0.1:9` 紅;發布包解開之另一配置(`npm pack` 之 tgz 解開、裝 `--omit=dev` 相依與 mocha、掛解析守門確認無向上解析、工作目錄為解開目錄)14 passing;新測試之變異 26 項全被抓;eslint `--ext .mjs src test` 0 問題.
