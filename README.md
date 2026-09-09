# Cocos Slot 新人訓練

使用 **Cocos Creator 3.8.3 + TypeScript** 製作的基礎 Slot Game。

本專案為公司新人訓練作業，主要練習 Slot 遊戲的基本流程與程式架構，包括 Reel 滾動、Spin Result、Payline 判斷、Score Calculation、Reward、Auto Spin、Skip 與 State Machine。

專案架構參考公司既有 Slot 專案的 Responsibility 分層方式，並依新人訓練需求縮小實作範圍，讓各模組的責任與依賴方向保持清楚。

## 開發環境

- Cocos Creator 3.8.3
- TypeScript
- 5 Reels × 3 Rows
- 8 Symbols
- 25 Paylines

## 遊戲功能

### Spin

玩家按下 Spin 後會開始一局完整的 Slot 流程：

```text
Start Round
    ↓
Reel Spin
    ↓
取得 Spin Result
    ↓
Reel Stop
    ↓
Payline Check
    ↓
Score Calculation
    ↓
Reward
    ↓
Round Complete
```

### Reel

- 五軸同時開始滾動
- Reel 依序停止
- 根據 Spin Result 顯示指定盤面
- 停輪時播放 Shock 表現
- 支援 Normal、Turbo 與 Skip 速度

### Payline

使用 25 條 Payline 判斷盤面結果。

每條 Payline 都從最左側 Reel 開始，依序向右判斷相同 Symbol 的連續數量，並根據 3、4、5 連結果計算得分。

### Player Info

遊戲顯示：

- Balance
- Bet
- Win

Bet 可透過 Bet Selection Panel 選擇。

### Auto Spin

玩家可以選擇 Auto Spin 局數後開始自動遊戲。

支援：

- 指定局數
- Infinite Auto
- 執行中停止 Auto
- Auto Spin 過程切換 Turbo

### Skip

Spin 過程中可使用 Stop 加速剩餘 Reel 的停輪流程。

Reward 播放期間可再次使用 Stop 跳過目前的中獎演出。

Skip 只縮短演出流程，不會改變該局的 Spin Result 或 Score。

## 操作方式

| 操作 | 功能 |
|---|---|
| Spin | 開始 Manual Spin，已設定 Auto 時則開始 Auto Spin |
| Stop | 加速 Reel 停輪，Reward 播放期間可跳過演出 |
| Turbo | 切換 Normal / Turbo |
| Auto | 選擇 Auto Spin 局數，執行中再次點擊可停止後續 Auto |
| Bet | 選擇下一局使用的 Bet |

## 專案結構

```text
assets/
├─ Data/
│  └─ config.json
│
├─ Prefabs/
│  ├─ GameUI/
│  └─ Reel/
│
├─ Scenes/
│  └─ Main.scene
│
└─ Scripts/
   ├─ GameData/
   ├─ GameUI/
   ├─ GameUtility/
   ├─ MainScene/
   ├─ Player/
   ├─ Reel/
   ├─ RewardShow/
   └─ SlotGameManager/
```

## 核心模組

### GameUIController

處理玩家操作與 UI 顯示。

### SlotGameManager

提供遊戲操作入口，管理 Auto、Turbo、Bet、Round Settlement 等 Game-Level 流程。

### SlotProcessor

負責單一 Round 的流程協調，串接 Spin Result、Reel 與 Reward。

### LocalSpinResultProvider

產生本局盤面，並透過 `SpinResultChecker` 與 `ScoreCalculator` 建立完整的 `SpinResultData`。

### SpinResultChecker

根據盤面與 Payline 判斷中獎結果。

### ScoreCalculator

根據 Line Result、Bet 與 Symbol Multiplier 計算各線得分與 Total Score。

### ReelController

管理五軸 Reel 的 Start、Stop Sequence、Speed、Skip 與 Completion。

### Reel

管理單軸 SlotUnit 循環、最終結果放置與停輪流程。

### SlotUnit

負責單一 Symbol 的顯示與 Win Effect。

### RewardShowProcessor

根據既有的 Spin Result 播放中獎表現並管理 Reward Flow。

### PlayerInfo

保存玩家的 Balance、Bet 與 Win。

## State Flow

專案依不同 Responsibility 分別管理自己的 State。

```text
SlotProcessor
Idle → Spinning → ShowingReward → Complete → Idle

ReelController
Idle → Spinning → Stopping → Complete → Idle

Reel
Idle → Run → ReadyToStop → Stop → Shock → Idle

RewardShowProcessor
Idle → Showing → Complete → Idle
```

Auto Spin 屬於操作模式，Manual 與 Auto 共用相同的 Round Flow。

## Game Config

主要遊戲設定集中於：

```text
assets/Data/config.json
```

包含：

- Reel Speed Settings
- Shock Settings
- Initial Balance / Bet
- Reward Show Duration
- Auto Spin Settings
- Bet Settings
- Paylines
- Symbol Multipliers

## 執行方式

1. 使用 **Cocos Creator 3.8.3** 開啟專案。
2. 開啟 `assets/Scenes/Main.scene`。
3. 使用 Cocos Creator Preview 執行遊戲。
