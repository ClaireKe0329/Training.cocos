import { _decorator, Component } from 'cc';
import { ILineResultData } from '../GameData/LineResultData';
import { SpinResultData } from '../GameData/SpinResultData';
import { SymbolType } from '../GameData/SymbolType';
import { ReelController } from '../Reel/ReelController';
import { RewardShowProcessor } from '../RewardShow/RewardShowProcessor';
import { ISpinResultProvider, LocalSpinResultProvider } from './LocalSpinResultProvider';
const { ccclass, property } = _decorator;

@ccclass( 'SlotProcessor' )
export class SlotProcessor extends Component
{
    // 負責多軸 Spin 與 Stop 流程的 ReelController
    @property( { type: ReelController } )
    public ReelController: ReelController | null = null;

    // Reel 完成後負責播放本局中獎表現
    @property( { type: RewardShowProcessor } )
    public RewardShowProcessor: RewardShowProcessor | null = null;

    // 提供目前單局使用的 Spin Result
    private _spinResultProvider: ISpinResultProvider = new LocalSpinResultProvider();

    // 保存目前 Round 使用的完整 Spin Result
    private _spinResult: SpinResultData | null = null;

    // 目前是否正在處理單一 Round
    private _isRoundRunning: boolean = false;

    // Round 完成後通知 SlotGameManager
    private _onRoundComplete: ( ( spinResult: SpinResultData | null ) => void ) | null = null;

    // 取得目前 Round 是否正在執行
    public get IsRoundRunning(): boolean
    {
        return this._isRoundRunning;
    }

    // 目前 Round 是否可以要求 Skip
    public get CanSkipRound(): boolean
    {
        return this._isRoundRunning && ( this.ReelController?.CanSkipSpin ?? false );
    }

    // 目前是否可以開始新 Round
    public get CanStartRound(): boolean
    {
        return !this._isRoundRunning && this.ReelController !== null && this.RewardShowProcessor !== null && this.ReelController.CanStartSpin && this.RewardShowProcessor.CanShowReward;
    }

    // 啟動單一 Round，取得完整結果並交給 ReelController
    public StartRound( bet: number, onRoundComplete: ( spinResult: SpinResultData | null ) => void ): boolean
    {
        if ( !this.CanStartRound || !this.ReelController!.StartSpin( this.onReelComplete.bind( this ) ) )
        {
            return false;
        }

        this._isRoundRunning = true;
        this._onRoundComplete = onRoundComplete;

        const spinResult: SpinResultData | null = this._spinResultProvider.GetSpinResult( bet );

        // 沒有可用結果時不設定停輪結果，Reel 維持運轉
        if ( spinResult === null )
        {
            return true;
        }

        this.ReelController.SetSpinResult( spinResult.SlotGrids );
        this._spinResult = spinResult;

        console.log( '[SlotProcessor] 取得盤面結果', this._spinResult.SlotGrids.map( ( reelSymbols: SymbolType[] ) => reelSymbols.map( ( symbol: SymbolType ) => SymbolType[ symbol ] ) ) );

        return true;
    }

    // 將目前 Round 的 Skip 操作交給 ReelController 判斷
    public SkipRound(): boolean
    {
        if ( !this.CanSkipRound )
        {
            return false;
        }

        return this.ReelController!.SkipSpin();
    }

    // Reel 全部停止後使用同一份 Result 進入 Reward Flow
    private onReelComplete(): void
    {
        if ( this._spinResult === null )
        {
            this.completeRound();
            return;
        }

        this.RewardShowProcessor!.ShowReward( this._spinResult, this.completeRound.bind( this ) );
    }

    // Reward 完成後結束目前 Round 並通知 SlotGameManager
    private completeRound(): void
    {
        if ( !this._isRoundRunning )
        {
            return;
        }

        const spinResult: SpinResultData | null = this._spinResult;
        const onRoundComplete: ( ( spinResult: SpinResultData | null ) => void ) | null = this._onRoundComplete;
        this._spinResult = null;
        this._isRoundRunning = false;
        this._onRoundComplete = null;

        if ( spinResult === null )
        {
            onRoundComplete?.( null );
            return;
        }

        const lineScores = spinResult.LineResults.map( ( lineResult: ILineResultData ) => ( {
            PaylineNumber: lineResult.PaylineIndex + 1,
            Symbol: SymbolType[ lineResult.SymbolType ],
            MatchCount: lineResult.MatchCount,
            Score: lineResult.Score,
        } ) );

        console.log( '[SlotProcessor] 各中獎 Payline 得分', lineScores );
        console.log( '[SlotProcessor] 本局得分', spinResult.TotalScore );
        onRoundComplete?.( spinResult );
    }

}
