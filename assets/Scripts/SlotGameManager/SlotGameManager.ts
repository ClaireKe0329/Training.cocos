import { _decorator, Component, CCFloat } from 'cc';
import { ReelController } from '../Reel/ReelController';
import { SymbolType } from '../GameData/SymbolType';
const { ccclass, property } = _decorator;

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
    @property( { type: ReelController } )
    public ReelController: ReelController | null = null;

    @property( { type: CCFloat, min: 0.1 } )
    public SpinDuration: number = 2;

    private _spinResult: SymbolType[][] = [];

    public get IsSpinning(): boolean
    {
        return this.ReelController?.IsRunning ?? false;
    }

    public get CanSkip(): boolean
    {
        return this.ReelController?.CanSkip ?? false;
    }

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

    public SkipSpin(): void
    {
        if ( !this.CanSkip )
        {
            return;
        }

        this.unschedule( this.normalStopSpin );
        this.ReelController?.SkipSpin( this._spinResult );
    }

    private normalStopSpin(): void
    {
        this.ReelController?.StopSpin( this._spinResult );
    }
}


