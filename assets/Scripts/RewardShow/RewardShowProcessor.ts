import { _decorator, Component } from 'cc';
import { SpinResultData } from '../GameData/SpinResultData';
import { ReelController } from '../Reel/ReelController';

const { ccclass, property } = _decorator;

// 基本 Win 顯示保留的時間
const REWARD_SHOW_DURATION: number = 1;
// 多個中獎位置輪播效果的切換間隔
const REWARD_EFFECT_INTERVAL: number = 0.4;

interface IRewardEffectTarget
{
    ReelIndex: number;
    RowIndex: number;
}

@ccclass( 'RewardShowProcessor' )
export class RewardShowProcessor extends Component
{
    // 接收中獎位置並將 Win 表現交給對應 Reel 與 SlotUnit
    @property( { type: ReelController } )
    public ReelController: ReelController | null = null;

    // 目前是否正在播放 Reward
    private _isShowingReward: boolean = false;

    // Reward 完成時通知 SlotProcessor
    private _onRewardComplete: ( () => void ) | null = null;

    // 目前輪播中的中獎位置
    private _rewardEffectTargets: IRewardEffectTarget[] = [];

    // 目前播放到的中獎位置索引
    private _rewardEffectIndex: number = 0;

    public get CanShowReward(): boolean
    {
        return !this._isShowingReward && this.ReelController !== null;
    }

    protected onDisable(): void
    {
        if ( this._isShowingReward )
        {
            this.completeReward();
            return;
        }

        this.resetReward();
    }

    // 消費既有 Spin Result，依序通知中獎位置播放表現
    public ShowReward( spinResult: SpinResultData, onRewardComplete: () => void ): void
    {
        this._isShowingReward = true;
        this._onRewardComplete = onRewardComplete;
        this.setupRewardEffectTargets( spinResult );

        if ( this._rewardEffectTargets.length === 0 )
        {
            this.completeReward();
            return;
        }

        this.playCurrentRewardEffect();

        if ( this._rewardEffectTargets.length > 1 )
        {
            this.schedule( this.playNextRewardEffect, REWARD_EFFECT_INTERVAL );
        }

        const rewardDuration: number = Math.max( REWARD_SHOW_DURATION, this._rewardEffectTargets.length * REWARD_EFFECT_INTERVAL );
        this.scheduleOnce( this.completeReward, rewardDuration );
    }

    // 根據 LineResult 建立本輪不重複的中獎位置
    private setupRewardEffectTargets( spinResult: SpinResultData ): void
    {
        this._rewardEffectTargets = [];
        this._rewardEffectIndex = 0;
        const rewardTargetKeys: Set<string> = new Set();

        for ( const lineResult of spinResult.LineResults )
        {
            for ( const winningPosition of lineResult.WinningPositions )
            {
                const rewardKey: string = `${winningPosition.ReelIndex}_${winningPosition.RowIndex}`;

                if ( rewardTargetKeys.has( rewardKey ) )
                {
                    continue;
                }

                rewardTargetKeys.add( rewardKey );
                this._rewardEffectTargets.push( { ReelIndex: winningPosition.ReelIndex, RowIndex: winningPosition.RowIndex } );
            }
        }
    }

    // 切換至下一個中獎位置並播放表現
    private playNextRewardEffect(): void
    {
        this._rewardEffectIndex = ( this._rewardEffectIndex + 1 ) % this._rewardEffectTargets.length;
        this.playCurrentRewardEffect();
    }

    // 將目前中獎位置交給 ReelController 播放 Win
    private playCurrentRewardEffect(): void
    {
        const rewardTarget: IRewardEffectTarget = this._rewardEffectTargets[ this._rewardEffectIndex ];
        this.ReelController!.PlayWin( rewardTarget.ReelIndex, rewardTarget.RowIndex );
    }

    // 重設 Reward lifecycle 後發出單次完成通知
    private completeReward(): void
    {
        if ( !this._isShowingReward )
        {
            return;
        }

        const onRewardComplete: ( () => void ) | null = this._onRewardComplete;
        this._isShowingReward = false;
        this._onRewardComplete = null;
        this.resetReward();
        onRewardComplete?.();
    }

    // 清除本輪 Reward 排程與暫存位置
    private resetReward(): void
    {
        this.unscheduleAllCallbacks();
        this._rewardEffectTargets = [];
        this._rewardEffectIndex = 0;
    }
}
