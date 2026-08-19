import { _decorator, Component, Enum, Sprite, SpriteFrame } from 'cc';
import { SymbolType } from '../GameData/SymbolType';

const { ccclass, property } = _decorator;

@ccclass( 'SlotUnit' )
export class SlotUnit extends Component
{
    // 顯示目前 Symbol 圖示的 Sprite
    @property( { type: Sprite } )
    public SymbolSprite: Sprite | null = null;

    // 依照 SymbolType 順序對應的 SpriteFrame
    @property( { type: [ SpriteFrame ] } )
    public SymbolFrames: SpriteFrame[] = [];

    // SlotUnit 初始化時顯示的 Symbol
    @property( { type: Enum( SymbolType ) } )
    public InitialSymbol: SymbolType = SymbolType.A;

    // 目前顯示的 Symbol
    private _currentSymbol: SymbolType = SymbolType.A;

    // 取得目前顯示的 Symbol
    public get CurrentSymbol(): SymbolType
    {
        return this._currentSymbol;
    }

    // Component 載入時套用初始 Symbol
    protected onLoad(): void
    {
        this.SetSymbol( this.InitialSymbol );
    }

    // 更新目前 Symbol 與對應的 SpriteFrame
    public SetSymbol( symbolType: SymbolType ): void
    {
        // SymbolType 的數值直接對應 SymbolFrames 的 Array Index
        const symbolFrame: SpriteFrame | undefined = this.SymbolFrames[ symbolType ];

        // 顯示元件或對應 SpriteFrame 不存在時不更新 Symbol
        if ( this.SymbolSprite === null || symbolFrame === undefined )
        {
            return;
        }

        this._currentSymbol = symbolType;
        this.SymbolSprite.spriteFrame = symbolFrame;
    }

    // 將 SlotUnit 還原為初始 Symbol
    public Reset(): void
    {
        this.SetSymbol( this.InitialSymbol );
    }
}