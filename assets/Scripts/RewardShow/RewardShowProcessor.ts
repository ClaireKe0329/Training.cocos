import { _decorator, Component } from 'cc';
import { SpinResultData } from '../GameData/SpinResultData';
import { FSMachine } from '../GameUtility/FSMachine';
import { GameConfig } from '../GameUtility/GameConfig';
import { ReelController } from '../Reel/ReelController';

const { ccclass, property } = _decorator;

// Reward 表現實際要播放的盤面位置
interface IRewardEffectTarget
{
    ReelIndex: number;
    RowIndex: number;
}

enum RewardShowProcessorState
{
    // 沒有正在播放 Reward，可以接受下一次 ShowReward
    Idle,

    // 正在播放本次 Reward
    Showing,

    // 本次 Reward 已播放完成，準備回到 Idle
    Complete,
}

// 根據既有 Spin Result 控制中獎表現，不重新判斷中獎或計算分數
@ccclass( 'RewardShowProcessor' )
export class RewardShowProcessor extends Component
{
    // 將中獎位置的 Win 表現交給 ReelController
    @property( { type: ReelController } )
    public ReelController: ReelController | null = null;

    // 管理目前 Reward 的播放狀態
    private _fsMachine: FSMachine<RewardShowProcessorState> = new FSMachine( RewardShowProcessorState.Idle );

    // 本次 Reward 實際需要播放的盤面位置
    private _rewardEffectTargets: IRewardEffectTarget[] = [];

    // Reward 完成並回到 Idle 後通知 SlotProcessor
    private _onRewardFinished: ( () => void ) | null = null;

    // 沒有正在播放 Reward，且 ReelController 已設定時才能開始
    public get CanShowReward(): boolean
    {
        return this._fsMachine.CurrentState === RewardShowProcessorState.Idle
            && this.ReelController !== null;
    }

    // 只有 Reward 正在播放時才能由玩家提前結束演出
    public get CanSkipReward(): boolean
    {
        return this._fsMachine.CurrentState === RewardShowProcessorState.Showing;
    }

    protected onLoad(): void
    {
        this.initFSM();
    }

    // 保存本次 Reward 要播放的位置後進入 Showing
    public ShowReward( spinResult: SpinResultData, onRewardFinished: () => void ): void
    {
        if ( !this.CanShowReward )
        {
            return;
        }

        this._rewardEffectTargets = this.getRewardEffectTargets( spinResult );
        this._onRewardFinished = onRewardFinished;

        this._fsMachine.ChangeState( RewardShowProcessorState.Showing );
    }

    // Skip 只提前結束目前演出，仍沿用既有 Reward Complete 與 onRewardFinished Flow
    public SkipReward(): void
    {
        if ( !this.CanSkipReward )
        {
            return;
        }

        for ( const rewardTarget of this._rewardEffectTargets )
        {
            this.ReelController.ResetWin( rewardTarget.ReelIndex, rewardTarget.RowIndex );
        }

        this.completeReward();
    }

    private initFSM(): void
    {
        this._fsMachine.RegisterStateEvent( RewardShowProcessorState.Idle, {
            OnEnter: this.enterIdle.bind( this ),
        } );

        this._fsMachine.RegisterStateEvent( RewardShowProcessorState.Showing, {
            OnEnter: this.enterShowing.bind( this ),
        } );

        this._fsMachine.RegisterStateEvent( RewardShowProcessorState.Complete, {
            OnEnter: this.enterComplete.bind( this ),
        } );

        this._fsMachine.Start();
    }

    // 回到 Idle 時清除上一輪 Reward 使用的資料與排程
    private enterIdle(): void
    {
        this.unscheduleAllCallbacks();
        this._rewardEffectTargets = [];
        this._onRewardFinished = null;
    }

    // 進入 Showing 時開始播放本次 Reward
    private enterShowing(): void
    {
        // 沒有中獎位置時不需要等待 Reward 表演，直接完成
        if ( this._rewardEffectTargets.length === 0 )
        {
            this._fsMachine.ChangeState( RewardShowProcessorState.Complete );
            return;
        }

        // 每個 SlotUnit 都有自己的 WinEffect，因此所有中獎位置可以同時播放
        for ( const rewardTarget of this._rewardEffectTargets )
        {
            this.ReelController.PlayWin( rewardTarget.ReelIndex, rewardTarget.RowIndex );
        }

        this.scheduleOnce( this.completeReward, GameConfig.GetInstance().RewardShowDuration );
    }

    // Reward 表演時間結束後進入 Complete
    private completeReward(): void
    {
        if ( this._fsMachine.CurrentState !== RewardShowProcessorState.Showing )
        {
            return;
        }

        this._fsMachine.ChangeState( RewardShowProcessorState.Complete );
    }

    // Reward Complete 後回到 Idle 清除資料，再通知 SlotProcessor
    private enterComplete(): void
    {
        const onRewardFinished: ( () => void ) | null = this._onRewardFinished;

        this._fsMachine.ChangeState( RewardShowProcessorState.Idle );

        onRewardFinished?.();
    }

    // 根據 LineResult 整理本輪不重複的中獎位置
    private getRewardEffectTargets( spinResult: SpinResultData ): IRewardEffectTarget[]
    {
        const rewardEffectTargets: IRewardEffectTarget[] = [];
        const rewardTargetKeys: Set<string> = new Set();

        for ( const lineResult of spinResult.LineResults )
        {
            for ( const winningPosition of lineResult.WinningPositions )
            {
                // 同一個 Slot 可能同時出現在多條 Payline，因此用 Reel / Row 作為唯一位置
                const rewardKey: string = `${winningPosition.ReelIndex}_${winningPosition.RowIndex}`;

                if ( rewardTargetKeys.has( rewardKey ) )
                {
                    continue;
                }

                rewardTargetKeys.add( rewardKey );
                rewardEffectTargets.push( {
                    ReelIndex: winningPosition.ReelIndex,
                    RowIndex: winningPosition.RowIndex,
                } );
            }
        }

        return rewardEffectTargets;
    }
}
