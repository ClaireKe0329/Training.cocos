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
    private _isSkipRequested: boolean = false;
    private _hasPendingReelStop: boolean = false;
    private _reelResults: SymbolType[][] = [];

    public get IsRunning(): boolean
    {
        return this._isRunning;
    }

    public get IsStopping(): boolean
    {
        return this._isStopping;
    }

    public get CanSkip(): boolean
    {
        return this._isRunning && this._hasPendingReelStop && !this._isSkipRequested;
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
        this._isSkipRequested = false;
        this._hasPendingReelStop = true;

        for ( const reel of this.Reels )
        {
            reel.StartSpin();
        }

        return true;
    }

    public StopSpin( reelResults: SymbolType[][] ): boolean
    {
        if ( !this._isRunning || this._isStopping || !this.isValidReelResults( reelResults ) )
        {
            return false;
        }

        this._reelResults = reelResults.map( ( stopSymbols: SymbolType[] ): SymbolType[] => [ ...stopSymbols ] );
        this._isStopping = true;
        this.startReelStopSequence();
        return true;
    }

    public SkipSpin( reelResults: SymbolType[][] ): boolean
    {
        if ( !this.CanSkip || !this.isValidReelResults( reelResults ) )
        {
            return false;
        }

        this._isSkipRequested = true;

        if ( !this._isStopping )
        {
            this._reelResults = reelResults.map( ( stopSymbols: SymbolType[] ): SymbolType[] => [ ...stopSymbols ] );
            this._isStopping = true;
            this.startReelStopSequence();
        }

        return true;
    }

    private startReelStopSequence(): void
    {
        const reelStopSequence: Generator<boolean, boolean, unknown> = this.reelStop();
        const stopNextReel = (): void =>
        {
            if ( reelStopSequence.next().value )
            {
                return;
            }

            this._hasPendingReelStop = false;
            this.unschedule( stopNextReel );
        };

        stopNextReel();

        if ( this._hasPendingReelStop )
        {
            this.schedule( stopNextReel, this.ReelStopInterval );
        }
    }

    private *reelStop(): Generator<boolean, boolean, unknown>
    {
        for ( let reelIndex: number = 0; reelIndex < this.Reels.length; reelIndex++ )
        {
            this.Reels[ reelIndex ].StopSpin( this._reelResults[ reelIndex ] );

            if ( !this._isSkipRequested && reelIndex < this.Reels.length - 1 )
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
        this._isSkipRequested = false;
        this._hasPendingReelStop = false;
        this._reelResults = [];
    }
}
