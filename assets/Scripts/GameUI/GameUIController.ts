import { _decorator, Button, Component, Label, Node } from 'cc';
import { GameConfig } from '../GameUtility/GameConfig';
import { SlotGameManager } from '../SlotGameManager/SlotGameManager';
import { PlayerInfo } from '../Player/PlayerInfo';
import { ISelectionOption } from './SelectionOption';
import { SelectionPanel } from './SelectionPanel';

const { ccclass, property } = _decorator;

// 負責玩家操作與 UI 顯示；Game Logic 操作交給 SlotGameManager，玩家資料只透過 PlayerInfo 公開介面存取
@ccclass( 'GameUIController' )
export class GameUIController extends Component
{
    @property( { type: Button } )
    public SpinButton: Button | null = null;

    @property( { type: Button } )
    public StopButton: Button | null = null;

    @property( { type: Button } )
    public TurboOffButton: Button | null = null;

    @property( { type: Button } )
    public TurboOnButton: Button | null = null;

    // Auto 主操作按鈕；未執行 Auto 時開啟局數選擇 Panel，Auto 執行中再次點擊則取消後續 Auto
    @property( { type: Button } )
    public AutoButton: Button | null = null;

    // 有限 Auto 顯示目前設定 / 剩餘局數；Infinite 使用獨立 Icon
    @property( { type: Label } )
    public AutoButtonLabel: Label | null = null;

    // Auto 已設定或執行中時覆蓋原本 Auto Button 樣式
    @property( { type: Node } )
    public AutoButtonCoverBackground: Node | null = null;

    // Infinite Auto 專用顯示；有限局數時保持隱藏
    @property( { type: Node } )
    public AutoButtonInfiniteIcon: Node | null = null;

    // Auto 專用的 SelectionPanel instance；Bet 使用同一 Prefab 的另一份 instance
    @property( { type: SelectionPanel } )
    public AutoSelectionPanel: SelectionPanel | null = null;

    // 開啟 BetSelectionPanel 的按鈕
    @property( { type: Button } )
    public BetButton: Button | null = null;

    // Bet 使用獨立的 SelectionPanel instance，避免與 Auto 在 Runtime 切換用途與 View 設定
    @property( { type: SelectionPanel } )
    public BetSelectionPanel: SelectionPanel | null = null;

    @property( { type: Label } )
    public BalanceLabel: Label | null = null;

    @property( { type: Label } )
    public BetLabel: Label | null = null;

    @property( { type: Label } )
    public WinLabel: Label | null = null;

    // 提供 Round、Turbo、Auto 等 Game-Level 操作與公開狀態
    @property( { type: SlotGameManager } )
    public SlotGameManager: SlotGameManager | null = null;

    // 提供 Balance、Bet、Win；Bet 選擇只透過 PlayerInfo 的公開 API 寫入
    @property( { type: PlayerInfo } )
    public PlayerInfo: PlayerInfo | null = null;

    // 以下 cache 只保存上一次已套用至 UI 的資料，避免 update() 每幀重複修改 View
    private _lastIsRoundRunning: boolean | null = null;
    private _lastCanSkipRound: boolean | null = null;
    private _lastIsTurbo: boolean | null = null;
    private _lastAutoSpinCount: number | null = null;
    private _lastIsAutoRunning: boolean | null = null;
    private _lastBalance: number | null = null;
    private _lastBet: number | null = null;
    private _lastWin: number | null = null;

    // 各 Panel 的 Option Nodes 在用途不變時只建立一次；Title、Grid 欄數與 allowSwitchOff 由 Prefab instance 決定
    protected start(): void
    {
        this.configureAutoSelectionPanel();
        this.configureBetSelectionPanel();
    }

    // 每幀只同步可能由 Game Logic 改變的公開資料，不由 UI 自行決定狀態
    protected update(): void
    {
        this.updateButtonState();
        this.updateGameDataView();
        this.updateAutoSpinView();
    }

    // Component 啟用時註冊玩家操作，並立即以目前 Game Data 套用一次 View
    protected onEnable(): void
    {
        this.SpinButton?.node.on( Button.EventType.CLICK, this.onSpinButtonClick, this );
        this.StopButton?.node.on( Button.EventType.CLICK, this.onStopButtonClick, this );
        this.TurboOffButton?.node.on( Button.EventType.CLICK, this.onTurboButtonClick, this );
        this.TurboOnButton?.node.on( Button.EventType.CLICK, this.onTurboButtonClick, this );
        this.AutoButton?.node.on( Button.EventType.CLICK, this.onAutoButtonClick, this );
        this.BetButton?.node.on( Button.EventType.CLICK, this.onBetButtonClick, this );

        this.updateButtonState();
        this.updateGameDataView();
        this.updateAutoSpinView();
    }

