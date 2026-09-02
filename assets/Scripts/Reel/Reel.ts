import { _decorator, CCFloat, Component } from 'cc';
import { SYMBOL_TYPE_LIST, SymbolType } from '../GameData/SymbolType';
import { GameConfig } from '../GameUtility/GameConfig';
import { FSMachine } from '../GameUtility/FSMachine';
import { GameUtility } from '../GameUtility/GameUtility';
import { SlotUnit } from './SlotUnit';

const { ccclass, property } = _decorator;

// 取得陣列中心的 SlotUnit Index，作為 SlotUnit 以 Reel 中心點排列的位置基準
const POSITION_CENTER_INDEX: number = Math.floor( GameUtility.GetReelSlotUnitCount() / 2 );
// SlotUnits 前方包含上方 Buffer，因此盤面 Row 0 從可視區起始 Index 開始
const VISIBLE_START_INDEX: number = Math.floor( GameUtility.GetReelBufferUnitCount() / 2 );

enum ReelState
{
    // Reel 靜止並可開始下一次 Spin
    Idle,

    // Reel 持續循環並顯示亂數 Symbol
    Run,

    // 已收到停輪結果，滾動期間逐步將最終 Symbol 放入 Reel
    ReadyToStop,

    // 最終 Symbol 已放入完成，繼續移動到正式停輪位置
    Stop,

    // 停輪後播放短暫回彈，完成後回到 Idle
    Shock,
}

// 負責單一 Reel 的循環滾動、停輪結果放入、最終定位與 Shock 狀態流程
@ccclass( 'Reel' )
export class Reel extends Component
{
    // 組成目前 Reel 的所有 SlotUnit，包含上下 Buffer
    @property( { type: [ SlotUnit ] } )
    public SlotUnits: SlotUnit[] = [];

    // 相鄰 SlotUnit 之間的垂直間距
    @property( { type: CCFloat, min: 1 } )
    public SymbolHeight: number = 150;

    // 目前 Spin 使用的 Reel 移動速度
    private _spinSpeed: number = 0;

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

    // Reel 尚未回到 Idle 時視為仍在運轉
    public get IsRunning(): boolean
    {
        return this._fsMachine.CurrentState !== ReelState.Idle;
    }

    // Component 載入時建立 Reel FSM
    protected onLoad(): void
    {
        this.initFSM();
    }

    // 所有 Component onLoad 完成後初始化 Reel 顯示
    protected start(): void
    {
        this.ResetReel();
    }

    // 每幀交由 FSM 執行目前 State 的 Update
    protected update( deltaTime: number ): void
    {
        this._fsMachine.Tick( deltaTime );
    }

    // 讓 Reel 使用指定速度從 Idle 進入 Run
    public StartSpin( spinSpeed: number ): void
    {
        if ( this._fsMachine.CurrentState !== ReelState.Idle || this.SlotUnits.length !== GameUtility.GetReelSlotUnitCount() )
        {
            return;
        }

        this._spinSpeed = spinSpeed;

        for ( const slotUnit of this.SlotUnits )
        {
            slotUnit.ResetWin();
        }

        this._fsMachine.ChangeState( ReelState.Run );
    }

    // Spin 進行中切換 Reel 的移動速度
    public SetSpinSpeed( spinSpeed: number ): void
    {
        this._spinSpeed = spinSpeed;
    }

    // 設定停輪結果並讓 Reel 進入 ReadyToStop 狀態
    public StopSpin( stopSymbols: SymbolType[] ): void
    {
        if ( this._fsMachine.CurrentState !== ReelState.Run )
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
        this._spinSpeed = 0;
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

    // 要求目前可視區域指定 Row 的 SlotUnit 播放 Win
    public PlayWin( rowIndex: number ): void
    {
        const visibleIndex: number = rowIndex + VISIBLE_START_INDEX;
        this.SlotUnits[ visibleIndex ].PlayWin();
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
        this.moveReel( deltaTime );

        // 高速移動時一幀可能跨過多格，需要把這一幀經過的 SlotUnit 全部補回
        while ( this._reelVerticalOffset <= 0 )
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

    // ReadyToStop 狀態依序放入停輪結果，全部放入後進入 Stop
    private updateReadyToStop( deltaTime: number ): void
    {
        this.moveReel( deltaTime );

        // 高速移動時同一幀可能經過多格，每跨一格都要依序補入對應的停輪 Symbol
        while ( this._reelVerticalOffset <= 0 )
        {
            this.moveSlotUnitToFirst();

            if ( this._stopSymbolCount < this._stopSymbols.length )
            {
                this.setNextStopSymbol();
                continue;
            }

            this._fsMachine.ChangeState( ReelState.Stop );

            // 這一幀剩餘的移動距離已經到達最終停輪位置時，不需要再等待下一幀
            if ( this._reelVerticalOffset <= 0 )
            {
                this._reelVerticalOffset = 0;
                this._fsMachine.ChangeState( ReelState.Shock );
            }

            break;
        }

        this.fixingPosition();
    }

    // Stop 狀態移動至最終定位後進入 Shock
    private updateStop( deltaTime: number ): void
    {
        this.moveReel( deltaTime );

        if ( this._reelVerticalOffset <= 0 )
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

    // 依目前 Spin Speed 更新 Reel 的垂直位移
    private moveReel( deltaTime: number ): void
    {
        this._reelVerticalOffset -= this._spinSpeed * deltaTime;
    }

    // 回收移出下方的 SlotUnit 到 Reel 上方，並補回一格位移維持畫面連續
    private moveSlotUnitToFirst(): void
    {
        const recycledSlotUnit: SlotUnit = this.SlotUnits.pop()!;
        this._reelVerticalOffset += this.SymbolHeight;
        this.SlotUnits.unshift( recycledSlotUnit );
    }

    // 將下一個停輪 Symbol 放到剛回收的 SlotUnit
    private setNextStopSymbol(): void
    {
        const firstUnit: SlotUnit = this.SlotUnits[ 0 ];

        // SlotUnit 從 Reel 上方依序被回收進來，因此停輪結果需由最下方 Row 反向放入
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