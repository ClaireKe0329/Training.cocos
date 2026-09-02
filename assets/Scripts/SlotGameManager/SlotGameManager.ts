import { _decorator, Component } from 'cc';
import { SpinResultData } from '../GameData/SpinResultData';
import { PlayerInfo } from '../Player/PlayerInfo';
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

    // 啟動單一 Round
    public StartRound(): void
    {
        if ( !this.SlotProcessor || !this.PlayerInfo || !this.CanStartRound )
        {
            return;
        }

        const roundBet: number = this.PlayerInfo.Bet;
        this.SlotProcessor.StartRound( roundBet, this.onRewardStarted.bind( this ), this.completeRound.bind( this ) );

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
