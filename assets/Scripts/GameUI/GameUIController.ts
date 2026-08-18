import { _decorator, Button, Component } from 'cc';
import { SlotGameManager } from '../SlotGameManager/SlotGameManager';
const { ccclass, property } = _decorator;

@ccclass( 'GameUIController' )
export class GameUIController extends Component
{
    @property( { type: Button } )
    public SpinButton: Button | null = null;

    @property( { type: Button } )
    public StopButton: Button | null = null;

    @property( { type: SlotGameManager } )
    public SlotGameManager: SlotGameManager | null = null;

    private _lastIsSpinning: boolean | null = null;
    private _lastCanSkip: boolean | null = null;

    protected update(): void
    {
        this.updateButtonState();
    }

    protected onEnable(): void
    {
        this.SpinButton?.node.on( Button.EventType.CLICK, this.onSpinButtonClick, this );
        this.StopButton?.node.on( Button.EventType.CLICK, this.onStopButtonClick, this );
        this.updateButtonState();
    }

    protected onDisable(): void
    {
        this.SpinButton?.node.off( Button.EventType.CLICK, this.onSpinButtonClick, this );
        this.StopButton?.node.off( Button.EventType.CLICK, this.onStopButtonClick, this );
        this._lastIsSpinning = null;
        this._lastCanSkip = null;
    }

    private onSpinButtonClick(): void
    {
        if ( !this.SlotGameManager )
        {
            return;
        }
        this.SlotGameManager.StartSpin();
    }

    private onStopButtonClick(): void
    {
        if ( !this.SlotGameManager )
        {
            return;
        }
        this.SlotGameManager.SkipSpin();
    }

    private updateButtonState(): void
    {
        if ( !this.SlotGameManager || !this.SpinButton || !this.StopButton )
        {
            return;
        }
        const isSpinning: boolean = this.SlotGameManager.IsSpinning;
        const canSkip: boolean = this.SlotGameManager.CanSkip;

        if ( this._lastIsSpinning === isSpinning && this._lastCanSkip === canSkip )
        {
            return;
        }

        this._lastIsSpinning = isSpinning;
        this._lastCanSkip = canSkip;
        this.SpinButton.node.active = !isSpinning;
        this.StopButton.node.active = isSpinning;
        this.StopButton.interactable = canSkip;
    }
}


