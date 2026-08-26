import { _decorator, Component } from 'cc';
import { SymbolType } from '../GameData/SymbolType';
import { GameConfig } from '../GameUtility/GameConfig';
import { GameUtility } from '../GameUtility/GameUtility';
import { Reel } from './Reel';

const { ccclass, property } = _decorator;

@ccclass( 'ReelController' )
export class ReelController extends Component
{
    // 由 Controller 管理的所有 Reel
    @property( { type: [ Reel ] } )
    public Reels: Reel[] = [];

    // 目前是否正在進行 Reel Spin
    private _isSpinRunning: boolean = false;

    // 目前是否已開始進行停輪流程
    private _isStopping: boolean = false;

    // 玩家是否已要求快速停輪
    private _isSkipRequested: boolean = false;

    // 是否還有 Reel 尚未收到 StopSpin Command
    private _hasPendingReelStop: boolean = false;

    // 目前這一局 Reel 已累計的運轉時間
    private _spinElapsedTime: number = 0;

    // 目前一局各 Reel 的最終停輪結果
    private _reelResults: SymbolType[][] | null = null;

    // Reel Spin 全部完成時的通知
    private _onSpinComplete: ( () => void ) | null = null;

    // Spin 期間是否允許玩家送出 Skip 操作
    public get CanSkipSpin(): boolean
    {
        return this._isSpinRunning && this._hasPendingReelStop && !this._isSkipRequested;
    }

    // 依目前階段處理 Spin 計時或等待所有 Reel 運轉完成，最後重設狀態
    protected update( deltaTime: number ): void
    {
        // 沒有進行中的 Spin 時不處理本幀
        if ( !this._isSpinRunning )
        {
            return;
        }

        // 尚未開始停輪時累計運轉時間，並檢查目前是否符合停輪條件
        if ( !this._isStopping )
        {
            this._spinElapsedTime += deltaTime;
            this.tryStopSpin();
            return;
        }

        // 已開始停輪時等待所有 Reel 完成 Stop 與 Shock 並回到 Idle
        if ( this.Reels.some( ( reel: Reel ): boolean => reel.IsRunning ) )
        {
            return;
        }

        // 所有 Reel 都完成後才清除本局 Controller 狀態
        this.completeSpin();
    }

    // Component 停用時取消停輪間隔的排程，並同步結束進行中的 Reel Spin
    protected onDisable(): void
    {
        this.unscheduleAllCallbacks();

        if ( this._isSpinRunning )
        {
            this.completeSpin();
            return;
        }

        this.resetSpinState();
    }

    // 啟動所有 Reel 進行 Spin
    public StartSpin( onSpinComplete: () => void ): boolean
    {
        if ( this._isSpinRunning || this.Reels.length !== GameUtility.GetSlotColumnCount() )
        {
            return false;
        }

        this._isSpinRunning = true;
        this._isStopping = false;
        this._isSkipRequested = false;
        this._hasPendingReelStop = true;
        this._spinElapsedTime = 0;
        this._reelResults = null;
        this._onSpinComplete = onSpinComplete;

        for ( const reel of this.Reels )
        {
            reel.StartSpin();
        }

        return true;
    }

    // 保存停輪結果
    public SetSpinResult( reelResults: SymbolType[][] ): void
    {
        this._reelResults = reelResults.map( ( stopSymbols: SymbolType[] ): SymbolType[] => [ ...stopSymbols ] );
    }

    // 有效結果存在時切換為快速停輪
    public SkipSpin(): boolean
    {
        // 目前不可 Skip 或尚未取得停輪結果時不處理
        if ( !this.CanSkipSpin || this._reelResults === null )
        {
            return false;
        }

        this._isSkipRequested = true;
        return true;
    }

    // 自動停輪時等待最低 Spin 時間，快速停輪則直接開始停輪
    private tryStopSpin(): void
    {
        if ( this._reelResults === null )
        {
            return;
        }

        // 自動停輪必須等到最低運轉時間
        if ( !this._isSkipRequested && this._spinElapsedTime < GameConfig.GetInstance().SpinDuration )
        {
            return;
        }

        this._isStopping = true;
        this.runReelStopSequence( this._reelResults );
    }

    // 依序通知每一軸 Reel 停輪，快速停輪會略過剩餘間隔
    private async runReelStopSequence( reelResults: SymbolType[][] ): Promise<void>
    {
        for ( let reelIndex: number = 0; reelIndex < this.Reels.length; reelIndex++ )
        {
            this.Reels[ reelIndex ].StopSpin( reelResults[ reelIndex ] );

            let nowWaitingTime: number = 0;
            // 自動停輪時等待停軸間隔，快速停輪直接處理下一軸
            while ( !this._isSkipRequested && nowWaitingTime < GameConfig.GetInstance().ReelStopInterval && reelIndex < this.Reels.length - 1 )
            {
                await this.waitTime( 0.05 );
                nowWaitingTime += 0.05;
            }
        }

        // 所有 Reel 都已收到 StopSpin Command
        this._hasPendingReelStop = false;
    }

    // 重設狀態後通知上層 Reel Spin 已完整結束
    private completeSpin(): void
    {
        const onSpinComplete: ( () => void ) | null = this._onSpinComplete;
        this.resetSpinState();
        onSpinComplete?.();
    }

    // 重設目前 Spin 與 Stop 流程相關狀態
    private resetSpinState(): void
    {
        this._isSpinRunning = false;
        this._isStopping = false;
        this._isSkipRequested = false;
        this._hasPendingReelStop = false;
        this._spinElapsedTime = 0;
        this._reelResults = null;
        this._onSpinComplete = null;
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