    // Component 再次啟用時必須重新套用最新資料，因此只重設 View cache，不修改 Game Data
    protected onDisable(): void
    {
        this.SpinButton?.node.off( Button.EventType.CLICK, this.onSpinButtonClick, this );
        this.StopButton?.node.off( Button.EventType.CLICK, this.onStopButtonClick, this );
        this.TurboOffButton?.node.off( Button.EventType.CLICK, this.onTurboButtonClick, this );
        this.TurboOnButton?.node.off( Button.EventType.CLICK, this.onTurboButtonClick, this );
        this.AutoButton?.node.off( Button.EventType.CLICK, this.onAutoButtonClick, this );
        this.BetButton?.node.off( Button.EventType.CLICK, this.onBetButtonClick, this );

        this._lastIsRoundRunning = null;
        this._lastCanSkipRound = null;
        this._lastIsTurbo = null;
        this._lastAutoSpinCount = null;
        this._lastIsAutoRunning = null;
        this._lastBalance = null;
        this._lastBet = null;
        this._lastWin = null;
    }

    // Auto 可選局數由 GameConfig 提供；GameUIController 只把 numeric value 轉成 SelectionPanel 顯示資料
    private configureAutoSelectionPanel(): void
    {
        if ( !this.AutoSelectionPanel )
        {
            return;
        }

        const gameConfig: GameConfig = GameConfig.GetInstance();
        const infiniteCount: number = gameConfig.AutoSpinInfiniteCount;
        const selectionOptions: ISelectionOption[] = gameConfig.AutoSpinCounts.map( ( spinCount: number ): ISelectionOption => ( {
            Label: spinCount === infiniteCount ? '∞' : `${spinCount}`,
            Value: spinCount,
        } ) );

        this.AutoSelectionPanel.Configure( selectionOptions, this.onAutoSpinCountChanged.bind( this ) );
    }

    // Bet 選項的數值與顯示文字相同；SelectionPanel 只接收 View 所需的 Label / Value mapping
    private configureBetSelectionPanel(): void
    {
        if ( !this.BetSelectionPanel )
        {
            return;
        }

        const selectionOptions: ISelectionOption[] = GameConfig.GetInstance().BetValues.map( ( betValue: number ): ISelectionOption => ( {
            Label: `${betValue}`,
            Value: betValue,
        } ) );

        this.BetSelectionPanel.Configure( selectionOptions, this.onBetChanged.bind( this ) );
    }

