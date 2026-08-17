import { _decorator, CCFloat, Component } from 'cc';
import { SymbolType } from '../GameData/SymbolType';
import { GameUtility } from '../GameUtility/GameUtility';
import { Reel } from './Reel';

const { ccclass, property } = _decorator;

const PREVIEW_REEL_RESULTS: SymbolType[][] = [
    [ SymbolType.M1, SymbolType.A, SymbolType.M2 ],
    [ SymbolType.M3, SymbolType.K, SymbolType.Q ],
    [ SymbolType.M4, SymbolType.J, SymbolType.A ],
    [ SymbolType.Q, SymbolType.M2, SymbolType.K ],
    [ SymbolType.A, SymbolType.M1, SymbolType.J ],
];

@ccclass( 'ReelController' )
export class ReelController extends Component
{
    @property( { type: [ Reel ] } )
    public Reels: Reel[] = [];

    @property( { type: CCFloat, min: 0 } )
    public ReelStopInterval: number = 0.15;

    @property
    public PreviewOnStart: boolean = true;

    @property( { type: CCFloat, min: 0.1 } )
    public PreviewSpinDuration: number = 2;

    private _isRunning: boolean = false;
    private _isStopping: boolean = false;
    private _reelResults: SymbolType[][] = [];

    protected start(): void
    {
        if ( !this.PreviewOnStart )
        {
            return;
        }

        this.scheduleOnce( (): void => this.StartSpin(), 0.5 );
        this.scheduleOnce( (): void => this.StopSpin( PREVIEW_REEL_RESULTS ), 0.5 + this.PreviewSpinDuration );
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

    public StartSpin(): void
    {
        if ( this._isRunning || this.Reels.length !== GameUtility.GetSlotColumnCount() )
        {
            return;
        }

        this._isRunning = true;

        for ( const reel of this.Reels )
        {
            reel.StartSpin();
        }
    }

    public StopSpin( reelResults: SymbolType[][] ): void
    {
        if ( !this._isRunning || this._isStopping || !this.isValidReelResults( reelResults ) )
        {
            return;
        }

        this._reelResults = reelResults.map( ( stopSymbols: SymbolType[] ): SymbolType[] => [ ...stopSymbols ] );
        this._isStopping = true;
        this.startReelStopSequence();
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

            this.unschedule( stopNextReel );
        };

        stopNextReel();
        this.schedule( stopNextReel, this.ReelStopInterval );
    }

    private *reelStop(): Generator<boolean, boolean, unknown>
    {
        for ( let reelIndex: number = 0; reelIndex < this.Reels.length; reelIndex++ )
        {
            this.Reels[ reelIndex ].StopSpin( this._reelResults[ reelIndex ] );

            if ( reelIndex < this.Reels.length - 1 )
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
