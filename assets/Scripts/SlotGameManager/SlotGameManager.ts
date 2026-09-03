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
    // 負責單一 Round 流程的 SlotProcessor
    @property( { type: SlotProcessor } )
    public SlotProcessor: SlotProcessor | null = null;

    // 保存玩家資料；SlotGameManager 只決定各 Round 階段何時修改
    @property( { type: PlayerInfo } )
    public PlayerInfo: PlayerInfo | null = null;

    // 玩家目前選擇的 Reel Speed Level；Round 進行中不允許切換
    private _reelSpeedLevel: ReelSpeedLevel = ReelSpeedLevel.Normal;

    // 只保存玩家設定的 Auto Spin 局數；0 代表尚未設定，目前還不啟動 Auto Flow
    private _autoSpinCount: number = 0;

    private _isAutoRunning: boolean = false;

    public get IsAutoRunning(): boolean
    {
        return this._isAutoRunning;
    }

    // UI 只需要知道 Turbo 是否啟用，不直接依賴 Reel Speed 的完整類型
    public get IsTurbo(): boolean
    {
        return this._reelSpeedLevel === ReelSpeedLevel.Turbo;
    }

    public get AutoSpinCount(): number
    {
        return this._autoSpinCount;
    }

    // 目前是否正在處理單一 Round
    public get IsRoundRunning(): boolean
    {
        return this.SlotProcessor?.IsRoundRunning ?? false;
    }

    // 目前是否可以開始新的 Round
    public get CanStartRound(): boolean
    {
        return ( this.SlotProcessor?.CanStartRound ?? false ) && ( this.PlayerInfo?.CanAffordBet ?? false );
    }

    // 目前 Round 是否可以要求 Skip
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

    // 只修改 Auto 局數設定；真正的 Start / Stop / Count Timing 留給 Auto Flow 負責
    public SetAutoSpinCount( autoSpinCount: number ): void
    {
        this._autoSpinCount = autoSpinCount;
    }

    // 根據目前選擇的 Reel Speed Level 啟動單一 Round
    public StartRound(): void
    {
        if ( !this.SlotProcessor || !this.PlayerInfo || !this.CanStartRound )
        {
            return;
        }

        const roundBet: number = this.PlayerInfo.Bet;
        this.SlotProcessor.StartRound( roundBet, this._reelSpeedLevel, this.onRewardStarted.bind( this ), this.completeRound.bind( this ) );

        // Round 成功進入 Spinning 後才清除上一局 Win 並扣除本局 Bet
        this.PlayerInfo.ResetWin();
        this.PlayerInfo.DeductBet();
    }

    // 將玩家的 Skip 操作交給目前 Round
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

    // Reward 完成且 SlotProcessor 回到 Idle 後，才將目前 Win 結算至 Balance
    private completeRound( spinResult: SpinResultData | null ): void
    {
        if ( spinResult === null || !this.PlayerInfo )
        {
            return;
        }

        this.PlayerInfo.AddWinToBalance();
    }
}