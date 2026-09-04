// Auto Spin 可由玩家調整的設定資料
export interface IAutoSpinSettings
{
    readonly SpinCounts: number[];
    readonly InfiniteCount: number;
}

// Bet 可由玩家選擇的下注設定
export interface IBetSettings
{
    readonly BetValues: number[];
}
