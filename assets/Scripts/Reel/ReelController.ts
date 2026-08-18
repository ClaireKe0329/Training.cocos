import { _decorator, CCFloat, Component } from 'cc';
import { SymbolType } from '../GameData/SymbolType';
import { GameUtility } from '../GameUtility/GameUtility';
import { Reel } from './Reel';

const { ccclass, property } = _decorator;

@ccclass( 'ReelController' )
export class ReelController extends Component
{
    @property( { type: [ Reel ] } )
    public Reels: Reel[] = [];

    @property( { type: CCFloat, min: 0 } )
    public ReelStopInterval: number = 0.15;
    private _isRunning: boolean = false;
    private _isStopping: boolean = false;
    private _reelResults: SymbolType[][] = [];

    public get IsRunning(): boolean
    {
        return this._isRunning;
    }

    public get IsStopping(): boolean
    {
        return this._isStopping;
    }

    protected update(): void
    {
        if ( !this._isStopping || this.Reels.some( ( reel: Reel ): boolean => reel.IsRunning ) )
        {
            return;
        }

        this.resetSpinState();
    }

    protected onDisable(): void
    {
        this.unscheduleAllCallbacks();
        this.resetSpinState();
    }

    public StartSpin(): boolean
    {
        if ( this._isRunning || this.Reels.length !== GameUtility.GetSlotColumnCount() )
        {
            return false;
        }

        this._isRunning = true;

        for ( const reel of this.Reels )
        {
            reel.StartSpin();
        }

        return true;
    }

    public StopSpin( reelResults: SymbolType[][] ): boolean
    {
        return this.stopSpin( reelResults, false );
    }

    public SkipSpin( reelResults: SymbolType[][] ): boolean
    {
        return this.stopSpin( reelResults, true );
    }

    private stopSpin( reelResults: SymbolType[][], isSkip: boolean = false ): boolean
    {
        if ( !this._isRunning || this._isStopping || !this.isValidReelResults( reelResults ) )
        {
            return false;
        }

        this._reelResults = reelResults.map( ( stopSymbols: SymbolType[] ): SymbolType[] => [ ...stopSymbols ] );
        this._isStopping = true;
        this.startReelStopSequence( isSkip );
        return true;
    }

    private startReelStopSequence( isSkip: boolean ): void
    {
        const reelStopSequence: Generator<boolean, boolean, unknown> = this.reelStop( isSkip );
        const stopNextReel = (): void =>
        {
            if ( reelStopSequence.next().value )
            {
                return;
            }

            if ( !isSkip )
            {
                this.unschedule( stopNextReel );
            }
        };

        stopNextReel();
        if ( !isSkip )
        {
            this.schedule( stopNextReel, this.ReelStopInterval );
        }
    }

    private *reelStop( isSkip: boolean ): Generator<boolean, boolean, unknown>
    {
        for ( let reelIndex: number = 0; reelIndex < this.Reels.length; reelIndex++ )
        {
            this.Reels[ reelIndex ].StopSpin( this._reelResults[ reelIndex ] );

            if ( !isSkip && reelIndex < this.Reels.length - 1 )
            {
                yield true;
            }
        }

        return false;
    }

    private isValidReelResults( reelResults: SymbolType[][] ): boolean
    {
        if ( reelResults.length !== GameUtility.GetSlotColumnCount() )
        {
            return false;
        }

        return reelResults.every( ( stopSymbols: SymbolType[] ): boolean => stopSymbols.length === GameUtility.GetSlotRowCount() );
    }

    private resetSpinState(): void
    {
        this._isRunning = false;
        this._isStopping = false;
        this._reelResults = [];
    }
}
