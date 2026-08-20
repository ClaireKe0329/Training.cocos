import { _decorator, CCFloat, Component } from 'cc';
import { SYMBOL_TYPE_LIST, SymbolType } from '../GameData/SymbolType';
import { GameConfig } from '../GameUtility/GameConfig';
import { FSMachine } from '../GameUtility/FSMachine';
import { GameUtility } from '../GameUtility/GameUtility';
import { SlotUnit } from './SlotUnit';

const { ccclass, property } = _decorator;

// 取得陣列中心的 SlotUnit Index，作為 SlotUnit 以 Reel 中心點排列的位置基準
const POSITION_CENTER_INDEX: number = Math.floor( GameUtility.GetReelSlotUnitCount() / 2 );

enum ReelState
{
    Idle,
    Run,
    ReadyToStop,
    Stop,
    Shock,
}

@ccclass( 'Reel' )
export class Reel extends Component
{
    @property( { type: [ SlotUnit ] } )
    public SlotUnits: SlotUnit[] = [];

    @property( { type: CCFloat, min: 1 } )
    public SymbolHeight: number = 150;

    // Reel 目前在單一 Symbol 高度內的垂直位移量
    private _reelVerticalOffset: number = 0;

    // 目前停輪時要顯示的 Symbol 結果
    private _stopSymbols: SymbolType[] = [];

    // 目前已放入的停輪 Symbol 數量
    private _stopSymbolCount: number = 0;

    // Shock 動畫目前經過的時間
    private _shockElapsedTime: number = 0;

    // 管理 Reel 目前的狀態
    private _fsMachine: FSMachine<ReelState> = new FSMachine( ReelState.Idle );

    public get IsRunning(): boolean
    {
        return this._fsMachine.CurrentState !== ReelState.Idle;
    }

    protected onLoad(): void
    {
        this.initFSM();
    }

    protected start(): void
    {
        this.ResetReel();
    }

    protected update( deltaTime: number ): void
    {
        this._fsMachine.Tick( deltaTime );
    }

    // 開始 Reel Spin
    public StartSpin(): void
    {
        if ( this._fsMachine.CurrentState !== ReelState.Idle || this.SlotUnits.length !== GameUtility.GetReelSlotUnitCount() )
        {
            return;
        }

        this._fsMachine.ChangeState( ReelState.Run );
    }

    // 設定停輪結果並讓 Reel 進入 ReadyToStop 狀態
    public StopSpin( stopSymbols: SymbolType[] ): void
    {
        if ( this._fsMachine.CurrentState !== ReelState.Run || stopSymbols.length !== GameUtility.GetSlotRowCount() )
        {
            return;
        }

        this._stopSymbols = [ ...stopSymbols ];
        this._fsMachine.ChangeState( ReelState.ReadyToStop );
    }

    // 重設 Reel 狀態、停輪資料與 SlotUnit
    public ResetReel(): void
    {
        this._fsMachine.ChangeState( ReelState.Idle );
        this._reelVerticalOffset = 0;
        this._stopSymbols = [];
        this._stopSymbolCount = 0;
        this._shockElapsedTime = 0;

        for ( let index: number = 0; index < this.SlotUnits.length; index++ )
        {
            const slotUnit: SlotUnit = this.SlotUnits[ index ];
            slotUnit.SetSymbol( this.getRandomSymbol() );
        }

        this.fixingPosition();
    }

    // 初始化狀態機
    private initFSM(): void
    {
        this._fsMachine.RegisterStateEvent( ReelState.Run, { OnUpdate: this.updateRun.bind( this ) } );
        this._fsMachine.RegisterStateEvent( ReelState.ReadyToStop, { OnEnter: this.enterReadyToStop.bind( this ), OnUpdate: this.updateReadyToStop.bind( this ) } );
        this._fsMachine.RegisterStateEvent( ReelState.Stop, { OnUpdate: this.updateStop.bind( this ) } );
        this._fsMachine.RegisterStateEvent( ReelState.Shock, { OnEnter: this.enterShock.bind( this ), OnUpdate: this.updateShock.bind( this ) } );
        this._fsMachine.Start();
    }

