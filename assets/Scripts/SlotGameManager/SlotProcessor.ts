import { _decorator, Component } from 'cc';
import { SpinResultData } from '../GameData/SpinResultData';
import { SymbolType } from '../GameData/SymbolType';
import { ReelController } from '../Reel/ReelController';
import { ISpinResultProvider, LocalSpinResultProvider } from './LocalSpinResultProvider';
const { ccclass, property } = _decorator;

@ccclass( 'SlotProcessor' )
export class SlotProcessor extends Component
{
    // 負責多軸 Spin 與 Stop 流程的 ReelController
    @property( { type: ReelController } )
    public ReelController: ReelController | null = null;

    // 提供目前單局使用的 Spin Result
    private _spinResultProvider: ISpinResultProvider = new LocalSpinResultProvider();

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

    // 啟動單一 Round，並將 Provider 產生的結果交給 ReelController
    public StartRound(): boolean
    {
        if ( this._isRoundRunning || !this.ReelController || !this.ReelController.StartSpin( this.completeRound.bind( this ) ) )
        {
            return false;
        }

        this._isRoundRunning = true;

        const spinResult: SpinResultData = this._spinResultProvider.GetSpinResult();
        console.log( '[SlotProcessor] 取得盤面結果', spinResult.SlotGrids.map( ( reelSymbols: SymbolType[] ) => reelSymbols.map( ( symbol: SymbolType ) => SymbolType[ symbol ] ) ) );
        this.ReelController.SetSpinResult( spinResult.SlotGrids );
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

    // 完成目前 Round，作為後續結果檢查與結算流程的銜接點
    private completeRound(): void
    {
        this._isRoundRunning = false;
    }
}
