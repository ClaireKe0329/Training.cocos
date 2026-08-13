# Mahjong 專案完成總結
## 索引
- [核心架構概念](#核心架構概念)
  - [1 遊戲啟動與進入遊戲](#1-遊戲啟動與進入遊戲)
  - [2 Server Notify 解析方式](#2-server-notify-解析方式)
  - [3 Notify 對應演出狀態](#3-notify-對應演出狀態)
- [Notify 類型與責任（摘要）](#notify-類型與責任摘要)
- [架構圖網址（Miro）](#架構圖網址miro)
- [工具整合：Excel 表格](#工具整合excel-表格)
- [已表格化的資料模組](#已表格化的資料模組)
- [未來優化](#未來優化)

## 核心架構概念
 
### 1 遊戲啟動與進入遊戲
- 遊戲啟動入口
  - Cocos v3.8.3
  - \assets\Start\Controller\main.ts
  - start.scene
- 遊戲 Config 設定
  - ```json
    {
    "GameCode": "WTS002",
    "GameName": "啪麻雀",
    "WebAPI": "https://dev-api.apex-win.com/0/api/game/link",
    "Version": "0",
    "Server": [
        "localhost:15091/h5nmj-dev/room",
        "dev.apex-win.com/h5nmj-dev/room"
    ],
    "IsReplay": false,
    "ConnectMode": 3
    }
    ```

  - GameCode：遊戲代碼
  - GameName:遊戲名稱
  - WebAPI:直連開發中控
  - Version:遊戲版本號設定
  - Server:戰鬥服GCP位置
  - IsReplay:重播狀態 (true:重播\false一般遊戲)
    - 網址後面加入??replayUrl=https://storage.googleapis.com/ws-h5nmjserver-qaqc-replaydata/replays/h5nmj.牌局id
    - http://localhost:7456/?replayUrl=https://storage.googleapis.com/ws-h5nmjserver-qaqc-replaydata/replays/h5nmj.T1767169491243
  - ConnectMode 連線模式
    - 0 = 連本機Server
    - 1 = 連 GCP Server
    - 2 = 正式流程
    - 3 = 經過中控連戰鬥服 GCP Server
-  文件位置
    -  assets\Json\GameConfig.json
 
### 2 Server Notify 解析方式
- NetworkHandler 會接收 Server Notify
- 接受到的 Notify 會被放入 **NotifyArray（Queue）**
- 以 `isParsing` 做「單執行緒解析」：
  - 若正在 parsing：新 notify 只入列、不插隊 (當notify大於2時會進入同步模式)
  - parsing 完成：取下一筆繼續
- 解析後交給 GameModule / GameController 推進本地狀態與演出
 
### 3 Notify 對應演出狀態
每一種 Notify會在(GameModule)進行資料解析再以狀態機對應一段清楚的演出腳本(GameController)，結束後回到 Queue 解析下一段；
 
---
 
## Notify 類型與責任（摘要）
 
- **SeatingNotify**：座位 / 玩家資料初始化、UI 初始化
- **PreGameNotify**：投骰、決定莊家、開牌、補花等開局流程  
- **GameStartNotify**：發起始手牌／起手演出  
- **DrawCardNotify**：抽牌 → 玩家可行動（等待出牌）  
- **DiscardCardNotify**：玩家出牌 → 觸發可吃碰槓胡判定 / 指示下一步  
- **MeldActionNotify**：吃碰槓動作  
- **PostGameNotify**：胡牌演出、番型/結果顯示、結算流程  
- **EndGameNotify**：回合收尾、紀錄/同步、準備下一局或回大廳  
---
 
## 架構圖網址（Miro）
 
https://miro.com/app/board/uXjVGSb5row=/?share_link_id=558172816548
 
---

 
## 工具整合：Excel 表格
 
- 將多項遊戲設以 **Excel Table → 匯出（JSON/Config）→ 由 (MahjongConfig & TableConfig) 載入遊戲**，提升可維護性與調整效率（企劃可直接改表，不需改程式）。
- Exel路徑 **Exel\麻將表  & Exel\麻將語音表**
- 麻將表生成的表:
  - MahjongLanguageTable
  - MahjongFanTable
  - MahjongErrorTable
- 麻將語音表生成的表:
  - VoicePath
  - VoiceName
  - EffectAudio
  - SystemVoice
  - BGMAudio
  

## 已表格化的資料模組
 
- **MahjongLanguageTable(未完成)**
  - 用途：多語系字串（UI 文案、牌型名稱、系統提示等）
  - 效益：可快速新增語言/改文案，避免散落在程式中
  - 路徑：assets\Json\MahjongLanguageTable
 
- **MahjongFanTable**
  - 用途：番型定義、番數/台數、判定條件描述、顯示排序等、是否顯示大獎(未完成)
  - 效益：番型擴充與數值調整不用改邏輯層（僅需補表與對應 key）
  - 路徑：assets\Json\MahjongFanTable
 
- **MahjongErrorTable**
  - 用途：錯誤碼 → 顯示標題/內容（可配合 i18n）
  - 效益：Server error code 對應顯示統一管理，避免 UI 到處寫 switch-case
  - 路徑：assets\Json\MahjongErrorTable
 
- **VoicePath、VoiceName**
  - 用途：依照語音人物不同進行分類，用以檢索不同人物與區分不同性別，對應不同語音音量
  - 效益：音訊資源統一管理、方便替換與調整，避免硬綁檔名與路徑
  - 路徑：assets\Audio\table\VoicePath & assets\Audio\table\VoiceName

- **SystemVoice**
  - 用途：整理系統語音撥放路徑與相對應的音量
  - 效益：音訊資源統一管理、方便替換與調整
  - 路徑：assets\Audio\table\SystemVoice

- **EffectAudio**
  - 用途：整理音效撥放路徑與相對應的音量，吃碰槓相關音效id用以對應程式enum參數
  - 效益：音訊資源統一管理、方便替換與調整
  - 路徑：assets\Audio\table\EffectAudio

- **BGMAudio**
  - 用途：整理背景音樂撥放路徑與相對應的音量，路徑以陣列的方式實現BGM隨機選取功能
  - 效益：音訊資源統一管理、方便替換與調整
  - 路徑：assets\Audio\table\BGMAudio


## 未來優化
  **未來優化.md**
  - [Mahjong未來優化](未來優化.md)
  