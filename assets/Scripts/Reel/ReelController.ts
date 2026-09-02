import { _decorator, Component } from 'cc';
import { SymbolType } from '../GameData/SymbolType';
import { FSMachine } from '../GameUtility/FSMachine';
import { GameConfig } from '../GameUtility/GameConfig';
import { GameUtility } from '../GameUtility/GameUtility';
import { Reel } from './Reel';
import { ReelSpeedLevel, IReelSpeedSetting, IReelSpeedSettings } from './ReelSpeed';

const { ccclass, property } = _decorator;

enum ReelControllerState
{
    // 尚未開始 Spin，可以接受下一次 StartSpin
    Idle,

    // 所有 Reel 持續運轉，等待停輪時間與盤面結果準備完成
    Spinning,

    // 開始通知各 Reel 停輪，並等待所有 Reel 真正停止
    Stopping,

    // 所有 Reel 都已停止，本次 Spin 準備結束
    Complete,
}

// 負責控制所有 Reel 的開始、依序停輪、快速停輪與完成時機
@ccclass( 'ReelController' )
export class ReelController extends Component
{
    // 目前由 ReelController 控制的所有 Reel
    @property( { type: [ Reel ] } )
    public Reels: Reel[] = [];

    // 管理目前多軸 Reel 的執行狀態
    private _fsMachine: FSMachine<ReelControllerState> = new FSMachine( ReelControllerState.Idle );

    // 目前 Spin 使用的 Reel Speed Level
    private _speedLevel: ReelSpeedLevel = ReelSpeedLevel.Normal;

    // 本次 Spin 已經運轉的時間
    private _spinElapsedTime: number = 0;

    // 自動停輪時距離下一軸停輪已經過的時間
    private _stopIntervalElapsedTime: number = 0;

    // 下一個還沒收到 StopSpin 的 Reel Index
    private _nextStopReelIndex: number = 0;

    // 本次 Spin 各 Reel 最後要停下來的盤面結果
    private _reelResults: SymbolType[][] | null = null;

    // 所有 Reel 停止並完成重設後通知 SlotProcessor
    private _onSpinFinished: ( () => void ) | null = null;

    // Spin 尚未結束且尚未進入 Skip Speed 時允許玩家要求 Skip
    public get CanSkipSpin(): boolean
    {
        if ( this._speedLevel === ReelSpeedLevel.Skip )
        {
            return false;
        }

        if ( this._fsMachine.CurrentState === ReelControllerState.Spinning )
        {
            return true;
        }

        return this._fsMachine.CurrentState === ReelControllerState.Stopping
            && this._nextStopReelIndex < this.Reels.length;
    }

    // 只有目前沒有進行中的 Spin，且 Reel 數量正確時才能開始下一次 Spin
    public get CanStartSpin(): boolean
    {
        return this._fsMachine.CurrentState === ReelControllerState.Idle
            && this.Reels.length === GameUtility.GetSlotColumnCount();
    }

    // Component 載入時建立 ReelController 使用的狀態機
    protected onLoad(): void
    {
        this.initFSM();
    }

    // 每幀執行目前 State 對應的處理
    protected update( deltaTime: number ): void
    {
        this._fsMachine.Tick( deltaTime );
    }

    // Spin 開始前設定本局使用的 Normal 或 Turbo Speed
    public SetSpeedLevel( speedLevel: ReelSpeedLevel ): void
    {
        if ( this._fsMachine.CurrentState !== ReelControllerState.Idle || speedLevel === ReelSpeedLevel.Skip )
        {
            return;
        }

        this._speedLevel = speedLevel;
    }

    // 使用目前設定好的 Speed Level 開始 Spin
    public StartSpin( onSpinFinished: () => void ): void
    {
        if ( !this.CanStartSpin )
        {
            return;
        }

        this._onSpinFinished = onSpinFinished;
        this._fsMachine.ChangeState( ReelControllerState.Spinning );
    }

    // 保存本次 Spin 最後要顯示的盤面，之後由停輪流程使用
    public SetSpinResult( reelResults: SymbolType[][] ): void
    {
        this._reelResults = reelResults.map( ( stopSymbols: SymbolType[] ): SymbolType[] => [ ...stopSymbols ] );
    }

    // 要求指定 Reel 上的 SlotUnit 播放中獎表現
    public PlayWin( reelIndex: number, rowIndex: number ): void
    {
        this.Reels[ reelIndex ].PlayWin( rowIndex );
    }

    // 玩家要求快速停輪；結果尚未準備完成時，本次操作不生效也不保存
    public SkipSpin(): void
    {
        if ( !this.CanSkipSpin || this._reelResults === null )
        {
            return;
        }

        this.changeSpeedLevel( ReelSpeedLevel.Skip );

        // 尚在等待最低 Spin 時間時，直接略過剩餘等待並開始停輪
        if ( this._fsMachine.CurrentState === ReelControllerState.Spinning )
        {
            this._fsMachine.ChangeState( ReelControllerState.Stopping );
            return;
        }

        // 已經開始停輪時，立即通知所有剩餘 Reel 進入停輪流程
        this.stopAllPendingReels();
    }

