import { _decorator, Component } from 'cc';
import { SpinResultData } from '../GameData/SpinResultData';
import { GameConfig } from '../GameUtility/GameConfig';
import { ReelController } from '../Reel/ReelController';

const { ccclass, property } = _decorator;

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

    // 依 Spin Result 的中獎位置播放 Win 表現
    public ShowReward( spinResult: SpinResultData, onRewardComplete: () => void ): void
    {
        this._isShowingReward = true;
        this._onRewardComplete = onRewardComplete;
        const rewardEffectTargets: IRewardEffectTarget[] = this.getRewardEffectTargets( spinResult );

        if ( rewardEffectTargets.length === 0 )
        {
            this.completeReward();
            return;
        }

        for ( const rewardTarget of rewardEffectTargets )
        {
            this.ReelController!.PlayWin( rewardTarget.ReelIndex, rewardTarget.RowIndex );
        }

        this.scheduleOnce( this.completeReward, GameConfig.GetInstance().RewardShowDuration );
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
                const rewardKey: string = `${winningPosition.ReelIndex}_${winningPosition.RowIndex}`;

                if ( rewardTargetKeys.has( rewardKey ) )
                {
                    continue;
                }

                rewardTargetKeys.add( rewardKey );
                rewardEffectTargets.push( { ReelIndex: winningPosition.ReelIndex, RowIndex: winningPosition.RowIndex } );
            }
        }

        return rewardEffectTargets;
    }

    // 清除本輪 Reward 狀態後通知 SlotProcessor
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

    // 清除本輪 Reward 排程
    private resetReward(): void
    {
        this.unscheduleAllCallbacks();
    }
}
