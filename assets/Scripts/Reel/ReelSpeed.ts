export enum ReelSpeedLevel
{
    Normal,
    Turbo,
    Skip,
}

// 單一 Reel Speed Level 使用的速度與停輪時間設定
export interface IReelSpeedSetting
{
    // Reel 每秒移動速度
    readonly SpinSpeed: number;

    // 自動停輪前最少需要運轉的時間
    readonly SpinDuration: number;

    // 各 Reel 依序收到 StopSpin 的時間間隔
    readonly ReelStopInterval: number;
}

// 三種 Reel Speed Level 對應的設定
export interface IReelSpeedSettings
{
    readonly Normal: IReelSpeedSetting;
    readonly Turbo: IReelSpeedSetting;
    readonly Skip: IReelSpeedSetting;
}