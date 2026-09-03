import { _decorator, Button, Component, instantiate, Label, Layout, Node, Prefab, ToggleContainer } from 'cc';
import { ISelectionOption, SelectionOption } from './SelectionOption';

const { ccclass, property } = _decorator;

// 通用選擇型 View；管理一組 Toggle 的顯示與目前 Selection，不知道選項實際代表 Auto 或 Bet
@ccclass( 'SelectionPanel' )
export class SelectionPanel extends Component
{
    @property( { type: Label } )
    public TitleLabel: Label | null = null;

    @property( { type: Node } )
    public OptionContainer: Node | null = null;

    // 限制同一組選項的選中關係；是否允許全部取消由使用此 Panel 的功能決定
    @property( { type: ToggleContainer } )
    public ToggleGroup: ToggleContainer | null = null;

    @property( { type: Layout } )
    public OptionLayout: Layout | null = null;

    @property( { type: Button } )
    public CloseButton: Button | null = null;

    @property( { type: Prefab } )
    public SelectionOptionPrefab: Prefab | null = null;

    // 保存目前建立的 Option，Show 時只同步 View，不重新建立 Node
    private _selectionOptions: SelectionOption[] = [];

    private _onSelectionChanged: ( ( selectedValue: number | null ) => void ) | null = null;

    // 只有選項內容或使用方式改變時才重新建立；單純開關 Panel 不應重建 Options
    public Configure( title: string, options: ISelectionOption[], columnCount: number, allowSwitchOff: boolean, onSelectionChanged: ( selectedValue: number | null ) => void ): void
    {
        if ( !this.TitleLabel || !this.OptionContainer || !this.ToggleGroup || !this.OptionLayout || !this.SelectionOptionPrefab )
        {
            return;
        }

        this._onSelectionChanged = onSelectionChanged;
        this.TitleLabel.string = title;
        this.ToggleGroup.allowSwitchOff = allowSwitchOff;
        this.OptionLayout.constraintNum = columnCount;

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

            // 先完成 Option 資料設定，再加入啟用中的 Container，避免初始化時產生沒有必要的 Selection Event
            selectionOption.Configure( option, this.onOptionChanged.bind( this ) );

            this.OptionContainer.addChild( optionNode );
            this._selectionOptions.push( selectionOption );
        }

        this.OptionLayout.updateLayout( true );
    }

    // 每次顯示都以外部最新資料同步 Selection；Panel 不保存 Game Data 作為下次顯示依據
    public Show( currentValue: number | null ): void
    {
        this.updateSelectedValue( currentValue );
        this.node.active = true;
    }

    public Hide(): void
    {
        this.node.active = false;
    }

    protected onEnable(): void
    {
        this.CloseButton?.node.on( Button.EventType.CLICK, this.Hide, this );
    }

    protected onDisable(): void
    {
        this.CloseButton?.node.off( Button.EventType.CLICK, this.Hide, this );
    }

    // Toggle 切換成 selected 時回傳 Value；只有整組都沒有選項時才回傳 null
    private onOptionChanged( selectedValue: number, isSelected: boolean ): void
    {
        if ( isSelected )
        {
            this._onSelectionChanged?.( selectedValue );
            return;
        }

        if ( this.ToggleGroup && !this.ToggleGroup.anyTogglesChecked() )
        {
            this._onSelectionChanged?.( null );
        }
    }

    private updateSelectedValue( currentValue: number | null ): void
    {
        for ( const selectionOption of this._selectionOptions )
        {
            selectionOption.SetSelected( currentValue !== null && selectionOption.Value === currentValue );
        }
    }

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