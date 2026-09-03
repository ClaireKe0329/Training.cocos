import { _decorator, Component, Label, Toggle } from 'cc';

const { ccclass, property } = _decorator;

// SelectionPanel 使用的最小選項資料；Label 負責顯示，Value 負責回傳實際選擇值
export interface ISelectionOption
{
    Label: string;
    Value: number;
}

// 負責單一選項的顯示與 Toggle 操作；選項用途與整組選擇規則由 SelectionPanel 決定
@ccclass( 'SelectionOption' )
export class SelectionOption extends Component
{
    // 單一選項的 Toggle；只回報 checked 狀態，不判斷整組 Selection
    @property( { type: Toggle } )
    public Toggle: Toggle | null = null;

    // 顯示外部 Configure 傳入的選項文字
    @property( { type: Label } )
    public OptionLabel: Label | null = null;

    // 保存此 Option 對應的實際 Value，避免從 Label 文字反推資料
    private _value: number = 0;

    // 將單顆 Toggle 的狀態變化回報給 SelectionPanel，由 Panel 判斷整組 Selection 結果
    private _onChanged: ( ( selectedValue: number, isSelected: boolean ) => void ) | null = null;

    public get Value(): number
    {
        return this._value;
    }

    // Option 建立時套用固定的 Label、Value 與 callback；選中狀態由 Panel 顯示時另外同步
    public Configure( option: ISelectionOption, onChanged: ( selectedValue: number, isSelected: boolean ) => void ): void
    {
        this._value = option.Value;
        this._onChanged = onChanged;

        if ( this.OptionLabel )
        {
            this.OptionLabel.string = option.Label;
        }
    }

    // 外部資料決定目前的 checked 狀態；同步 View 時不觸發 Toggle Event，避免反向修改 Game Data
    public SetSelected( isSelected: boolean ): void
    {
        this.Toggle?.setIsCheckedWithoutNotify( isSelected );
    }

    // Option 進入有效 Hierarchy 後才監聽 Toggle，確保 Configure 可先完成資料設定
    protected onEnable(): void
    {
        this.Toggle?.node.on( Toggle.EventType.TOGGLE, this.onToggleChanged, this );
    }

    protected onDisable(): void
    {
        this.Toggle?.node.off( Toggle.EventType.TOGGLE, this.onToggleChanged, this );
    }

    // SelectionOption 只回報自身狀態；是否代表改選或取消整組 Selection 由 SelectionPanel 判斷
    private onToggleChanged( toggle: Toggle ): void
    {
        this._onChanged?.( this._value, toggle.isChecked );
    }
}
