import { _decorator, Button, Component, instantiate, Layout, Node, Prefab, ToggleContainer } from 'cc';
import { ISelectionOption, SelectionOption } from './SelectionOption';

const { ccclass, property } = _decorator;

// 通用選擇型 View；管理一組 Toggle 的建立、顯示與目前 Selection，不知道選項實際代表 Auto 或 Bet
@ccclass( 'SelectionPanel' )
export class SelectionPanel extends Component
{
    // 動態建立的 SelectionOption 都加入此 Node；Option 的生命週期跟選項內容走，不跟 Panel Show / Hide 綁定
    @property( { type: Node } )
    public OptionContainer: Node | null = null;

    // 負責同一組 Toggle 的單選關係；allowSwitchOff 由各自的 Prefab instance 在 Inspector 設定
    @property( { type: ToggleContainer } )
    public ToggleGroup: ToggleContainer | null = null;

    // Grid 型式與欄數由各自的 Prefab instance 決定；Runtime 只在建立 Options 後要求重新排版
    @property( { type: Layout } )
    public OptionLayout: Layout | null = null;

    @property( { type: Button } )
    public CloseButton: Button | null = null;

    // 每個選項共用同一份 Prefab，實際 Label / Value 由 Configure 傳入
    @property( { type: Prefab } )
    public SelectionOptionPrefab: Prefab | null = null;

    // 保存目前已建立的 Option；Show 時只同步 checked 狀態，不重建 Node
    private _selectionOptions: SelectionOption[] = [];

    // 將目前整組 Selection 回傳給外部；null 只代表此 Panel 現在沒有任何選項被選中
    private _onSelectionChanged: ( ( selectedValue: number | null ) => void ) | null = null;

    // 只有選項內容改變時才重新建立 Options；Panel 標題、Grid 與 Toggle 規則都由 Prefab instance 決定
    public Configure( options: ISelectionOption[], onSelectionChanged: ( selectedValue: number | null ) => void ): void
    {
        if ( !this.OptionContainer || !this.ToggleGroup || !this.OptionLayout || !this.SelectionOptionPrefab )
        {
            return;
        }

        this._onSelectionChanged = onSelectionChanged;

        // Configure 代表這組內容已變更，因此先清除上一組 Options 再建立新的 View
        this.clearOptions();

        for ( const option of options )
        {
            const optionNode: Node = instantiate( this.SelectionOptionPrefab );
            const selectionOption: SelectionOption | null = optionNode.getComponent( SelectionOption );

            if ( !selectionOption )
            {
                optionNode.destroy();
                continue;
            }

            // 先完成 Option 資料設定，再加入 Container，讓啟用時已具有完整顯示資料與 callback
            selectionOption.Configure( option, this.onOptionChanged.bind( this ) );

            this.OptionContainer.addChild( optionNode );
            this._selectionOptions.push( selectionOption );
        }

        // Options 只在 Configure 後重新排版，不因每次 Show 重做 Layout
        this.OptionLayout.updateLayout( true );
    }

    // 每次顯示都以外部最新資料同步 checked 狀態；Panel 不把上次關閉時的 View State 當成真正資料來源
    public Show( currentValue: number | null ): void
    {
        this.updateSelectedValue( currentValue );
        this.node.active = true;
    }

    public Hide(): void
    {
        this.node.active = false;
    }

    // Panel 顯示期間才監聽 Close Button，避免重複註冊 lifecycle event
    protected onEnable(): void
    {
        this.CloseButton?.node.on( Button.EventType.CLICK, this.Hide, this );
    }

    protected onDisable(): void
    {
        this.CloseButton?.node.off( Button.EventType.CLICK, this.Hide, this );
    }

    // selected=true 代表新的有效選擇；selected=false 只有在整組都未選取時才代表取消 Selection
    private onOptionChanged( selectedValue: number, isSelected: boolean ): void
    {
        if ( isSelected )
        {
            this._onSelectionChanged?.( selectedValue );
            return;
        }

        // 改選另一顆 Toggle 時，舊 Toggle 也會變成 unchecked；只有整組都沒選項時才回傳 null
        if ( this.ToggleGroup && !this.ToggleGroup.anyTogglesChecked() )
        {
            this._onSelectionChanged?.( null );
        }
    }

    // Data -> View：外部 currentValue 是唯一依據，不從 Toggle checked 狀態反推 Game Data
    private updateSelectedValue( currentValue: number | null ): void
    {
        for ( const selectionOption of this._selectionOptions )
        {
            selectionOption.SetSelected( currentValue !== null && selectionOption.Value === currentValue );
        }
    }

    // Configure 換內容時才銷毀上一組 Options；Show / Hide 不影響已建立的選項內容
    private clearOptions(): void
    {
        for ( const selectionOption of this._selectionOptions )
        {
            selectionOption.node.removeFromParent();
            selectionOption.node.destroy();
        }

        this._selectionOptions.length = 0;
    }
}
