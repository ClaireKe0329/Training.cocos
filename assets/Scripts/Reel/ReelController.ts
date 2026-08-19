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

    // 目前是否正在進行 Reel Spin
    private _isRunning: boolean = false;

    // 目前是否已開始進行停輪流程
    private _isStopping: boolean = false;

    // 玩家是否已要求 Skip 剩餘停輪間隔
    private _isSkipRequested: boolean = false;

    // 是否還有 Reel 尚未收到 StopSpin Command
    private _hasPendingReelStop: boolean = false;

    // 目前一局五軸 Reel 的最終停輪結果
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

    // 檢查所有 Reel 是否已完成停輪，若完成則重設 Spin 狀態
    protected update(): void
    {
        if ( !this._isStopping || this.Reels.some( ( reel: Reel ): boolean => reel.IsRunning ) )
        {
            return;
        }

        this.resetSpinState();
    }

    // Component 停用時取消尚未執行的排程並重設 Spin 狀態
    protected onDisable(): void
    {
        this.unscheduleAllCallbacks();
        this.resetSpinState();
    }

    // 啟動所有 Reel 進行 Spin
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

    // 設定停輪結果並開始依序通知各 Reel 停輪
    public StopSpin( reelResults: SymbolType[][] ): boolean
    {
        if ( !this._isRunning || this._isStopping || !this.isValidReelResults( reelResults ) )
        {
            return false;
        }

        this._reelResults = reelResults.map( ( stopSymbols: SymbolType[] ): SymbolType[] => [ ...stopSymbols ] );
        this._isStopping = true;
        this.runReelStopSequence();
        return true;
    }

    // 要求剩餘尚未收到 StopSpin Command 的 Reel 快速開始停輪
    public SkipSpin( reelResults: SymbolType[][] ): boolean
    {
        if ( !this.CanSkip || !this.isValidReelResults( reelResults ) )
        {
            return false;
        }

        this._isSkipRequested = true;

        // 尚未開始正常停輪流程時，先保存結果並立即開始停輪
        if ( !this._isStopping )
        {
            this._reelResults = reelResults.map( ( stopSymbols: SymbolType[] ): SymbolType[] => [ ...stopSymbols ] );
            this._isStopping = true;
            this.runReelStopSequence();
        }

        return true;
    }

    // 依序通知每一軸 Reel 停輪，Skip 時略過剩餘停輪間隔
    private async runReelStopSequence(): Promise<void>
    {
        for ( let reelIndex: number = 0; reelIndex < this.Reels.length; reelIndex++ )
        {
            this.Reels[ reelIndex ].StopSpin( this._reelResults[ reelIndex ] );

            // Normal Stop 時等待停輪間隔，Skip 時讓剩餘 Reel 直接收到 StopSpin Command
            if ( !this._isSkipRequested && reelIndex < this.Reels.length - 1 )
            {
                await this.waitTime( this.ReelStopInterval );
            }
        }

        // 所有 Reel 都已收到 StopSpin Command
        this._hasPendingReelStop = false;
    }

    // 檢查停輪結果是否符合 Reel 數量與每軸 Symbol 數量
    private isValidReelResults( reelResults: SymbolType[][] ): boolean
    {
        if ( reelResults.length !== GameUtility.GetSlotColumnCount() )
        {
            return false;
        }

        return reelResults.every( ( stopSymbols: SymbolType[] ): boolean => stopSymbols.length === GameUtility.GetSlotRowCount() );
    }

    // 重設目前 Spin 與 Stop 流程相關狀態
    private resetSpinState(): void
    {
        this._isRunning = false;
        this._isStopping = false;
        this._isSkipRequested = false;
        this._hasPendingReelStop = false;
        this._reelResults = [];
    }

    // 等待指定秒數後繼續執行目前非同步流程
    private waitTime( seconds: number ): Promise<void>
    {
        return new Promise( ( resolve: () => void ): void =>
        {
            this.scheduleOnce( resolve, seconds );
        } );
    }
}