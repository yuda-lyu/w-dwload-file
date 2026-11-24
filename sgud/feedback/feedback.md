# 回饋

本檔為任務中發現之自有套件、全域技能、全域設定之調整與抽提提案(只增不改,處置結果另記一列),欄位:日期、類別、對象、內容、依據.回饋只是紀錄與提案,不因此自行修改他套件、全域技能或全域設定.

| 日期 | 類別 | 對象 | 內容 | 依據 |
|---|---|---|---|---|
| 2026-11-25 | 自有套件(抽提提案) | 測試輔助(`startSampleServer`、`isolateExternal`) | `w-dwload-file` 與 `w-dwload-dlp` 各自有一份近乎相同之 `test/tools/sampleServer.mjs`(只綁 127.0.0.1 之樣本服務＋以代理環境變數令對外請求失敗之 `isolateExternal`),後者已含 `yt-dlp`／axios 兩種隔離需求之差異;其他套件之「斷網下測試仍綠」改造亦會重寫同樣之輔助.宜評估抽為共用測試輔助(例如併入既有之測試工具套件或 `w-package-tools` 之測試端),避免各套件各維護一份 | 本套件 `test/tools/sampleServer.mjs`(`isolateExternal`)與 `w-dwload-dlp` 之 `test/tools/sampleServer.mjs`(`isolateExternal`)為同一作法 |
| 2026-11-25 | 全域技能 | role-coder-for-test §5.3(「測試不連外部網路資源」;本機已安裝之副本無該節,技能庫原稿有) | 「以代理環境變數模擬斷網」一條宜補上適用範圍:①axios(Node http 轉接器,`proxy-from-env`)與 Python 程式遵守,Node 內建 `fetch`(undici)不遵守;②`NO_PROXY` 須強制設定,否則使用者環境之代理會令本機位址亦繞經代理而假紅;③環境設 `NODE_USE_ENV_PROXY=1` 時 axios 改由 Node 原生處理(啟動時快照),此法不生效;④驗證隔離確實生效之法:對 `192.0.2.1`(RFC 5737)分別發 http 與 https 請求,斷言錯誤為 `ECONNREFUSED` 且位址為不通代理之 `127.0.0.1:9`,而非逾時 | `test/api-sampleServer.test.mjs`(isolateExternal 案);`sgud/exp/experience.md`〈測試樣本改本機供應〉 |
| 2026-11-25 | 全域技能 | role-coder-for-test `references/sandbox-run.md`(解析守門) | 該文件「未實測:`mocha --parallel` 之 worker 是否繼承 `NODE_OPTIONS`」一項已實測:於發布包解開目錄以 `NODE_OPTIONS=--import=<守門模組>` 加 `SANDBOX_ROOT` 起 `mocha --parallel`(2 個探測檔強制走 worker),worker 內匯入沙箱外才有之套件即拋 `[sandbox-guard]`(2 passing,Node v24.22.1,mocha 12.0.3);可回補該文件 | 於本次驗證之發布包配置實跑(探測檔 2 個,各 1 案,皆通過) |
| 2026-11-25 | 全域設定 | 本檔(`~/.claude/CLAUDE.md`)§14 與本套件之指引文件 | 本套件在本輪前無 `sgud/` 與 `CLAUDE.md`(`git ls-files` 無 `sgud/`),而任務指示要求「同步 `sgud/`、遵循本套件 `CLAUDE.md`」;本輪依 §14 新建 `sgud/`(rule、exp、state、feedback),未建 `CLAUDE.md`(`.gitignore` 排除,不入版控).建議全自有套件盤點尚缺 `sgud/` 者,於其下次更新時一併建立,任務指示方不指向不存在之檔 | `git ls-files sgud`(空);本輪新建之 `sgud/` 四檔 |
