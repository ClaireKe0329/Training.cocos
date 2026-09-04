import { _decorator, Component } from 'cc';
import { SpinResultData } from '../GameData/SpinResultData';
import { GameConfig } from '../GameUtility/GameConfig';
import { PlayerInfo } from '../Player/PlayerInfo';
import { ReelSpeedLevel } from '../Reel/ReelSpeed';
import { SlotProcessor } from './SlotProcessor';

const { ccclass, property } = _decorator;

// 提供整台 Slot 的公開操作入口，並負責 Game-Level Operation Mode、Round Settlement 與 Auto Flow
@ccclass( 'SlotGameManager' )
export class SlotGameManager extends Component
{
    // 負責單一 Round Flow；SlotGameManager 不處理 Reel / Reward 細節
    @property( { type: SlotProcessor } )
    public SlotProcessor: SlotProcessor | null = null;

    // 保存玩家資料；SlotGameManager 只決定各 Round 階段何時修改
    @property( { type: PlayerInfo } )
    public PlayerInfo: PlayerInfo | null = null;

    // 保存玩家目前選擇的 Normal / Turbo；已開始的 Round 使用自己的 Speed snapshot，因此中途切換只影響下一局
    private _reelSpeedLevel: ReelSpeedLevel = ReelSpeedLevel.Normal;

    // Auto 設定值同時作為有限局數的剩餘 Count；0 代表目前沒有 Auto 設定
    private _autoSpinCount: number = 0;

    // Auto 是 Operation Mode，不是 Game State；此旗標只表示 Auto Flow 是否仍要繼續執行
    private _isAutoRunning: boolean = false;

    // UI 需要分辨「Count 已到 0 但最後一局仍在執行」與「Auto 已真正結束」
    public get IsAutoRunning(): boolean
    {
        return this._isAutoRunning;
    }

    // UI 只需要知道玩家目前選擇的是 Normal 還是 Turbo，不直接依賴 ReelSpeedLevel
    public get IsTurbo(): boolean
    {
        return this._reelSpeedLevel === ReelSpeedLevel.Turbo;
    }

    // 提供目前 Auto 設定 / 剩餘局數；Infinite sentinel 由 GameConfig 提供
    public get AutoSpinCount(): number
    {
        return this._autoSpinCount;
    }

    // 目前是否仍在處理單一 Round
    public get IsRoundRunning(): boolean
    {
        return this.SlotProcessor?.IsRoundRunning ?? false;
    }

    // 新 Round 必須同時滿足 SlotProcessor 已回 Idle，且玩家 Balance 足以支付目前 Bet
    public get CanStartRound(): boolean
    {
        return ( this.SlotProcessor?.CanStartRound ?? false ) && ( this.PlayerInfo?.CanAffordBet ?? false );
    }

    // Skip 是否可用由目前 Round 的 Reel / Reward Flow 決定，不由 UI 推測內部 Timing
    public get CanSkipRound(): boolean
    {
        return this.SlotProcessor?.CanSkipRound ?? false;
    }

    // 切換玩家下一局使用的 Normal / Turbo；目前已開始的 Round 不受影響
    public ToggleTurbo(): void
    {
        this._reelSpeedLevel = this._reelSpeedLevel === ReelSpeedLevel.Normal ? ReelSpeedLevel.Turbo : ReelSpeedLevel.Normal;
    }

    // 保存玩家選擇的 Auto 局數；選擇本身不開始 Auto 或 Round
    public SetAutoSpinCount( autoSpinCount: number ): void
    {
        this._autoSpinCount = autoSpinCount;
    }

    // 修改玩家下一局使用的 Bet；目前 Round 已保存 roundBet snapshot，因此中途變更不影響本局
    public SetBet( bet: number ): void
    {
        this.PlayerInfo?.SetBet( bet );
    }

    // 從目前 Auto 設定正式進入 Auto Flow，並開始第一局
    public StartAuto(): void
    {
        if ( this._isAutoRunning || this._autoSpinCount <= 0 || !this.CanStartRound )
        {
            return;
        }

        this._isAutoRunning = true;
        this.startAutoRound();
    }

    // 取消後續 Auto Round；目前已開始的 Round 仍照原本 Reel / Reward / Settlement Flow 完成
    public StopAuto(): void
    {
        this._autoSpinCount = 0;
        this._isAutoRunning = false;
    }

    // 啟動單一 Round；不判斷這局來自 Manual 或 Auto，也不處理 Auto Count
    public StartRound(): void
    {
        if ( !this.SlotProcessor || !this.PlayerInfo || !this.CanStartRound )
        {
            return;
        }

        // 本局 Bet 與 Reel Speed 在 Round 開始時固定，之後 UI 設定變更只影響下一局
        const roundBet: number = this.PlayerInfo.Bet;
        const reelSpeedLevel: ReelSpeedLevel = this._reelSpeedLevel;

        this.SlotProcessor.StartRound( roundBet, reelSpeedLevel, this.onRewardStarted.bind( this ), this.completeRound.bind( this ) );

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

    // 開始一個 Auto Round，並在這局確定成功開始後更新有限 Auto 的剩餘局數
    private startAutoRound(): void
    {
        if ( !this._isAutoRunning )
        {
            return;
        }

        // Balance 不足或 Processor 尚未回到可開始狀態時，Auto 到此結束
        if ( !this.CanStartRound )
        {
            this.StopAuto();
            return;
        }

        this.StartRound();

        // Infinite 保持 sentinel 不遞減；有限 Auto 在每局成功開始後才扣除一次
        if ( this._autoSpinCount !== GameConfig.GetInstance().AutoSpinInfiniteCount )
        {
            this._autoSpinCount--;
        }
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

    // Reward 完成且 SlotProcessor 已回 Idle 後先 Settlement，再決定 Auto 是否啟動下一局
    private completeRound( spinResult: SpinResultData | null ): void
    {
        if ( spinResult === null || !this.PlayerInfo )
        {
            this.StopAuto();
            return;
        }

        this.PlayerInfo.AddWinToBalance();

        if ( !this._isAutoRunning )
        {
            return;
        }

        // 最後一局開始時 Count 已是 0；要等這一局完整完成到此 boundary 才真正結束 Auto
        if ( this._autoSpinCount === 0 )
        {
            this.StopAuto();
            return;
        }

        this.startAutoRound();
    }
}