    // 玩家按 Spin 時，沒有 Auto 設定就啟動單一 Round；已有 Auto 設定則正式進入 Auto Flow
    private onSpinButtonClick(): void
    {
        if ( !this.SlotGameManager )
        {
            return;
        }

        if ( this.SlotGameManager.AutoSpinCount > 0 )
        {
            this.SlotGameManager.StartAuto();
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

    // Turbo 設定只影響下一個 Round；目前已開始的 Round 使用自己的 Speed snapshot，不會中途改速
    private onTurboButtonClick(): void
    {
        if ( !this.SlotGameManager )
        {
            return;
        }

        this.SlotGameManager.ToggleTurbo();
        this.updateButtonState();
    }

    // Auto 執行中再次點擊只取消後續局；尚未執行時才開啟 AutoSelectionPanel 調整局數
    private onAutoButtonClick(): void
    {
        if ( !this.SlotGameManager )
        {
            return;
        }

        if ( this.SlotGameManager.IsAutoRunning )
        {
            this.SlotGameManager.StopAuto();
            this.updateAutoSpinView();
            return;
        }

        if ( !this.AutoSelectionPanel )
        {
            return;
        }

        // Panel 每次開啟都以 Manager 的最新設定同步 Toggle，不依賴上次關閉時留下的 View State
        const autoSpinCount: number = this.SlotGameManager.AutoSpinCount;
        this.AutoSelectionPanel.Show( autoSpinCount > 0 ? autoSpinCount : null );
    }

    // SelectionPanel 的 null 只代表目前沒有 UI Selection；Auto domain 使用 0 表達尚未設定
    private onAutoSpinCountChanged( selectedValue: number | null ): void
    {
        if ( !this.SlotGameManager )
        {
            return;
        }

        this.SlotGameManager.SetAutoSpinCount( selectedValue ?? 0 );
        this.updateAutoSpinView();
    }

    // Bet Panel 每次開啟都以 PlayerInfo 的最新值同步 Toggle，不把 Panel 上次狀態當成玩家資料
    private onBetButtonClick(): void
    {
        if ( !this.PlayerInfo || !this.BetSelectionPanel )
        {
            return;
        }

        this.BetSelectionPanel.Show( this.PlayerInfo.Bet );
    }

    // BetSelectionPanel 不允許取消整組選擇；有效數值直接交由 PlayerInfo 保存
    private onBetChanged( selectedValue: number | null ): void
    {
        if ( !this.PlayerInfo || selectedValue === null )
        {
            return;
        }

        this.PlayerInfo.SetBet( selectedValue );
        this.updateGameDataView();
    }

    // 依目前 Round、Skip 與 Turbo 狀態同步按鈕顯示
    private updateButtonState(): void
    {
        if ( !this.SlotGameManager || !this.SpinButton || !this.StopButton || !this.TurboOffButton || !this.TurboOnButton )
        {
            return;
        }

        const isRoundRunning: boolean = this.SlotGameManager.IsRoundRunning;
        const canSkipRound: boolean = this.SlotGameManager.CanSkipRound;
        const isTurbo: boolean = this.SlotGameManager.IsTurbo;

        if ( this._lastIsRoundRunning === isRoundRunning && this._lastCanSkipRound === canSkipRound && this._lastIsTurbo === isTurbo )
        {
            return;
        }

        this._lastIsRoundRunning = isRoundRunning;
        this._lastCanSkipRound = canSkipRound;
        this._lastIsTurbo = isTurbo;

        // StopSpin Command 與 Reel 真正完成不同，因此 Stop Button 是否可用只讀取公開 CanSkipRound
        this.SpinButton.node.active = !isRoundRunning;
        this.StopButton.node.active = isRoundRunning;
        this.StopButton.interactable = canSkipRound;

        // Turbo Button 永遠可以切換；Round 中修改的是下一局設定，不會改變目前 Round 已保存的 Speed
        this.TurboOffButton.node.active = !isTurbo;
        this.TurboOnButton.node.active = isTurbo;
    }

    // Balance、Bet、Win 的 owner 是 PlayerInfo；UI 只透過公開資料與操作同步 Label
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

    // Auto Button 依 Auto 設定與執行狀態呈現有限局數、Infinite Icon 或預設樣式
    private updateAutoSpinView(): void
    {
        if ( !this.SlotGameManager || !this.AutoButtonLabel || !this.AutoButtonCoverBackground || !this.AutoButtonInfiniteIcon )
        {
            return;
        }

        const autoSpinCount: number = this.SlotGameManager.AutoSpinCount;
        const isAutoRunning: boolean = this.SlotGameManager.IsAutoRunning;

        if ( this._lastAutoSpinCount === autoSpinCount && this._lastIsAutoRunning === isAutoRunning )
        {
            return;
        }

        this._lastAutoSpinCount = autoSpinCount;
        this._lastIsAutoRunning = isAutoRunning;

        // 最後一局開始後 Count 已是 0，但 Auto 仍在執行；必須等該 Round 完整結束後才能恢復預設 Button
        const hasAutoSetting: boolean = autoSpinCount > 0 || isAutoRunning;

        if ( !hasAutoSetting )
        {
            this.AutoButtonLabel.string = '';
            this.AutoButtonLabel.node.active = true;
            this.AutoButtonInfiniteIcon.active = false;
            this.AutoButtonCoverBackground.active = false;
            return;
        }

        const isInfinite: boolean = autoSpinCount === GameConfig.GetInstance().AutoSpinInfiniteCount;

        // Infinite 使用獨立 Icon 呈現，不讓 Config sentinel 洩漏到玩家畫面
        if ( isInfinite )
        {
            this.AutoButtonLabel.string = '';
            this.AutoButtonLabel.node.active = false;
            this.AutoButtonInfiniteIcon.active = true;
            this.AutoButtonCoverBackground.active = true;
            return;
        }

        // Auto 執行中的 49、48...直接顯示 Manager 的剩餘 Count，不依賴原始 SpinCounts
        this.AutoButtonLabel.string = `${autoSpinCount}`;
        this.AutoButtonLabel.node.active = true;
        this.AutoButtonInfiniteIcon.active = false;
        this.AutoButtonCoverBackground.active = true;
    }
}
