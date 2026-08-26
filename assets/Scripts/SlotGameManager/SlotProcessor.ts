import { _decorator, Component } from 'cc';
import { ILineResultData } from '../GameData/LineResultData';
import { SpinResultData } from '../GameData/SpinResultData';
import { SymbolType } from '../GameData/SymbolType';
import { ReelController } from '../Reel/ReelController';
import { ISpinResultProvider, LocalSpinResultProvider } from './LocalSpinResultProvider';
const { ccclass, property } = _decorator;

// 尚未建立下注系統前使用的固定單注
const FIXED_BET: number = 100;

@ccclass( 'SlotProcessor' )
export class SlotProcessor extends Component
{
    // 負責多軸 Spin 與 Stop 流程的 ReelController
    @property( { type: ReelController } )
    public ReelController: ReelController | null = null;

    // 提供目前單局使用的 Spin Result
    private _spinResultProvider: ISpinResultProvider = new LocalSpinResultProvider();

    // 保存目前 Round 使用的完整 Spin Result
    private _spinResult: SpinResultData | null = null;

    // 目前是否正在處理單一 Round
    private _isRoundRunning: boolean = false;

    // 目前是否正在處理單一 Round
    public get IsRoundRunning(): boolean
    {
        return this._isRoundRunning;
    }

    // 目前 Round 是否可以要求 Skip
    public get CanSkipRound(): boolean
    {
        return this._isRoundRunning && ( this.ReelController?.CanSkipSpin ?? false );
    }

    // 啟動單一 Round，取得完整結果並交給 ReelController
    public StartRound(): boolean
    {
        if ( this._isRoundRunning || !this.ReelController || !this.ReelController.StartSpin( this.completeRound.bind( this ) ) )
        {
            return false;
        }

        this._isRoundRunning = true;

        const spinResult: SpinResultData | null = this._spinResultProvider.GetSpinResult( FIXED_BET );

        // 沒有合法結果時維持 Round 與 Reel 運轉，等待後續 retry 或 timeout 處理
        if ( spinResult === null )
        {
            return true;
        }

        const isSpinResultAccepted: boolean = this.ReelController.SetSpinResult( spinResult.SlotGrids );

        // 結果未被接受時不保存本局結果，讓 Reel 繼續運轉並等待後續處理
        if ( !isSpinResultAccepted )
        {
            console.warn( '[SlotProcessor] Spin Result 未被 ReelController 接受，Reel 將繼續運轉。' );
            return true;
        }

        this._spinResult = spinResult;

        console.log( '[SlotProcessor] 取得盤面結果', this._spinResult.SlotGrids.map( ( reelSymbols: SymbolType[] ) => reelSymbols.map( ( symbol: SymbolType ) => SymbolType[ symbol ] ) ) );

        return true;
    }

    // 將目前 Round 的 Skip 操作交給 ReelController 判斷
    public SkipRound(): boolean
    {
        if ( !this.CanSkipRound || !this.ReelController )
        {
            return false;
        }

        return this.ReelController.SkipSpin();
    }

    // Reel 全部停止後處理目前 Round 的結果
    private completeRound(): void
    {
        const spinResult: SpinResultData | null = this._spinResult;
        this._spinResult = null;
        this._isRoundRunning = false;

        if ( spinResult === null )
        {
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
    }
}
