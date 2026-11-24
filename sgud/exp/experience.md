# 累積經驗

本檔為執行工作時特有之累積經驗,留給後續之嘗試、執行與判斷,由agent自行編列、擴充與維護.過長時抽出舊者為`experience_<年月日>.md`,並於本檔註明何時抽出.

## 測試樣本改本機供應(2026-11-25;規則 R1)

- **以代理環境變數模擬斷網,axios 亦遵守**:axios 之 Node http 轉接器經 `proxy-from-env`(本庫裝 2.1.0)讀 `<proto>_proxy`/`all_proxy`/`no_proxy`(小寫優先於大寫;實測:http 與 https 之對外請求落到代理 `127.0.0.1:9` 皆 `ECONNREFUSED`,錯誤物件之 `cause.address`/`cause.port` 可驗證「確實被導向不通代理」而非逾時);Node 內建 `fetch`(undici)預設不讀,不受影響.`proxy-from-env` 2.1.0 不讀 `npm_config_*`(1.x 會讀),`isolateExternal` 仍一併蓋掉以跨版本保險;`NO_PROXY` 須強制設定(使用者環境之代理若無此項,本機位址亦會繞經代理而失敗).使用者環境設 `NODE_USE_ENV_PROXY=1` 時 axios 改由 Node 原生處理(程序啟動時快照),隔離不生效,`api-sampleServer` 之 `isolateExternal` 案會轉紅(未實測,依 `node_modules/axios/lib/adapters/http.js` 推論).
- **對外請求探測目標用 RFC 5737 之 `192.0.2.1`**(文件用位址,不可路由,不會真送出封包到某個真實主機);隔離若失效,該請求會逾時(測試設 10 秒),不會連到真實服務.
- **關閉服務**:變異「測試不呼叫 `server.close()`」會使 mocha 行程不結束(實測被逾時終止),故守門測試逐檔掃描 `server.close()`;`close()` 內併用 `closeAllConnections()` 以關閉保持連線者(沿用 w-dwload-dlp 之作法,未另行驗證其必要性).
- **樣本之取得**:樣本與 jsDelivr 上之檔逐位元相同(2026-11-25 下載比對,140769 位元組),本機另有 `w-demores` 原始庫,本套件不加相依只存夾具(138 KB).
- **進度回報之取樣點**:本機服務以每塊 16 KB 分塊送出(`SAMPLE.pieceSize`,每塊間讓出事件迴圈),`funProg` 才有多個取樣點;一次整包送出時用戶端可能只收到 1 塊,「throttle 被拿掉」之變異即測不出.測試以「100% 前之回報次數 ≤ 耗時整秒數＋2」把關 throttle(JSDoc 範例之輸出為 1 次處理中進度加最後之 100%).
