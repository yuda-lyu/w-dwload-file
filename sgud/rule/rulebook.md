# 規則帳本

本檔為套件設計與開發階段之規則帳本(藍圖),為要求程式碼須長成什麼樣,或由規格產出之測試(項目/說明/流程)有哪些,包含軸、單一擁有者、已知限制、破壞性變更紀錄,以及對應是哪些測試檔案或指令等,由agent自行編列、擴充與維護.當前已做到哪些記於`sgud/state/state.md`.過長時依類型拆為`rulebook_<類型>.md`,本檔只留索引.

## R1 測試不連外網:樣本由本機 HTTP 服務供應(2026-11-25;全域技能 role-coder-for-test §5.3)

- **為何**:`WDwloadFile.test.mjs` 原於執行時自 jsDelivr 真實下載 `w-demores` 之 `res/video/aigen.mp4` 並斷言大小 140769;網路不穩、CDN 異常或斷網時轉紅,與被測程式無關(盤點歸為 C 類:小檔真外網).
- **規則**:
  1. **樣本存本庫夾具**:`test/fixtures/aigen.mp4`(140769 位元組,sha256 `3af7e7948cc66db55a9e42723e68d7854ba5ba37fb2c97a139f967efce69b70b`),取自 `w-demores`(本機原始庫之 `res/video/aigen.mp4`),與 jsDelivr 上之檔**逐位元相同**(2026-11-25 實際下載比對:大小與 sha256 皆同).`w-demores` 未列為本套件之相依(只需此一個 138 KB 之檔,不為此加 devDependency);夾具隨 npm 包(依 dspec 測試隨包原則,遠小於 10 MB 門檻).二進位檔含 NUL,git 不做換行轉換,雜湊另由 `api-sampleServer` 釘住.
  2. **由本機服務供應**:`test/tools/sampleServer.mjs` 之 `startSampleServer()`(只綁 `127.0.0.1`、`listen(0)` 由作業系統配發埠、不寫死低埠;`GET`/`HEAD /video/aigen.mp4` 回 200 與 `Content-Length`,GET 以每塊 16 KB 分塊送出〔使 `funProg` 有多個取樣點〕;未知路徑 404、非 GET/HEAD 405,一律記入 `requests`,使新增之外部依賴在測試中現形);`close()` 關閉並等連線結束(含保持連線者).
  3. **對外請求一律失敗**:真跑 `WDwloadFile` 之測試於 `before` 呼叫 `isolateExternal()`,令 axios 之 Node http 轉接器(經 `proxy-from-env`)之 http 與 https 對外請求一律經不通之代理 `127.0.0.1:9`、只有 `127.0.0.1`/`localhost` 直連(大小寫變數與 `npm_config_*` 皆設,`NO_PROXY` 亦強制設定,不受使用者環境之代理設定影響),`after` 還原原值(含原無值者仍無值);與網路是否暢通無關.**限制**:只截斷會讀代理環境變數之請求(axios);不宣稱程序整體零對外請求;前提為本機 9 埠無人監聽、且使用者環境未設 `NODE_USE_ENV_PROXY=1`(設了則 `api-sampleServer` 之 `isolateExternal` 案轉紅,見 `sgud/exp/experience.md`).
  4. **測試產物**落 `test/_tmp/WDwloadFile/`(夾不預先建立,一併驗證 `WDwloadFile` 會建立不存在之上層資料夾),由該測試檔之 `after` 刪除.
  5. **測試與工具不得出現 CDN 網域或非本機網址**(`unit-testNetworkGuard` 掃描;允許 `127.0.0.1`、`localhost`、RFC 5737 之 `192.0.2.x`〔文件用位址,只作「對外請求」之探測目標〕);**真跑 `WDwloadFile(` 之測試檔須接上本機服務與隔離**(逐檔遞迴掃描 `test/`〔略過夾具、暫存〕,須匯入並呼叫 `startSampleServer`、`isolateExternal`、網址取自本機服務、`server.close()`、`restore()`,新檔缺接線即紅;屬文字掃描,不證明執行順序).
  6. **逐案處置**:本套件測試案原只有 1 案(`WDwloadFile` 之 `download`):改本機服務(斷言隨之核對:大小 140769、sha256 同樣本、回傳 `'ok'`、本機服務只收到 1 次 `GET /video/aigen.mp4`);另增 `download funProg`(對應 JSDoc 範例輸出:末次回報為 `(100, 140769, 140769)`;100% 前至少 1 次回報,進度值＝已下載量/總量×99、已下載量遞增、次數不超過「耗時整秒數＋2」〔throttle 每秒一次〕).進度、續傳、逾時、錯誤碼等案本庫原無(產品無續傳、逾時之測試;本輪只改測試端,不新增產品行為之測試範圍).**本套件無保留外網之案**,故 README〈測試之網路需求〉載明「不需外網」.
  7. 僅 Windows 執行(`isWindows()` 閘門)為既有行為,本輪不改.
  8. README 與 `src/WDwloadFile.mjs` 之 JSDoc 範例仍以 jsDelivr 網址為例,屬使用說明、不屬測試,不改(產品與輸出不變).
- **盤點指令**:`Grep "jsdelivr\.net|unpkg\.com|cdnjs\.|githubusercontent\.com" test`(應 0 筆);`Grep "WDwloadFile\(" test`(真跑主函數之檔:`WDwloadFile.test.mjs` 1 檔).
- **站點全集**:真下載站點 1 處(`WDwloadFile.test.mjs` 之 `test()`,取得 `server.urls.mp4`,已套);外網站點 0 處.
- **把關測試**:`test/WDwloadFile.test.mjs`(2 案)、`test/api-sampleServer.test.mjs`(夾具逐位元同原檔且雜湊釘住、只綁 127.0.0.1、GET/HEAD/404/405 與請求紀錄、關閉釋放埠、不寫死埠、`isolateExternal` 令 axios 之 http 與 https 對外請求被不通代理拒絕且本機直連、還原原值含「原無值者仍無值」)、`test/unit-testNetworkGuard.test.mjs`(掃描範圍不為空、無 CDN 網域、無非本機網址、逐檔接線、夾具存在與 README 之〈測試之網路需求〉).
- **執行指令**:`node node_modules/mocha/bin/mocha.js --no-parallel test/WDwloadFile.test.mjs test/api-sampleServer.test.mjs test/unit-testNetworkGuard.test.mjs --timeout 180000`(約 1 秒,不連網);斷網情境:另加環境變數 `HTTP_PROXY=http://127.0.0.1:9 HTTPS_PROXY=http://127.0.0.1:9`(`isolateExternal` 亦自行設定,結果相同).
- **修前紅重現**:把 HEAD 之 `test/WDwloadFile.test.mjs` 與 `src/` 取出於暫存夾,以 `HTTP_PROXY=http://127.0.0.1:9 HTTPS_PROXY=http://127.0.0.1:9 NO_PROXY=127.0.0.1,localhost` 跑 mocha ⇒ `connect ECONNREFUSED 127.0.0.1:9`(1 failing);新版同環境綠.
