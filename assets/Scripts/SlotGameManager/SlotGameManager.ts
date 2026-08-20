import { _decorator, Component } from 'cc';
import { SpinResultData } from '../GameData/SpinResultData';
import { SymbolType } from '../GameData/SymbolType';
import { ReelController } from '../Reel/ReelController';
import { ISpinResultProvider, LocalSpinResultProvider } from './LocalSpinResultProvider';
const { ccclass, property } = _decorator;

@ccclass( 'SlotGameManager' )
export class SlotGameManager extends Component
{
    // 負責多軸 Spin 與 Stop 流程的 ReelController
    @property( { type: ReelController } )
    public ReelController: ReelController | null = null;

    // 提供目前單局使用的 Spin Result
    private _spinResultProvider: ISpinResultProvider = new LocalSpinResultProvider();

    // 目前是否正在進行 Spin
    public get IsSpinning(): boolean
    {
        return this.ReelController?.IsRunning ?? false;
    }

    // 目前是否可以要求 Skip
    public get CanSkip(): boolean
    {
        return this.ReelController?.CanSkip ?? false;
    }

    // 啟動 Spin 並將 Provider 產生的結果交給 ReelController
    public StartSpin(): void
    {
        if ( !this.ReelController || !this.ReelController.StartSpin() )
        {
            return;
        }

        const spinResult: SpinResultData = this._spinResultProvider.GetSpinResult();
        console.log( '[SlotGameManager] 取得盤面結果', spinResult.SlotGrids.map( ( reelSymbols: SymbolType[] ) => reelSymbols.map( ( symbol: SymbolType ) => SymbolType[ symbol ] ) ) );
        this.ReelController.SetSpinResult( spinResult.SlotGrids );
    }

    // 將玩家的 Skip 操作交給 ReelController 判斷
    public SkipSpin(): void
    {
        if ( !this.CanSkip || !this.ReelController )
        {
            return;
        }

        this.ReelController.SkipSpin();
    }
}
