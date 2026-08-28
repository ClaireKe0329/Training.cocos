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

// 根據既有 Spin Result 控制中獎表現流程，不重新判斷中獎或計算分數
@ccclass( 'RewardShowProcessor' )
export class RewardShowProcessor extends Component
{
    // 將中獎位置的 Win 表現交給 ReelController
    @property( { type: ReelController } )
    public ReelController: ReelController | null = null;

    // 目前是否正在播放 Reward
    private _isShowingReward: boolean = false;

    // Reward 完成時通知 SlotProcessor
    private _onRewardComplete: ( () => void ) | null = null;

    // 沒有進行中的 Reward，且播放 Win 所需的 ReelController 已設定時才能開始
    public get CanShowReward(): boolean
    {
        return !this._isShowingReward && this.ReelController !== null;
    }

    // Component 停用時不能讓 Reward 完成通知遺失，進行中的 Reward 會直接完成
    protected onDisable(): void
    {
        if ( this._isShowingReward )
        {
            // completeReward() 會同步清除排程並送出原本的完成 Callback
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

        // LineResult 可能有重複的中獎位置，先整理成本輪實際需要播放的 Slot 位置
        const rewardEffectTargets: IRewardEffectTarget[] = this.getRewardEffectTargets( spinResult );

        // 沒有中獎位置時不需要等待 Reward 表現，直接結束 Reward Flow
        if ( rewardEffectTargets.length === 0 )
        {
            this.completeReward();
            return;
        }

        // 每個 SlotUnit 都有自己的 WinEffect，因此所有中獎位置可以同時播放
        for ( const rewardTarget of rewardEffectTargets )
        {
            this.ReelController!.PlayWin( rewardTarget.ReelIndex, rewardTarget.RowIndex );
        }

        // WinEffect 播放後保留固定顯示時間，再通知 SlotProcessor 繼續完成 Round
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
                // 同一個 Slot 可能同時出現在多條中獎 Payline 中，因此以 Reel / Row 組合作為唯一位置 Key
                const rewardKey: string = `${winningPosition.ReelIndex}_${winningPosition.RowIndex}`;

                // 已加入的盤面位置不重複播放 Win
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

        // 先保存 Callback 並清除 Reward 狀態，再通知 SlotProcessor，避免 Callback 執行期間仍被視為 Reward 播放中
        const onRewardComplete: ( () => void ) | null = this._onRewardComplete;
        this._isShowingReward = false;
        this._onRewardComplete = null;
        this.resetReward();

        // Reward 狀態已完整清除後才通知 SlotProcessor 繼續完成 Round
        onRewardComplete?.();
    }

    // 清除 RewardShowProcessor 本輪建立的完成排程
    private resetReward(): void
    {
        this.unscheduleAllCallbacks();
    }
}
