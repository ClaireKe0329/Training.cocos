# 麻將牌堆 RTP (Return to Player) 系統說明

## 概述

RTP系統是一個智能的牌堆管理機制，可以根據設定的返還率來控制給玩家的牌，以達到平衡遊戲體驗的目的。

## 主要功能

### 1. 智能抽牌控制
- 根據玩家當前手牌狀態分析牌的價值
- 動態調整給牌策略以維持目標RTP
- 支援多玩家獨立的RTP控制

### 2. 牌值分析系統
系統會從三個維度評估每張牌的價值：

#### a) 聽牌價值 (Waiting Value)
- 檢查牌是否能幫助玩家更接近聽牌狀態
- 形成刻子: 1.0分
- 形成對子: 0.7分  
- 可能形成順子: 0.5分

#### b) 番數價值 (Fan Value)
- 字牌（風牌、箭牌）: +0.3分
- 有助於形成特殊牌型: +0.5分

#### c) 完成度價值 (Completion Value)
- 可以碰或槓: 0.8分
- 形成對子: 0.3分

### 3. RTP控制邏輯
```typescript
// 當前RTP < 目標RTP：增加好牌機率
// 當前RTP > 目標RTP：減少好牌機率
// 當前RTP = 目標RTP：正常發牌
```

## 使用方法

### 基本使用

```typescript
// 1. 創建帶有RTP控制的牌堆
const deck = new MahjongDeck(0.85); // 85% RTP

// 2. 為特定玩家抽牌
const playerId = 1;
const card = deck.Draw(playerId);

// 3. 抽多張牌
const cards = deck.DrawMultiple(13, playerId);
```

### 進階控制

```typescript
// 動態調整RTP
deck.setTargetRTP(0.95); // 調整為95%

// 獲取RTP狀態
const rtpState = deck.getRTPState();
console.log(`當前RTP: ${rtpState.currentRTP}`);
console.log(`總抽牌數: ${rtpState.totalDraws}`);
console.log(`有利抽牌數: ${rtpState.favorableDraws}`);

// 重置RTP狀態
deck.resetRTPState();
```

## 配置參數

### 常數設定
```typescript
const DEFAULT_RTP: number = 0.95;          // 預設RTP: 95%
const RTP_ADJUSTMENT_FACTOR: number = 0.1; // RTP調整因子: 10%
const GOOD_CARD_THRESHOLD: number = 0.7;   // 好牌閾值: 70%
const BAD_CARD_THRESHOLD: number = 0.3;    // 壞牌閾值: 30%
```

### RTP狀態結構
```typescript
interface RTPState {
    currentRTP: number;        // 當前RTP值
    targetRTP: number;         // 目標RTP值
    totalDraws: number;        // 總抽牌數
    favorableDraws: number;    // 有利抽牌數
    needsAdjustment: boolean;  // 是否需要調整
}
```

## 最佳實踐

### 1. RTP值設定建議
- **新手玩家**: 0.90-0.95 (給予更多好牌)
- **一般玩家**: 0.85-0.90 (平衡體驗)
- **高手玩家**: 0.80-0.85 (增加挑戰性)

### 2. 多玩家遊戲
```typescript
// 為不同玩家設定不同的抽牌策略
const beginnerCards = deck.DrawMultiple(13, beginnerPlayerId);
const expertCards = deck.DrawMultiple(13, expertPlayerId);
```

### 3. 即時調整
```typescript
// 根據遊戲進度動態調整RTP
if (gameProgress > 0.8) {
    deck.setTargetRTP(0.95); // 遊戲後期提高RTP
}
```

## 監控與調試

### RTP統計報告
```typescript
function printRTPReport(deck: MahjongDeck) {
    const state = deck.getRTPState();
    
    console.log("=== RTP報告 ===");
    console.log(`目標RTP: ${(state.targetRTP * 100).toFixed(2)}%`);
    console.log(`當前RTP: ${(state.currentRTP * 100).toFixed(2)}%`);
    console.log(`有利抽牌比例: ${((state.favorableDraws / state.totalDraws) * 100).toFixed(2)}%`);
    
    const deviation = Math.abs(state.currentRTP - state.targetRTP);
    if (deviation <= 0.05) {
        console.log("✅ RTP控制正常");
    } else {
        console.log("⚠️ RTP偏差過大，建議調整");
    }
}
```

## 注意事項

### 1. 效能考量
- 手牌記錄限制在20張以內，避免記憶體過度使用
- 牌值計算採用快速算法，避免複雜的胡牌檢測

### 2. 平衡性
- RTP不應該設得太高（>98%）或太低（<70%）
- 需要根據實際遊戲測試調整各項參數

### 3. 公平性
- 確保所有玩家在相同條件下有相似的RTP體驗
- 避免因RTP控制而造成明顯的不公平感

## 擴展功能

### 未來可以添加的功能
1. **學習型RTP**: 根據玩家歷史表現調整RTP
2. **情境感知**: 根據遊戲情況動態調整策略
3. **高級牌型檢測**: 整合更複雜的胡牌檢測邏輯
4. **統計分析**: 提供詳細的RTP分析報告

這個RTP系統為您的麻將遊戲提供了強大而靈活的牌堆控制能力，可以大幅提升玩家的遊戲體驗。
