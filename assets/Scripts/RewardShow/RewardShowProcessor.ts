import { _decorator, Component } from 'cc';
import { SpinResultData } from '../GameData/SpinResultData';
import { GameConfig } from '../GameUtility/GameConfig';
import { ReelController } from '../Reel/ReelController';

const { ccclass, property } = _decorator;

// Reward 表現實際要播放的盤面位置
interface IRewardEffectTarget
{
    ReelIndex: number;
    RowIndex: number;
}

// 根據既有 Spin Result 控制中獎表現，不重新判斷中獎或計算分數
@ccclass( 'RewardShowProcessor' )
export class RewardShowProcessor extends Component
{
    // 將中獎位置的 Win 表現交給 ReelController
    @property( { type: ReelController } )
    public ReelController: ReelController | null = null;

    // 目前是否正在播放 Reward
    private _isShowingReward: boolean = false;

    // Reward 完成並 Reset 後通知 SlotProcessor
    private _onRewardFinished: ( () => void ) | null = null;

    // 沒有正在播放的 Reward，且 ReelController 已設定時才能開始
    public get CanShowReward(): boolean
    {
        return !this._isShowingReward && this.ReelController !== null;
    }

    // 依 Spin Result 的中獎位置播放 Win 表現
    public ShowReward( spinResult: SpinResultData, onRewardFinished: () => void ): void
    {
        if ( !this.CanShowReward )
        {
            return;
        }

        this._isShowingReward = true;
        this._onRewardFinished = onRewardFinished;

        // LineResult 可能包含相同的中獎位置，先整理出實際需要播放的 Slot 位置
        const rewardEffectTargets: IRewardEffectTarget[] = this.getRewardEffectTargets( spinResult );

        // 沒有中獎位置時不需要等待 Reward 表演，直接完成
        if ( rewardEffectTargets.length === 0 )
        {
            this.completeReward();
            return;
        }

        // 每個 SlotUnit 都有自己的 WinEffect，因此所有中獎位置可以同時播放
        for ( const rewardTarget of rewardEffectTargets )
        {
            this.ReelController.PlayWin( rewardTarget.ReelIndex, rewardTarget.RowIndex );
        }

        // WinEffect 播放後保留固定顯示時間，再完成本次 Reward
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

    // 完成本次 Reward，再 Reset 並通知 SlotProcessor
    private completeReward(): void
    {
        if ( !this._isShowingReward )
        {
            return;
        }

        const onRewardFinished: ( () => void ) | null = this._onRewardFinished;

        this.resetReward();

        onRewardFinished?.();
    }

    // 清除本次 Reward 使用的狀態與排程
    private resetReward(): void
    {
        this.unscheduleAllCallbacks();
        this._isShowingReward = false;
        this._onRewardFinished = null;
    }
}