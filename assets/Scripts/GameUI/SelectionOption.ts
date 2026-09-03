import { _decorator, Component, Label, Toggle } from 'cc';

const { ccclass, property } = _decorator;

export interface ISelectionOption
{
    Label: string;
    Value: number;
}

// 負責單一選項的顯示與 Toggle 操作；選項用途與整組選擇規則由外層決定
@ccclass( 'SelectionOption' )
export class SelectionOption extends Component
{
    @property( { type: Toggle } )
    public Toggle: Toggle | null = null;

    @property( { type: Label } )
    public OptionLabel: Label | null = null;

    private _value: number = 0;

    private _onChanged: ( ( selectedValue: number, isSelected: boolean ) => void ) | null = null;

    public get Value(): number
    {
        return this._value;
    }

    // Option 建立時套用固定的顯示資料與 callback；選中狀態由 Panel 顯示時另外同步
    public Configure( option: ISelectionOption, onChanged: ( selectedValue: number, isSelected: boolean ) => void ): void
    {
        this._value = option.Value;
        this._onChanged = onChanged;

        if ( this.OptionLabel )
        {
            this.OptionLabel.string = option.Label;
        }
    }

    // 外部資料決定目前的選中狀態，不透過 Toggle Event 反向修改 Game Data
    public SetSelected( isSelected: boolean ): void
    {
        this.Toggle?.setIsCheckedWithoutNotify( isSelected );
    }

    protected onEnable(): void
    {
        this.Toggle?.node.on( Toggle.EventType.TOGGLE, this.onToggleChanged, this );
    }

    protected onDisable(): void
    {
        this.Toggle?.node.off( Toggle.EventType.TOGGLE, this.onToggleChanged, this );
    }

    private onToggleChanged( toggle: Toggle ): void
    {
        this._onChanged?.( this._value, toggle.isChecked );
    }
}