    // Run 狀態持續移動 Reel 並替換亂數 Symbol
    private updateRun( deltaTime: number ): void
    {
        if ( this.moveReel( deltaTime ) )
        {
            this.moveSlotUnitToFirst();
            this.SlotUnits[ 0 ].SetSymbol( this.getRandomSymbol() );
        }

        this.fixingPosition();
    }

    // 進入 ReadyToStop 時重設停輪 Symbol 放入進度
    private enterReadyToStop(): void
    {
        this._stopSymbolCount = 0;
    }

    // ReadyToStop 狀態依序放入停輪結果並完成盤面對齊
    private updateReadyToStop( deltaTime: number ): void
    {
        if ( this.moveReel( deltaTime ) )
        {
            this.moveSlotUnitToFirst();

            if ( this._stopSymbolCount < this._stopSymbols.length )
            {
                this.setNextStopSymbol();
            }
            else
            {
                this._fsMachine.ChangeState( ReelState.Stop );
            }
        }

        this.fixingPosition();
    }

    // Stop 狀態移動至最終定位後進入 Shock
    private updateStop( deltaTime: number ): void
    {
        if ( this.moveReel( deltaTime ) )
        {
            this._reelVerticalOffset = 0;
            this._fsMachine.ChangeState( ReelState.Shock );
        }

        this.fixingPosition();
    }

    // 進入 Shock 時重設動畫經過時間
    private enterShock(): void
    {
        this._shockElapsedTime = 0;
    }

    // 讓 Reel 進行回彈的動作，並在回彈完成後進入 Idle 狀態
    private updateShock( deltaTime: number ): void
    {
        this._shockElapsedTime += deltaTime;

        // 將 Shock 經過時間轉換為 0 ~ 1 的進度
        const gameConfig: GameConfig = GameConfig.GetInstance();
        const shockRatio: number = Math.min( this._shockElapsedTime / gameConfig.ShockDuration, 1 );

        // 使用 Sin 曲線讓 Reel 先向下位移再回到原始位置
        this._reelVerticalOffset = -gameConfig.ShockDistance * Math.sin( Math.PI * shockRatio );

        if ( shockRatio >= 1 )
        {
            this._reelVerticalOffset = 0;
            this._fsMachine.ChangeState( ReelState.Idle );
        }

        this.fixingPosition();
    }

    // 更新 Reel 垂直位移並回傳是否已走完目前格距
    private moveReel( deltaTime: number ): boolean
    {
        this._reelVerticalOffset -= GameConfig.GetInstance().SpinSpeed * deltaTime;
        return this._reelVerticalOffset <= 0;
    }

    // 將陣列尾端的 SlotUnit 取出並放置到第一個
    private moveSlotUnitToFirst(): void
    {

        const recycledSlotUnit: SlotUnit | undefined = this.SlotUnits.pop();

        if ( recycledSlotUnit === undefined )
        {
            return;
        }

        // 補回一格 SymbolHeight，維持 Reel 移動位置的連續性
        this._reelVerticalOffset += this.SymbolHeight;
        this.SlotUnits.unshift( recycledSlotUnit );
    }

    // 將下一個停輪 Symbol 放到剛回收的 SlotUnit
    private setNextStopSymbol(): void
    {
        const firstUnit: SlotUnit = this.SlotUnits[ 0 ];
        const stopSymbolIndex: number = this._stopSymbols.length - this._stopSymbolCount - 1;
        firstUnit.SetSymbol( this._stopSymbols[ stopSymbolIndex ] );
        this._stopSymbolCount++;
    }

    // 更新 SlotUnit 的位置
    private fixingPosition(): void
    {
        for ( let index: number = 0; index < this.SlotUnits.length; index++ )
        {
            // 根據 Reel 的垂直位移量與 SlotUnit 距離中心的格數計算 Y 軸位置
            const positionY: number = this._reelVerticalOffset + this.SymbolHeight * ( POSITION_CENTER_INDEX - index );
            this.SlotUnits[ index ].node.setPosition( 0, positionY, 0 );
        }
    }

    // 隨機取得一個 SymbolType
    private getRandomSymbol(): SymbolType
    {
        const randomIndex: number = Math.floor( Math.random() * SYMBOL_TYPE_LIST.length );
        return SYMBOL_TYPE_LIST[ randomIndex ];
    }
}
