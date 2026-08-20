import { _decorator, Component } from 'cc';
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

    // 啟動 Spin 並將暫時的固定結果交給 ReelController
    public StartSpin(): void
    {
        if ( !this.ReelController || !this.ReelController.StartSpin() )
        {
            return;
        }

        // 未來改由 SlotProcessor 提供 Spin Result
        this.ReelController.SetSpinResult( TEMP_REEL_RESULTS );
    }

    // 將玩家的 Skip 操作交給 ReelController 判斷
    public SkipSpin(): void
    {
        if ( !this.CanSkip )
        {
            return;
        }

        this.ReelController?.SkipSpin();
    }
}
