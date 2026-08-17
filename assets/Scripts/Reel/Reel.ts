import { _decorator, CCFloat, Component } from 'cc';
import { SYMBOL_TYPE_LIST, SymbolType } from '../GameData/SymbolType';
import { GameUtility } from '../GameUtility/GameUtility';
import { SlotUnit } from './SlotUnit';

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

    private _state: ReelState = ReelState.Idle;
    private _currentCenter: number = 0;
    private _stopSymbols: SymbolType[] = [];
    private _stopSymbolCount: number = 0;
    private _shockElapsedTime: number = 0;

    public get IsRunning(): boolean
    {
        return this._state !== ReelState.Idle;
    }

    protected start(): void
    {
        this.ResetReel();
    }

    protected update( deltaTime: number ): void
    {
        switch ( this._state )
        {
            case ReelState.Run:
            case ReelState.ReadyToStop:
            case ReelState.Stop:
                this.updateUnitPosition( deltaTime );
                break;
            case ReelState.Shock:
                this.updateShock( deltaTime );
                break;
            default:
                break;
        }
    }

    public StartSpin(): void
    {
        if ( this._state !== ReelState.Idle || this.SlotUnits.length !== GameUtility.GetReelSlotUnitCount() )
        {
            return;
        }

        this._state = ReelState.Run;
    }

    public StopSpin( stopSymbols: SymbolType[] ): void
    {
        if ( this._state !== ReelState.Run || stopSymbols.length !== GameUtility.GetSlotRowCount() )
        {
            return;
        }

        this._stopSymbols = [ ...stopSymbols ];
        this._stopSymbolCount = 0;
        this._state = ReelState.ReadyToStop;
    }

    public ResetReel(): void
    {
        this._state = ReelState.Idle;
        this._currentCenter = 0;
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

    private updateUnitPosition( deltaTime: number ): void
    {
        this._currentCenter -= this.SpinSpeed * deltaTime;

        if ( this._currentCenter <= 0 )
        {
            if ( this._state === ReelState.Run || this._state === ReelState.ReadyToStop )
            {
                this.recycleSlotUnit();
                this.changeSymbol();
            }

            this.updateReelState();
        }

        this.fixingPosition();
    }

    private recycleSlotUnit(): void
    {
        this._currentCenter += this.SymbolHeight;
        const recycledSlotUnit: SlotUnit | undefined = this.SlotUnits.pop();

        if ( recycledSlotUnit === undefined )
        {
            return;
        }

        this.SlotUnits.unshift( recycledSlotUnit );
    }

    private changeSymbol(): void
    {
        if ( this._state === ReelState.Run )
        {
            this.SlotUnits[ 0 ].SetSymbol( this.getRandomSymbol() );
            return;
        }

        const stopSymbolIndex: number = this._stopSymbols.length - this._stopSymbolCount - 1;
        this.SlotUnits[ 1 ].SetSymbol( this._stopSymbols[ stopSymbolIndex ] );
        this._stopSymbolCount++;
    }

    private updateReelState(): void
    {
        if ( this._state === ReelState.Stop )
        {
            this._currentCenter = 0;
            this._shockElapsedTime = 0;
            this._state = ReelState.Shock;
            return;
        }

        if ( this._state === ReelState.ReadyToStop && this._stopSymbolCount >= this._stopSymbols.length )
        {
            this._state = ReelState.Stop;
        }
    }

    private updateShock( deltaTime: number ): void
    {
        this._shockElapsedTime += deltaTime;
        const shockRatio: number = Math.min( this._shockElapsedTime / this.ShockDuration, 1 );
        this._currentCenter = -this.ShockDistance * Math.sin( Math.PI * shockRatio );
        this.fixingPosition();

        if ( shockRatio >= 1 )
        {
            this._currentCenter = 0;
            this._state = ReelState.Idle;
            this.fixingPosition();
        }
    }

    private fixingPosition(): void
    {
        for ( let index: number = 0; index < this.SlotUnits.length; index++ )
        {
            const positionY: number = this._currentCenter + this.SymbolHeight * ( POSITION_CENTER_INDEX - index );
            this.SlotUnits[ index ].node.setPosition( 0, positionY, 0 );
        }
    }

    private getRandomSymbol(): SymbolType
    {
        const randomIndex: number = Math.floor( Math.random() * SYMBOL_TYPE_LIST.length );
        return SYMBOL_TYPE_LIST[ randomIndex ];
    }
}