    // 設定每個 State 進入後需要執行的處理
    private initFSM(): void
    {
        this._fsMachine.RegisterStateEvent( ReelControllerState.Idle, {
            OnEnter: this.enterIdle.bind( this ),
        } );

        this._fsMachine.RegisterStateEvent( ReelControllerState.Spinning, {
            OnEnter: this.enterSpinning.bind( this ),
            OnUpdate: this.updateSpinning.bind( this ),
        } );

        this._fsMachine.RegisterStateEvent( ReelControllerState.Stopping, {
            OnEnter: this.enterStopping.bind( this ),
            OnUpdate: this.updateStopping.bind( this ),
        } );

        this._fsMachine.RegisterStateEvent( ReelControllerState.Complete, {
            OnEnter: this.enterComplete.bind( this ),
        } );

        this._fsMachine.Start();
    }

    // 回到 Idle 時清除上一輪 Spin 使用的資料
    private enterIdle(): void
    {
        this._speedLevel = ReelSpeedLevel.Normal;
        this._spinElapsedTime = 0;
        this._stopIntervalElapsedTime = 0;
        this._nextStopReelIndex = 0;
        this._reelResults = null;
        this._onSpinFinished = null;
    }

    // 進入 Spinning 時讓所有 Reel 使用目前 Speed Level 同時開始滾動
    private enterSpinning(): void
    {
        this._spinElapsedTime = 0;

        const spinSpeed: number = this.getSpeedSetting().SpinSpeed;

        for ( const reel of this.Reels )
        {
            reel.StartSpin( spinSpeed );
        }
    }

    // 等待目前 Speed Level 的最低 Spin 時間與盤面結果都準備完成後開始自動停輪
    private updateSpinning( deltaTime: number ): void
    {
        this._spinElapsedTime += deltaTime;

        if ( this._reelResults === null )
        {
            return;
        }

        if ( this._spinElapsedTime < this.getSpeedSetting().SpinDuration )
        {
            return;
        }

        this._fsMachine.ChangeState( ReelControllerState.Stopping );
    }

    // 進入 Stopping 時依目前 Speed Level 開始通知各 Reel 停輪
    private enterStopping(): void
    {
        this._nextStopReelIndex = 0;
        this._stopIntervalElapsedTime = 0;

        const reelStopInterval: number = this.getSpeedSetting().ReelStopInterval;

        // 沒有停軸間隔時，同一幀通知所有 Reel 進入停輪流程
        if ( reelStopInterval === 0 )
        {
            this.stopAllPendingReels();
            return;
        }

        // 一般停輪先立即停止第一軸，後續 Reel 再依目前停輪間隔停止
        this.stopNextReel();
    }

    // 繼續通知尚未收到 StopSpin 的 Reel，並等待所有 Reel 真正回到 Idle
    private updateStopping( deltaTime: number ): void
    {
        if ( this._nextStopReelIndex < this.Reels.length )
        {
            const reelStopInterval: number = this.getSpeedSetting().ReelStopInterval;

            if ( reelStopInterval === 0 )
            {
                this.stopAllPendingReels();
            }
            else
            {
                this.updateAutoStopSequence( deltaTime, reelStopInterval );
            }
        }

        // StopSpin 全部送出不代表 Reel 已停下，仍要等 Stop 與 Shock 完成後回到 Idle
        if ( this.Reels.some( ( reel: Reel ): boolean => reel.IsRunning ) )
        {
            return;
        }

        this._fsMachine.ChangeState( ReelControllerState.Complete );
    }

    // 依目前 ReelStopInterval 依序通知下一軸停輪
    private updateAutoStopSequence( deltaTime: number, reelStopInterval: number ): void
    {
        this._stopIntervalElapsedTime += deltaTime;

        // 若這一幀已經經過多個停軸間隔，就把這些時間內應該停下的 Reel 一次處理完
        while ( this._nextStopReelIndex < this.Reels.length && this._stopIntervalElapsedTime >= reelStopInterval )
        {
            this._stopIntervalElapsedTime -= reelStopInterval;
            this.stopNextReel();
        }
    }

    // 將下一個尚未收到 StopSpin 的 Reel 切入停輪流程
    private stopNextReel(): void
    {
        const reelIndex: number = this._nextStopReelIndex;
        this.Reels[ reelIndex ].StopSpin( this._reelResults[ reelIndex ] );
        this._nextStopReelIndex++;
    }

    // 同一幀通知所有尚未收到 StopSpin 的 Reel 停輪
    private stopAllPendingReels(): void
    {
        while ( this._nextStopReelIndex < this.Reels.length )
        {
            this.stopNextReel();
        }
    }

    // Spin 過程中切換 Speed Level，並立即更新仍在運轉中的 Reel
    private changeSpeedLevel( speedLevel: ReelSpeedLevel ): void
    {
        this._speedLevel = speedLevel;

        const spinSpeed: number = this.getSpeedSetting().SpinSpeed;

        for ( const reel of this.Reels )
        {
            if ( reel.IsRunning )
            {
                reel.SetSpinSpeed( spinSpeed );
            }
        }
    }

    // 取得目前 Speed Level 對應的速度與停輪時間
    private getSpeedSetting(): IReelSpeedSetting
    {
        const reelSpeedSettings: IReelSpeedSettings = GameConfig.GetInstance().ReelSpeedSettings;

        if ( this._speedLevel === ReelSpeedLevel.Turbo )
        {
            return reelSpeedSettings.Turbo;
        }

        if ( this._speedLevel === ReelSpeedLevel.Skip )
        {
            return reelSpeedSettings.Skip;
        }

        return reelSpeedSettings.Normal;
    }

    // 本次 Spin 完成後先回到 Idle 重設資料，再通知 SlotProcessor
    private enterComplete(): void
    {
        const onSpinFinished: ( () => void ) | null = this._onSpinFinished;

        this._fsMachine.ChangeState( ReelControllerState.Idle );

        onSpinFinished?.();
    }
}