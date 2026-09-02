import { _decorator, Button, Component, Label } from 'cc';
import { SlotGameManager } from '../SlotGameManager/SlotGameManager';
import { PlayerInfo } from '../Player/PlayerInfo';
import { ReelSpeedLevel } from '../Reel/ReelSpeed';

const { ccclass, property } = _decorator;

// 負責玩家操作與 UI 顯示；Round 操作交給 SlotGameManager，玩家資料只從 PlayerInfo 讀取
@ccclass( 'GameUIController' )
export class GameUIController extends Component
{
    // 玩家開始 Spin 使用的按鈕
    @property( { type: Button } )
    public SpinButton: Button | null = null;

    // 玩家要求 Skip 使用的按鈕
    @property( { type: Button } )
    public StopButton: Button | null = null;

    // Turbo 關閉中的按鈕
    @property( { type: Button } )
    public TurboOffButton: Button | null = null;

    // Turbo 啟用中的按鈕
    @property( { type: Button } )
    public TurboOnButton: Button | null = null;

    // 顯示玩家目前 Balance
    @property( { type: Label } )
    public BalanceLabel: Label | null = null;

    // 顯示目前每局 Bet
    @property( { type: Label } )
    public BetLabel: Label | null = null;

    // 顯示目前一局的 Win
    @property( { type: Label } )
    public WinLabel: Label | null = null;

    // 提供 Round 狀態與操作入口的 SlotGameManager
    @property( { type: SlotGameManager } )
    public SlotGameManager: SlotGameManager | null = null;

    // 提供 Balance、Bet、Win 顯示資料；GameUIController 只讀取，不修改玩家資料
    @property( { type: PlayerInfo } )
    public PlayerInfo: PlayerInfo | null = null;

    // 上一次套用至 UI 的 Round 狀態
    private _lastIsRoundRunning: boolean | null = null;
    // 上一次套用至 UI 的 Round Skip 狀態
    private _lastCanSkipRound: boolean | null = null;

    // 上一次套用至 UI 的 SpeedLevel
    private _lastSpeedLevel: ReelSpeedLevel | null = null;

    // 保存上一次已套用至 UI 的數值，避免 update() 每幀重複設定 Label
    private _lastBalance: number | null = null;
    private _lastBet: number | null = null;
    private _lastWin: number | null = null;

    // 每幀檢查按鈕狀態與玩家資料是否需要更新
    protected update(): void
    {
        this.updateButtonState();
        this.updateGameDataView();
    }

    // Component 啟用時註冊按鈕事件並同步 UI 狀態
    protected onEnable(): void
    {
        this.SpinButton?.node.on( Button.EventType.CLICK, this.onSpinButtonClick, this );
        this.StopButton?.node.on( Button.EventType.CLICK, this.onStopButtonClick, this );
        this.TurboOffButton?.node.on( Button.EventType.CLICK, this.onTurboButtonClick, this );
        this.TurboOnButton?.node.on( Button.EventType.CLICK, this.onTurboButtonClick, this );
        this.updateButtonState();
        this.updateGameDataView();
    }

    // Component 停用時移除按鈕事件並重設 UI 狀態快取
    protected onDisable(): void
    {
        this.SpinButton?.node.off( Button.EventType.CLICK, this.onSpinButtonClick, this );
        this.StopButton?.node.off( Button.EventType.CLICK, this.onStopButtonClick, this );
        this.TurboOffButton?.node.off( Button.EventType.CLICK, this.onTurboButtonClick, this );
        this.TurboOnButton?.node.off( Button.EventType.CLICK, this.onTurboButtonClick, this );
        this._lastIsRoundRunning = null;
        this._lastCanSkipRound = null;
        this._lastSpeedLevel = null;
        this._lastBalance = null;
        this._lastBet = null;
        this._lastWin = null;
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

    // 根據Turbo按鈕的點擊，通知 SlotGameManager 切換目前的 SpeedLevel，以及更新按鈕狀態
    private onTurboButtonClick(): void
    {
        if ( !this.SlotGameManager )
        {
            return;
        }

        this.SlotGameManager.ToggleTurbo();
        this.updateButtonState();
    }

    // 依照目前 Round 與 Skip 狀態更新按鈕顯示
    private updateButtonState(): void
    {
        // 必要元件尚未設定完成時不更新 UI
        if ( !this.SlotGameManager || !this.SpinButton || !this.StopButton || !this.TurboOffButton || !this.TurboOnButton )
        {
            return;
        }

        const isRoundRunning: boolean = this.SlotGameManager.IsRoundRunning;
        const canSkipRound: boolean = this.SlotGameManager.CanSkipRound;
        const speedLevel: ReelSpeedLevel = this.SlotGameManager.ReelSpeedLevel;
        const isTurbo: boolean = speedLevel === ReelSpeedLevel.Turbo;

        // Round 、Turbo 與 Skip 狀態沒有改變時不重複更新按鈕
        if ( this._lastIsRoundRunning === isRoundRunning && this._lastCanSkipRound === canSkipRound && this._lastSpeedLevel === speedLevel )
        {
            return;
        }
        this._lastSpeedLevel = speedLevel;
        this._lastIsRoundRunning = isRoundRunning;
        this._lastCanSkipRound = canSkipRound;

        // Round 進行中顯示 Stop Button，並依目前狀態決定是否允許 Skip
        this.SpinButton.node.active = !isRoundRunning;
        this.StopButton.node.active = isRoundRunning;
        this.StopButton.interactable = canSkipRound;
        // 根據目前的 Turbo 狀態更新 Turbo 按鈕顯示，以及是否允許操作
        this.TurboOffButton.node.active = !isTurbo;
        this.TurboOnButton.node.active = isTurbo;
        this.TurboOffButton.interactable = !isRoundRunning;
        this.TurboOnButton.interactable = !isRoundRunning;
    }

    // 直接讀取 PlayerInfo，更新 Balance、Bet、Win 顯示
    private updateGameDataView(): void
    {
        if ( !this.PlayerInfo || !this.BalanceLabel || !this.BetLabel || !this.WinLabel )
        {
            return;
        }

        const balance: number = this.PlayerInfo.Balance;
        const bet: number = this.PlayerInfo.Bet;
        const win: number = this.PlayerInfo.Win;

        if ( this._lastBalance !== balance )
        {
            this._lastBalance = balance;
            this.BalanceLabel.string = `${balance}`;
        }

        if ( this._lastBet !== bet )
        {
            this._lastBet = bet;
            this.BetLabel.string = `${bet}`;
        }

        if ( this._lastWin !== win )
        {
            this._lastWin = win;
            this.WinLabel.string = `$${win}`;
        }
    }
}
