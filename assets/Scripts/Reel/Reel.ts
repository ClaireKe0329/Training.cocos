import { _decorator, CCFloat, Component } from 'cc';
import { SYMBOL_TYPE_LIST, SymbolType } from '../GameData/SymbolType';
import { GameUtility } from '../GameUtility/GameUtility';
import { SlotUnit } from './SlotUnit';
import { FSMachine } from '../GameUtility/FSMachine';

const { ccclass, property } = _decorator;

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

    @property( { type: CCFloat, min: 1 } )
    public SpinSpeed: number = 900;

    @property( { type: CCFloat, min: 0 } )
    public ShockDistance: number = 18;

    @property( { type: CCFloat, min: 0.01 } )
    public ShockDuration: number = 0.12;

    // Reel 目前在單一 Symbol 高度內的垂直位移量
    private _reelVerticalOffset: number = 0;

    // 儲存目前停輪時要顯示的 Symbol 結果
    private _stopSymbols: SymbolType[] = [];

    // 紀錄停輪結果是否已移動至最終可見盤面位置
    private _hasStopResultAligned: boolean = false;

    // 紀錄目前已放入多少個停輪 Symbol
    private _stopSymbolCount: number = 0;

    // 紀錄 Shock 動畫目前經過的時間
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

        this._fsMachine.CurrentState = ReelState.Run;
    }

    // 設定停輪結果並讓 Reel 進入 ReadyToStop 狀態
    public StopSpin( stopSymbols: SymbolType[] ): void
    {
        if ( this._fsMachine.CurrentState !== ReelState.Run || stopSymbols.length !== GameUtility.GetSlotRowCount() )
        {
            return;
        }

        this._stopSymbols = [ ...stopSymbols ];
        this._stopSymbolCount = 0;
        this._hasStopResultAligned = false;
        this._fsMachine.CurrentState = ReelState.ReadyToStop;
    }

    // 重設 Reel 狀態、停輪資料與 SlotUnit
    public ResetReel(): void
    {
        this._fsMachine.CurrentState = ReelState.Idle;
        this._reelVerticalOffset = 0;
        this._stopSymbols = [];
        this._hasStopResultAligned = false;
        this._stopSymbolCount = 0;
        this._shockElapsedTime = 0;

        for ( let index: number = 0; index < this.SlotUnits.length; index++ )
        {
            const slotUnit: SlotUnit = this.SlotUnits[ index ];
            slotUnit.SetSymbol( this.getRandomSymbol() );
        }

        this.fixingPosition();
    }

    //初始化狀態機
    private initFSM()
    {
        this._fsMachine.AddForeverEvent( ReelState.Run, this.updateUnitPosition.bind( this ) );
        this._fsMachine.AddForeverEvent( ReelState.ReadyToStop, this.updateUnitPosition.bind( this ) );
        this._fsMachine.AddForeverEvent( ReelState.Stop, this.updateUnitPosition.bind( this ) );
        this._fsMachine.AddForeverEvent( ReelState.Shock, this.updateShock.bind( this ) );
    }

    // 更新 Reel 位置
    private updateUnitPosition( deltaTime: number ): void
    {
        this._reelVerticalOffset -= this.SpinSpeed * deltaTime;

        // 當 Reel 移動超過一格時，搬移最後一格 SlotUnit 並更新 Symbol
        if ( this._reelVerticalOffset <= 0 )
        {
            if ( this._fsMachine.CurrentState === ReelState.Run || this._fsMachine.CurrentState === ReelState.ReadyToStop )
            {
                this.moveSlotUnitToFirst();
                this.changeSymbol();
            }

            this.updateReelState();
        }

        this.fixingPosition();
    }

    // 將陣列尾端的 SlotUnit 取出並放置到第一個
    private moveSlotUnitToFirst(): void
    {
        // 補回一格 SymbolHeight，維持 Reel 移動位置的連續性
        this._reelVerticalOffset += this.SymbolHeight;
        const recycledSlotUnit: SlotUnit | undefined = this.SlotUnits.pop();

        if ( recycledSlotUnit === undefined )
        {
            return;
        }

        this.SlotUnits.unshift( recycledSlotUnit );
    }

    // 更換 Reel 的 Symbol
    private changeSymbol(): void
    {
        const firstUnit: SlotUnit = this.SlotUnits[ 0 ];

        // Run 狀態時將回收的 SlotUnit 更換為隨機 Symbol
        if ( this._fsMachine.CurrentState === ReelState.Run )
        {
            firstUnit.SetSymbol( this.getRandomSymbol() );
            return;
        }

        // ReadyToStop 狀態時將停輪結果由下往上依序放入 Reel
        if ( this._stopSymbolCount < this._stopSymbols.length )
        {
            const stopSymbolIndex: number = this._stopSymbols.length - this._stopSymbolCount - 1;
            firstUnit.SetSymbol( this._stopSymbols[ stopSymbolIndex ] );
            this._stopSymbolCount++;
            return;
        }

        // 所有停輪 Symbol 放入後再移動一格，使結果對齊最終可見盤面
        this._hasStopResultAligned = true;
    }

    // 更新 Reel 狀態
    private updateReelState(): void
    {
        // 當 ReelState 為 Stop 時，直接進入 Shock 狀態
        if ( this._fsMachine.CurrentState === ReelState.Stop )
        {
            this._reelVerticalOffset = 0;
            this._shockElapsedTime = 0;
            this._fsMachine.CurrentState = ReelState.Shock;
            return;
        }

        // 當 ReelState 為 ReadyToStop 時，檢查是否已有所有停輪 Symbol 且盤面是否對齊，若是則進入 Stop 狀態
        if ( this._fsMachine.CurrentState === ReelState.ReadyToStop && this._stopSymbolCount >= this._stopSymbols.length && this._hasStopResultAligned )
        {
            this._fsMachine.CurrentState = ReelState.Stop;
        }
    }

    // 讓 Reel 進行回彈的動作，並在回彈完成後進入 Idle 狀態
    private updateShock( deltaTime: number ): void
    {
        this._shockElapsedTime += deltaTime;

        // 將 Shock 經過時間轉換為 0 ~ 1 的進度
        const shockRatio: number = Math.min( this._shockElapsedTime / this.ShockDuration, 1 );

        // 使用 Sin 曲線讓 Reel 先向下位移再回到原始位置
        this._reelVerticalOffset = -this.ShockDistance * Math.sin( Math.PI * shockRatio );
        this.fixingPosition();

        if ( shockRatio >= 1 )
        {
            this._reelVerticalOffset = 0;
            this._fsMachine.CurrentState = ReelState.Idle;
            this.fixingPosition();
        }
    }

    // 更新 SlotUnit 的位置
    private fixingPosition(): void
    {
        for ( let index: number = 0; index < this.SlotUnits.length; index++ )
        {
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