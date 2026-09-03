import { _decorator, Component } from 'cc';
import { SpinResultData } from '../GameData/SpinResultData';
import { PlayerInfo } from '../Player/PlayerInfo';
import { ReelSpeedLevel } from '../Reel/ReelSpeed';
import { SlotProcessor } from './SlotProcessor';

const { ccclass, property } = _decorator;

// 提供整台 Slot 的公開操作入口，並負責 Round 各階段修改 PlayerInfo 的時機與最終結算
@ccclass( 'SlotGameManager' )
export class SlotGameManager extends Component
{
    // 負責單一 Round Flow；SlotGameManager 不處理 Reel / Reward 細節
    @property( { type: SlotProcessor } )
    public SlotProcessor: SlotProcessor | null = null;

    // 保存玩家資料；SlotGameManager 只決定各 Round 階段何時修改
    @property( { type: PlayerInfo } )
    public PlayerInfo: PlayerInfo | null = null;

    // 玩家目前選擇的 Reel Speed Level；Round 進行中不允許切換
    private _reelSpeedLevel: ReelSpeedLevel = ReelSpeedLevel.Normal;

    // Auto 設定值同時作為有限局數的剩餘 Count；0 代表目前沒有 Auto 設定
    private _autoSpinCount: number = 0;

    // Auto 是 Operation Mode，不是 Game State；此旗標只表示 Auto Flow 是否仍在執行
    private _isAutoRunning: boolean = false;

    // UI 需要分辨「Count 已到 0 但最後一局仍在執行」與「Auto 已真正結束」
    public get IsAutoRunning(): boolean
    {
        return this._isAutoRunning;
    }

    // UI 只需要知道 Turbo 是否啟用，不直接依賴 Reel Speed 的完整類型
    public get IsTurbo(): boolean
    {
        return this._reelSpeedLevel === ReelSpeedLevel.Turbo;
    }

    // 提供目前 Auto 設定 / 剩餘局數；Infinite 的特殊值由 Auto 功能本身解讀
    public get AutoSpinCount(): number
    {
        return this._autoSpinCount;
    }

    // 目前是否正在處理單一 Round
    public get IsRoundRunning(): boolean
    {
        return this.SlotProcessor?.IsRoundRunning ?? false;
    }

    // 新 Round 必須同時滿足 SlotProcessor 已回 Idle，且玩家 Balance 足以支付 Bet
    public get CanStartRound(): boolean
    {
        return ( this.SlotProcessor?.CanStartRound ?? false ) && ( this.PlayerInfo?.CanAffordBet ?? false );
    }

    // Skip 只在目前 Round 的 Reel Flow 可接受時開放，不由 UI 自行推測 Reel Timing
    public get CanSkipRound(): boolean
    {
        return this.SlotProcessor?.CanSkipRound ?? false;
    }

    // 在 Round 之間切換 Normal / Turbo；目前 Round 的速度一旦開始就不再變更
    public ToggleTurbo(): void
    {
        if ( this.IsRoundRunning )
        {
            return;
        }

        this._reelSpeedLevel = this._reelSpeedLevel === ReelSpeedLevel.Normal ? ReelSpeedLevel.Turbo : ReelSpeedLevel.Normal;
    }

    // 目前只保存玩家選擇的 Auto 局數；真正 Start / Stop / Count 遞減 Timing 留給 Auto Flow 負責
    public SetAutoSpinCount( autoSpinCount: number ): void
    {
        this._autoSpinCount = autoSpinCount;
    }

    // 根據目前選擇的 Reel Speed Level 啟動單一 Round；Auto 後續也必須沿用同一個 Round 入口
    public StartRound(): void
    {
        if ( !this.SlotProcessor || !this.PlayerInfo || !this.CanStartRound )
        {
            return;
        }

        // 本局 Bet 在開始前固定下來，避免 Round 進行中 UI / 設定變動影響本局 Result 計算
        const roundBet: number = this.PlayerInfo.Bet;
        this.SlotProcessor.StartRound( roundBet, this._reelSpeedLevel, this.onRewardStarted.bind( this ), this.completeRound.bind( this ) );

        // SlotProcessor 已同步進入 Spinning 後才清除上一局 Win 並扣除本局 Bet
        this.PlayerInfo.ResetWin();
        this.PlayerInfo.DeductBet();
    }

    // 將玩家的 Skip 操作交給目前 Round；Skip 不修改 Result、Score 或 Settlement
    public SkipRound(): void
    {
        if ( !this.SlotProcessor || !this.CanSkipRound )
        {
            return;
        }

        this.SlotProcessor.SkipRound();
    }

    // Reward 開始時先更新 Win，讓 UI 與中獎表現在同一階段顯示本局得分
    private onRewardStarted( spinResult: SpinResultData ): void
    {
        if ( !this.PlayerInfo )
        {
            return;
        }

        this.PlayerInfo.SetWin( spinResult.TotalScore );
    }

    // Reward 完成且 SlotProcessor 回到 Idle 後才結算 Balance；這也是未來 Auto 判斷下一局的安全邊界
    private completeRound( spinResult: SpinResultData | null ): void
    {
        if ( spinResult === null || !this.PlayerInfo )
        {
            return;
        }

        this.PlayerInfo.AddWinToBalance();
    }
}
