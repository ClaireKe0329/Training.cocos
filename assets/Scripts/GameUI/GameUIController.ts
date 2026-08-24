import { _decorator, Button, Component } from 'cc';
import { SlotGameManager } from '../SlotGameManager/SlotGameManager';
const { ccclass, property } = _decorator;

@ccclass( 'GameUIController' )
export class GameUIController extends Component
{
    // 玩家開始 Spin 使用的按鈕
    @property( { type: Button } )
    public SpinButton: Button | null = null;

    // 玩家要求 Skip 使用的按鈕
    @property( { type: Button } )
    public StopButton: Button | null = null;

    // 提供 Round 狀態與操作入口的 SlotGameManager
    @property( { type: SlotGameManager } )
    public SlotGameManager: SlotGameManager | null = null;

    // 上一次套用至 UI 的 Round 狀態
    private _lastIsRoundRunning: boolean | null = null;
    // 上一次套用至 UI 的 Round Skip 狀態
    private _lastCanSkipRound: boolean | null = null;

    // 每幀檢查按鈕狀態是否需要更新
    protected update(): void
    {
        this.updateButtonState();
    }

    // Component 啟用時註冊按鈕事件並同步 UI 狀態
    protected onEnable(): void
    {
        this.SpinButton?.node.on( Button.EventType.CLICK, this.onSpinButtonClick, this );
        this.StopButton?.node.on( Button.EventType.CLICK, this.onStopButtonClick, this );
        this.updateButtonState();
    }

    // Component 停用時移除按鈕事件並重設 UI 狀態快取
    protected onDisable(): void
    {
        this.SpinButton?.node.off( Button.EventType.CLICK, this.onSpinButtonClick, this );
        this.StopButton?.node.off( Button.EventType.CLICK, this.onStopButtonClick, this );
        this._lastIsRoundRunning = null;
        this._lastCanSkipRound = null;
    }

    // 將玩家的 Spin 操作交給 SlotGameManager 啟動 Round
    private onSpinButtonClick(): void
    {
        if ( !this.SlotGameManager )
        {
            return;
        }
        this.SlotGameManager.StartRound();
    }

    // 將玩家的 Skip 操作交給 SlotGameManager 處理目前 Round
    private onStopButtonClick(): void
    {
        if ( !this.SlotGameManager )
        {
            return;
        }
        this.SlotGameManager.SkipRound();
    }

    // 依照目前 Round 與 Skip 狀態更新按鈕顯示
    private updateButtonState(): void
    {
        // 必要元件尚未設定完成時不更新 UI
        if ( !this.SlotGameManager || !this.SpinButton || !this.StopButton )
        {
            return;
        }

        const isRoundRunning: boolean = this.SlotGameManager.IsRoundRunning;
        const canSkipRound: boolean = this.SlotGameManager.CanSkipRound;

        // Round 與 Skip 狀態沒有改變時不重複更新按鈕
        if ( this._lastIsRoundRunning === isRoundRunning && this._lastCanSkipRound === canSkipRound )
        {
            return;
        }

        this._lastIsRoundRunning = isRoundRunning;
        this._lastCanSkipRound = canSkipRound;

        // Round 進行中顯示 Stop Button，並依目前狀態決定是否允許 Skip
        this.SpinButton.node.active = !isRoundRunning;
        this.StopButton.node.active = isRoundRunning;
        this.StopButton.interactable = canSkipRound;
    }
}

