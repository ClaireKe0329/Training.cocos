import { _decorator, Component } from 'cc';
import { ILineResultData } from '../GameData/LineResultData';
import { SpinResultData } from '../GameData/SpinResultData';
import { SymbolType } from '../GameData/SymbolType';
import { FSMachine } from '../GameUtility/FSMachine';
import { ReelController } from '../Reel/ReelController';
import { RewardShowProcessor } from '../RewardShow/RewardShowProcessor';
import { ISpinResultProvider, LocalSpinResultProvider } from './LocalSpinResultProvider';

const { ccclass, property } = _decorator;

enum SlotProcessorState
{
    // 目前沒有進行中的 Round，可接受下一局
    Idle,

    // Round 已開始，目前正在進行 Reel Flow
    Spinning,

    // Reel 已完成，目前正在播放 Reward
    ShowingReward,

    // Reel 與 Reward Flow 已完成，通知上層完成本局資料處理
    Complete,
}

// 負責單一 Round Flow、保存本局 Result，並串接 Reel 與 Reward 的完成時機
@ccclass( 'SlotProcessor' )
export class SlotProcessor extends Component
{
    // 負責多軸 Spin 與 Stop Flow 的 ReelController
    @property( { type: ReelController } )
    public ReelController: ReelController | null = null;

    // Reel 完成後負責播放本局中獎表現
    @property( { type: RewardShowProcessor } )
    public RewardShowProcessor: RewardShowProcessor | null = null;

    // 提供目前單局使用的 Spin Result
    private _spinResultProvider: ISpinResultProvider = new LocalSpinResultProvider();

    // 保存目前 Round 使用的完整 Spin Result
    private _spinResult: SpinResultData | null = null;

    // 保存目前 Round 使用的 Bet
    private _roundBet: number = 0;

    // 管理目前單一 Round 所在的流程階段
    private _fsMachine: FSMachine<SlotProcessorState> = new FSMachine( SlotProcessorState.Idle );

    // Round Complete 並 Reset 後通知 SlotGameManager
    private _onRoundFinished: ( ( spinResult: SpinResultData | null ) => void ) | null = null;

    // 目前是否仍在處理單一 Round
    public get IsRoundRunning(): boolean
    {
        return this._fsMachine.CurrentState !== SlotProcessorState.Idle;
    }

    // 目前是否可以開始新的 Round
    public get CanStartRound(): boolean
    {
        return this._fsMachine.CurrentState === SlotProcessorState.Idle
            && this.ReelController !== null
            && this.RewardShowProcessor !== null
            && this.ReelController.CanStartSpin
            && this.RewardShowProcessor.CanShowReward;
    }

    // 目前是否處於 Reel Flow 並允許要求 Skip
    public get CanSkipRound(): boolean
    {
        return this._fsMachine.CurrentState === SlotProcessorState.Spinning
            && ( this.ReelController?.CanSkipSpin ?? false );
    }

    // Component 載入時建立 Round FSM
    protected onLoad(): void
    {
        this.initFSM();
    }

    // 啟動單一 Round
    public StartRound( bet: number, onRoundFinished: ( spinResult: SpinResultData | null ) => void ): void
    {
        if ( !this.CanStartRound )
        {
            return;
        }

        this._roundBet = bet;
        this._onRoundFinished = onRoundFinished;

        this._fsMachine.ChangeState( SlotProcessorState.Spinning );
    }

    // 將目前 Round 的 Skip 操作交給 ReelController
    public SkipRound(): void
    {
        if ( !this.CanSkipRound )
        {
            return;
        }

        this.ReelController.SkipSpin();
    }

    // 初始化 Round FSM，將各階段真正的流程行為交由對應 State 負責
    private initFSM(): void
    {
        this._fsMachine.RegisterStateEvent( SlotProcessorState.Idle, {
            OnEnter: this.enterIdle.bind( this ),
        } );

        this._fsMachine.RegisterStateEvent( SlotProcessorState.Spinning, {
            OnEnter: this.enterSpinning.bind( this ),
        } );

        this._fsMachine.RegisterStateEvent( SlotProcessorState.ShowingReward, {
            OnEnter: this.enterShowingReward.bind( this ),
        } );

        this._fsMachine.RegisterStateEvent( SlotProcessorState.Complete, {
            OnEnter: this.enterComplete.bind( this ),
        } );

        this._fsMachine.Start();
    }

    // 進入 Idle 時清除上一局 lifecycle data，準備接受下一個 Round
    private enterIdle(): void
    {
        this._spinResult = null;
        this._roundBet = 0;
        this._onRoundFinished = null;
    }

    // 進入 Spinning 時啟動 Reel，並取得本局完整 Spin Result
    private enterSpinning(): void
    {
        this.ReelController.StartSpin( this.onReelComplete.bind( this ) );

        const spinResult: SpinResultData | null = this._spinResultProvider.GetSpinResult( this._roundBet );

        // 沒有可用 Result 時不設定停輪盤面，Reel 維持 Run 等待後續 Result Flow
        if ( spinResult === null )
        {
            return;
        }

        // SlotProcessor 保存完整 Result；ReelController 只取得最終停輪盤面
        this._spinResult = spinResult;
        this.ReelController.SetSpinResult( spinResult.SlotGrids );

        console.log( '[SlotProcessor] 取得盤面結果', spinResult.SlotGrids.map( ( reelSymbols: SymbolType[] ) => reelSymbols.map( ( symbol: SymbolType ) => SymbolType[ symbol ] ) ) );
    }

    // Reel 全部完成後離開 Spinning，依本局 Result 決定是否進入 Reward
    private onReelComplete(): void
    {
        if ( this._fsMachine.CurrentState !== SlotProcessorState.Spinning )
        {
            return;
        }

        if ( this._spinResult === null )
        {
            this._fsMachine.ChangeState( SlotProcessorState.Complete );
            return;
        }

        this._fsMachine.ChangeState( SlotProcessorState.ShowingReward );
    }

    // 進入 ShowingReward 時播放本局既有 Result 的 Reward
    private enterShowingReward(): void
    {
        this.RewardShowProcessor.ShowReward( this._spinResult, this.onRewardComplete.bind( this ) );
    }

    // Reward 完成後進入 Round Complete
    private onRewardComplete(): void
    {
        if ( this._fsMachine.CurrentState !== SlotProcessorState.ShowingReward )
        {
            return;
        }

        this._fsMachine.ChangeState( SlotProcessorState.Complete );
    }

    // 進入 Complete 時完成本局資料處理，再回到 Idle Reset
    private enterComplete(): void
    {
        const spinResult: SpinResultData | null = this._spinResult;
        const onRoundFinished: ( ( spinResult: SpinResultData | null ) => void ) | null = this._onRoundFinished;

        if ( spinResult !== null )
        {
            const lineScores = spinResult.LineResults.map( ( lineResult: ILineResultData ) => ( {
                PaylineNumber: lineResult.PaylineIndex + 1,
                Symbol: SymbolType[ lineResult.SymbolType ],
                MatchCount: lineResult.MatchCount,
                Score: lineResult.Score,
            } ) );

            console.log( '[SlotProcessor] 各中獎 Payline 得分', lineScores );
            console.log( '[SlotProcessor] 本局得分', spinResult.TotalScore );
        }

        // Round 已 Complete，接著進入 Idle Reset lifecycle data
        this._fsMachine.ChangeState( SlotProcessorState.Idle );

        // Reset 完成後才通知上層，callback 執行時已可安全開始下一局
        onRoundFinished?.( spinResult );
    }
}
