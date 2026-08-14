import { _decorator, Component, Enum, Sprite, SpriteFrame } from 'cc';
import { SymbolType } from '../GameData/SymbolType';

const { ccclass, property } = _decorator;

@ccclass( 'SlotUnit' )
export class SlotUnit extends Component
{
    @property( { type: Sprite } )
    public SymbolSprite: Sprite | null = null;

    @property( { type: [ SpriteFrame ] } )
    public SymbolFrames: SpriteFrame[] = [];

    @property( { type: Enum( SymbolType ) } )
    public InitialSymbol: SymbolType = SymbolType.A;

    private _currentSymbol: SymbolType = SymbolType.A;

    public get CurrentSymbol(): SymbolType
    {
        return this._currentSymbol;
    }

    protected onLoad(): void
    {
        this.SetSymbol( this.InitialSymbol );
    }

    public SetSymbol( symbolType: SymbolType ): void
    {
        const symbolFrame: SpriteFrame | undefined = this.SymbolFrames[symbolType];

        if ( this.SymbolSprite === null || symbolFrame === undefined )
        {
            return;
        }

        this._currentSymbol = symbolType;
        this.SymbolSprite.spriteFrame = symbolFrame;
    }

    public Reset(): void
    {
        this.SetSymbol( this.InitialSymbol );
    }
}
