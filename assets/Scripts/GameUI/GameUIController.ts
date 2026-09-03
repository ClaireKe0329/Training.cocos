import { _decorator, Button, Component, Label, Node } from 'cc';
import { SlotGameManager } from '../SlotGameManager/SlotGameManager';
import { PlayerInfo } from '../Player/PlayerInfo';
import { ISelectionOption } from './SelectionOption';
import { SelectionPanel } from './SelectionPanel';

const { ccclass, property } = _decorator;

// Auto 選擇 Panel 的固定 View 設定；選項內容目前由 UI 層提供，之後若改為 Config 再調整資料來源
const AUTO_SELECTION_TITLE: string = '自動旋轉';
const AUTO_SELECTION_COLUMN_COUNT: number = 4;

// 9999 是目前 Auto Infinite 的資料約定值；SelectionPanel 仍只把它當成一般 number
const AUTO_SPIN_INFINITE_COUNT: number = 9999;

// Label 只負責玩家看到的文字，Value 才是 SelectionPanel 回傳給 Auto Flow 的實際資料
const AUTO_SELECTION_OPTIONS: ISelectionOption[] = [
    { Label: '10', Value: 10 }, { Label: '50', Value: 50 }, { Label: '100', Value: 100 }, { Label: '250', Value: 250 },
    { Label: '500', Value: 500 }, { Label: '750', Value: 750 }, { Label: '1000', Value: 1000 }, { Label: '∞', Value: AUTO_SPIN_INFINITE_COUNT },
];

// 負責玩家操作與 UI 顯示；Round 操作交給 SlotGameManager，玩家資料只從 PlayerInfo 讀取
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

    // Auto 主操作按鈕；目前未執行 Auto 時用來開啟局數選擇 Panel
    @property( { type: Button } )
    public AutoButton: Button | null = null;

    // 有限局數顯示；Infinite 使用獨立 Icon，不直接把 9999 顯示給玩家
    @property( { type: Label } )
    public AutoButtonLabel: Label | null = null;

    // Auto 已設定或執行中時覆蓋原本 Auto Button 樣式
    @property( { type: Node } )
    public AutoButtonCoverBackground: Node | null = null;

    // Infinite Auto 專用顯示；有限局數時保持隱藏
    @property( { type: Node } )
    public AutoButtonInfiniteIcon: Node | null = null;

    // Auto 與之後的 Bet 共用同一種選擇型 View，Panel 本身不知道選項代表的 Game Data
    @property( { type: SelectionPanel } )
    public SelectionPanel: SelectionPanel | null = null;

    @property( { type: Label } )
    public BalanceLabel: Label | null = null;

    @property( { type: Label } )
    public BetLabel: Label | null = null;

    @property( { type: Label } )
    public WinLabel: Label | null = null;

    // 提供 Round 狀態與操作入口的 SlotGameManager
    @property( { type: SlotGameManager } )
    public SlotGameManager: SlotGameManager | null = null;

    // 提供 Balance、Bet、Win 顯示資料；GameUIController 只讀取，不修改玩家資料
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

    // SelectionPanel 的內容在用途不變時只建立一次；之後開啟只同步目前 Selection
    protected start(): void
    {
        this.configureAutoSelectionPanel();
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

        this._lastIsRoundRunning = null;
        this._lastCanSkipRound = null;
        this._lastIsTurbo = null;
        this._lastAutoSpinCount = null;
        this._lastIsAutoRunning = null;
        this._lastBalance = null;
        this._lastBet = null;
        this._lastWin = null;
    }

    // Auto 是 SelectionPanel 的第一個使用者；Panel 只取得顯示資料與 selection callback，不知道 Auto 規則
    private configureAutoSelectionPanel(): void
    {
        if ( !this.SelectionPanel )
        {
            return;
        }

        // Auto 允許再次點擊目前 Toggle 取消設定；Bet 未來可使用同一個 Panel 但採不同規則
        this.SelectionPanel.Configure( AUTO_SELECTION_TITLE, AUTO_SELECTION_OPTIONS, AUTO_SELECTION_COLUMN_COUNT, true, this.onAutoSpinCountChanged.bind( this ) );
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

    // 將玩家的 Turbo 切換操作交給 SlotGameManager
    private onTurboButtonClick(): void
    {
        if ( !this.SlotGameManager )
        {
            return;
        }

        this.SlotGameManager.ToggleTurbo();
        this.updateButtonState();
    }

    // Panel 每次開啟都以 Manager 的最新 Auto 設定同步 Toggle，不依賴上一次關閉時留下的 View State
    private onAutoButtonClick(): void
    {
        if ( !this.SlotGameManager || !this.SelectionPanel )
        {
            return;
        }

        const autoSpinCount: number = this.SlotGameManager.AutoSpinCount;
        this.SelectionPanel.Show( autoSpinCount > 0 ? autoSpinCount : null );
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

    // 依照目前 Round、Skip 與 Turbo 狀態更新按鈕顯示
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

        // Turbo 是 Round 之間選擇的 Operation Mode，不在進行中的 Round 改變速度模式
        this.TurboOffButton.node.active = !isTurbo;
        this.TurboOnButton.node.active = isTurbo;
        this.TurboOffButton.interactable = !isRoundRunning;
        this.TurboOnButton.interactable = !isRoundRunning;
    }

    // Balance、Bet、Win 的 owner 是 PlayerInfo；UI 只將最新資料呈現在 Label
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

    // Auto Button 依 Auto 設定與執行狀態呈現局數、Infinite Icon 或預設樣式
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

        // 最後一局開始後 Count 已經是 0，但 Auto 仍在執行；必須等該 Round 完整結束後才能恢復預設 Button
        const hasAutoSetting: boolean = autoSpinCount > 0 || isAutoRunning;

        if ( !hasAutoSetting )
        {
            this.AutoButtonLabel.string = '';
            this.AutoButtonLabel.node.active = true;
            this.AutoButtonInfiniteIcon.active = false;
            this.AutoButtonCoverBackground.active = false;
            return;
        }

        const isInfinite: boolean = autoSpinCount === AUTO_SPIN_INFINITE_COUNT;

        // Infinite 使用獨立 Icon 呈現，不讓內部約定值 9999 洩漏到玩家畫面
        if ( isInfinite )
        {
            this.AutoButtonLabel.string = '';
            this.AutoButtonLabel.node.active = false;
            this.AutoButtonInfiniteIcon.active = true;
            this.AutoButtonCoverBackground.active = true;
            return;
        }

        const selectedOption: ISelectionOption | undefined = AUTO_SELECTION_OPTIONS.find( option => option.Value === autoSpinCount );

        // Auto 執行中的 49、48...不在預設選項內，因此找不到 Label 時直接顯示剩餘局數
        this.AutoButtonLabel.string = selectedOption?.Label ?? `${autoSpinCount}`;
        this.AutoButtonLabel.node.active = true;
        this.AutoButtonInfiniteIcon.active = false;
        this.AutoButtonCoverBackground.active = true;
    }
}
