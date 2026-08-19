import { _decorator, Component, CCFloat } from 'cc';
import { ReelController } from '../Reel/ReelController';
import { SymbolType } from '../GameData/SymbolType';
const { ccclass, property } = _decorator;

// 暫時使用的固定五軸停輪結果
const TEMP_REEL_RESULTS: SymbolType[][] = [
    [ SymbolType.M1, SymbolType.A, SymbolType.M2 ],
    [ SymbolType.M3, SymbolType.K, SymbolType.Q ],
    [ SymbolType.M4, SymbolType.J, SymbolType.A ],
    [ SymbolType.Q, SymbolType.M2, SymbolType.K ],
    [ SymbolType.A, SymbolType.M1, SymbolType.J ],
];

@ccclass( 'SlotGameManager' )
export class SlotGameManager extends Component
{
    // 負責多軸 Spin 與 Stop 流程的 ReelController
    @property( { type: ReelController } )
    public ReelController: ReelController | null = null;

    // Normal Stop 前的 Spin 持續秒數
    @property( { type: CCFloat, min: 0.1 } )
    public SpinDuration: number = 2;

    // 目前一局使用的五軸停輪結果
    private _spinResult: SymbolType[][] = [];

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

    // 啟動 Spin 並排程 Normal Stop
    public StartSpin(): void
    {
        if ( !this.ReelController || !this.ReelController.StartSpin() )
        {
            return;
        }

        this._spinResult = TEMP_REEL_RESULTS;

        // 暫時使用固定的時間觸發 StopSpin
        this.unschedule( this.normalStopSpin );
        this.scheduleOnce( this.normalStopSpin, this.SpinDuration );
    }

    // 取消 Normal Stop 排程並要求剩餘 Reel 快速停輪
    public SkipSpin(): void
    {
        if ( !this.CanSkip )
        {
            return;
        }

        // Skip 後不再等待原本的 Normal Stop 時間
        this.unschedule( this.normalStopSpin );
        this.ReelController?.SkipSpin( this._spinResult );
    }

    // 將目前停輪結果交給 ReelController 開始 Normal Stop
    private normalStopSpin(): void
    {
        this.ReelController?.StopSpin( this._spinResult );
    }
}


