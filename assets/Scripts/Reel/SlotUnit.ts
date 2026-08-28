import { _decorator, Component, Enum, Sprite, SpriteFrame, sp } from 'cc';
import { SymbolType } from '../GameData/SymbolType';

const { ccclass, property } = _decorator;

// 目前 Symbol Win Spine 共用的播放動畫名稱
const WIN_TRIGGER_ANIMATION: string = 'Trig';

// 負責單一 Symbol 的圖示顯示與自身 Win 表現，不判斷是否中獎
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

    // 在目前 SlotUnit 位置播放 Win Spine 的播放器
    @property( { type: sp.Skeleton } )
    public WinEffectSkeleton: sp.Skeleton | null = null;

    // A/J/K/Q 共用的 Win Spine，依 SymbolType 切換 Skin
    @property( { type: sp.SkeletonData } )
    public SymbolAJQKSpine: sp.SkeletonData | null = null;

    // M1 使用的 Win Spine
    @property( { type: sp.SkeletonData } )
    public SymbolM1Spine: sp.SkeletonData | null = null;

    // M2 使用的 Win Spine
    @property( { type: sp.SkeletonData } )
    public SymbolM2Spine: sp.SkeletonData | null = null;

    // M3 使用的 Win Spine
    @property( { type: sp.SkeletonData } )
    public SymbolM3Spine: sp.SkeletonData | null = null;

    // M4 使用的 Win Spine
    @property( { type: sp.SkeletonData } )
    public SymbolM4Spine: sp.SkeletonData | null = null;

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
        this.ResetWin();
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
        this.ResetWin();
        this.SetSymbol( this.InitialSymbol );
    }

    // 依目前 Symbol 選擇對應 Spine 並播放固定 Trig 動畫
    public PlayWin(): void
    {
        if ( this.WinEffectSkeleton === null )
        {
            return;
        }

        const spineData: sp.SkeletonData | null = this.getWinSpineData();

        if ( spineData === null )
        {
            return;
        }

        this.ResetWin();
        this.WinEffectSkeleton.skeletonData = spineData;

        if ( this.isAJQKSymbol() )
        {
            this.WinEffectSkeleton.setSkin( SymbolType[ this._currentSymbol ] );
        }

        this.WinEffectSkeleton.enabled = true;
        this.WinEffectSkeleton.setCompleteListener( this.ResetWin.bind( this ) );
        this.WinEffectSkeleton.setAnimation( 0, WIN_TRIGGER_ANIMATION, false );
    }

    // 停止並隱藏目前 SlotUnit 的 Win Spine
    public ResetWin(): void
    {
        if ( this.WinEffectSkeleton === null )
        {
            return;
        }

        this.WinEffectSkeleton.setCompleteListener( null );
        this.WinEffectSkeleton.clearTracks();
        this.WinEffectSkeleton.enabled = false;
    }

    // 依目前 Symbol 取得對應的 Win Spine 資產
    private getWinSpineData(): sp.SkeletonData | null
    {
        switch ( this._currentSymbol )
        {
            case SymbolType.A:
            case SymbolType.J:
            case SymbolType.K:
            case SymbolType.Q:
                return this.SymbolAJQKSpine;
            case SymbolType.M1:
                return this.SymbolM1Spine;
            case SymbolType.M2:
                return this.SymbolM2Spine;
            case SymbolType.M3:
                return this.SymbolM3Spine;
            case SymbolType.M4:
                return this.SymbolM4Spine;
            default:
                return null;
        }
    }

    private isAJQKSymbol(): boolean
    {
        // A/J/K/Q 共用同一份 Spine，播放前需要依目前 Symbol 切換 Skin
        return this._currentSymbol === SymbolType.A || this._currentSymbol === SymbolType.J || this._currentSymbol === SymbolType.K || this._currentSymbol === SymbolType.Q;
    }
}
