import { _decorator, Component, Label, Node, UITransform, Vec3, sp } from 'cc';
import { SpinResultData } from '../GameData/SpinResultData';
import { SymbolType } from '../GameData/SymbolType';
import { ReelController } from '../Reel/ReelController';

const { ccclass, property } = _decorator;

// 基本 Win 顯示保留的時間
const REWARD_SHOW_DURATION: number = 1;
// 多個中獎位置輪播效果的切換間隔
const REWARD_EFFECT_INTERVAL: number = 0.4;
// Spine 預設觸發動畫名稱
const REWARD_TRIGGER_ANIMATION: string = 'Trig';

interface IRewardEffectTarget
{
    ReelIndex: number;
    RowIndex: number;
    SymbolType: SymbolType;
}

@ccclass( 'RewardShowProcessor' )
export class RewardShowProcessor extends Component
{
    // A/J/K/Q 共用的中獎 Spine
    @property( { type: sp.SkeletonData } )
    public SymbolAJQKSpine: sp.SkeletonData | null = null;

    // M1 的中獎 Spine
    @property( { type: sp.SkeletonData } )
    public SymbolM1Spine: sp.SkeletonData | null = null;

    // M2 的中獎 Spine
    @property( { type: sp.SkeletonData } )
    public SymbolM2Spine: sp.SkeletonData | null = null;

    // M3 的中獎 Spine
    @property( { type: sp.SkeletonData } )
    public SymbolM3Spine: sp.SkeletonData | null = null;

    // M4 的中獎 Spine
    @property( { type: sp.SkeletonData } )
    public SymbolM4Spine: sp.SkeletonData | null = null;

    // Reward 表演使用的單一 Spine 播放器
    @property( { type: sp.Skeleton } )
    public RewardEffectSkeleton: sp.Skeleton | null = null;

    // 目前是否正在播放 Reward
    private _isShowingReward: boolean = false;

    // Reward 完成時通知 SlotProcessor
    private _onRewardComplete: ( () => void ) | null = null;

    // 目前輪播中的中獎位置
    private _rewardEffectTargets: IRewardEffectTarget[] = [];

    // 目前播放到的中獎位置索引
    private _rewardEffectIndex: number = 0;

    public get IsShowingReward(): boolean
    {
        return this._isShowingReward;
    }

    protected onDisable(): void
    {
        this.unscheduleAllCallbacks();

        if ( this._isShowingReward )
        {
            this.completeReward();
        }

        this.resetRewardEffect();
    }

    // 消費既有 Spin Result，播放最小 Win 表現後通知完成
    public ShowReward( spinResult: SpinResultData, reelController: ReelController, onRewardComplete: () => void ): boolean
    {
        if ( this._isShowingReward )
        {
            return false;
        }

        if ( !this.enabledInHierarchy )
        {
            onRewardComplete();
            return true;
        }

        this._isShowingReward = true;
        this._onRewardComplete = onRewardComplete;
        this.resetRewardEffect();

        // 沒有中獎線時不需要等待 Reward 表現
        if ( spinResult.LineResults.length === 0 )
        {
            this.completeReward();
            return true;
        }

        this.setupRewardEffectTargets( spinResult );
        this.playSymbolEffects( reelController );

        const rewardDuration: number = Math.max( REWARD_SHOW_DURATION, this._rewardEffectTargets.length * REWARD_EFFECT_INTERVAL );
        this.scheduleOnce( this.completeReward, rewardDuration );
        return true;
    }

    // 重設 Reward lifecycle 後發出單次完成通知
    private completeReward(): void
    {
        if ( !this._isShowingReward )
        {
            return;
        }

        const onRewardComplete: ( () => void ) | null = this._onRewardComplete;
        this._isShowingReward = false;
        this._onRewardComplete = null;
        this.resetRewardEffect();
        onRewardComplete?.();
    }

    // 根據 LineResult 建立本輪要播放的中獎位置
    private setupRewardEffectTargets( spinResult: SpinResultData ): void
    {
        this._rewardEffectTargets = [];
        this._rewardEffectIndex = 0;
        const rewardTargetsMap: Map<string, IRewardEffectTarget> = new Map();

        for ( const lineResult of spinResult.LineResults )
        {
            for ( const winningPosition of lineResult.WinningPositions )
            {
                const rewardKey: string = `${winningPosition.ReelIndex}_${winningPosition.RowIndex}`;

                if ( !rewardTargetsMap.has( rewardKey ) )
                {
                    rewardTargetsMap.set( rewardKey, {
                        ReelIndex: winningPosition.ReelIndex,
                        RowIndex: winningPosition.RowIndex,
                        SymbolType: lineResult.SymbolType,
                    } );
                }
            }
        }

        this._rewardEffectTargets = Array.from( rewardTargetsMap.values() );
    }

    // 根據中獎位置播放對應 Symbol 的 Spine 表現
    private playSymbolEffects( reelController: ReelController ): void
    {
        if ( this._rewardEffectTargets.length === 0 )
        {
            return;
        }

        this.playCurrentRewardEffect( reelController );

        if ( this._rewardEffectTargets.length > 1 )
        {
            this.schedule( (): void =>
            {
                if ( !this._isShowingReward )
                {
                    return;
                }

                this._rewardEffectIndex++;

                if ( this._rewardEffectIndex >= this._rewardEffectTargets.length )
                {
                    this._rewardEffectIndex = 0;
                }

                this.playCurrentRewardEffect( reelController );
            }, REWARD_EFFECT_INTERVAL );
        }
    }

    // 播放目前索引的中獎 Symbol 表演
    private playCurrentRewardEffect( reelController: ReelController ): void
    {
        const rewardEffectSkeleton: sp.Skeleton | null = this.getRewardEffectSkeleton();

        if ( rewardEffectSkeleton === null || this._rewardEffectTargets.length === 0 )
        {
            return;
        }

        const uiTransform: UITransform | null = this.node.getComponent( UITransform );

        if ( uiTransform === null )
        {
            return;
        }

        const rewardTarget: IRewardEffectTarget = this._rewardEffectTargets[ this._rewardEffectIndex ];
        const slotUnit = reelController.GetVisibleSlotUnit( rewardTarget.ReelIndex, rewardTarget.RowIndex );

        if ( !slotUnit )
        {
            return;
        }

        const symbolSpineData: sp.SkeletonData | null = this.getSymbolSpineData( rewardTarget.SymbolType );

        if ( symbolSpineData === null )
        {
            return;
        }

        const worldPosition: Vec3 = slotUnit.node.worldPosition.clone();
        const localPosition: Vec3 = uiTransform.convertToNodeSpaceAR( worldPosition, new Vec3() );
        rewardEffectSkeleton.enabled = true;
        rewardEffectSkeleton.node.setPosition( localPosition );
        rewardEffectSkeleton.skeletonData = symbolSpineData;
        this.applySymbolSkin( rewardEffectSkeleton, rewardTarget.SymbolType, symbolSpineData );

        const animationName: string | null = this.getAnimationName( symbolSpineData );

        if ( animationName !== null )
        {
            rewardEffectSkeleton.setAnimation( 0, animationName, false );
        }
    }

    // 優先使用 Inspector 綁定的 Spine，未綁定時退回尋找 RewardEffect 節點
    private getRewardEffectSkeleton(): sp.Skeleton | null
    {
        if ( this.RewardEffectSkeleton )
        {
            return this.RewardEffectSkeleton;
        }

        const rewardEffectNode = this.node.getChildByName( 'RewardEffect' );

        if ( rewardEffectNode )
        {
            const rewardEffectSkeleton: sp.Skeleton | null = rewardEffectNode.getComponent( sp.Skeleton );

            if ( rewardEffectSkeleton )
            {
                return rewardEffectSkeleton;
            }
        }

        const sceneNode = this.node.scene;

        if ( sceneNode === null )
        {
            return null;
        }

        const fallbackRewardEffectNode: Node | null = this.findNodeByNameRecursive( sceneNode, 'RewardEffect' );

        if ( fallbackRewardEffectNode === null )
        {
            return null;
        }

        return fallbackRewardEffectNode.getComponent( sp.Skeleton );
    }

    private findNodeByNameRecursive( rootNode: Node, targetName: string ): Node | null
    {
        if ( rootNode.name === targetName )
        {
            return rootNode;
        }

        for ( const childNode of rootNode.children )
        {
            const foundNode: Node | null = this.findNodeByNameRecursive( childNode, targetName );

            if ( foundNode )
            {
                return foundNode;
            }
        }

        return null;
    }

    // 依 SymbolType 取得對應的 Reward Spine 資產
    private getSymbolSpineData( symbolType: SymbolType ): sp.SkeletonData | null
    {
        switch ( symbolType )
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

    // 優先播放 Trig，找不到時退回第一個可用動畫
    private getAnimationName( spineData: sp.SkeletonData ): string | null
    {
        const runtimeData: unknown = spineData.getRuntimeData();

        if ( typeof runtimeData !== 'object' || runtimeData === null )
        {
            return null;
        }

        const runtimeWithAnimations = runtimeData as { animations?: { name?: string }[] };

        if ( !runtimeWithAnimations.animations || runtimeWithAnimations.animations.length === 0 )
        {
            return null;
        }

        const hasTriggerAnimation: boolean = runtimeWithAnimations.animations.some( ( animationData: { name?: string } ): boolean => animationData.name === REWARD_TRIGGER_ANIMATION );

        if ( hasTriggerAnimation )
        {
            return REWARD_TRIGGER_ANIMATION;
        }

        const animationName: string | undefined = runtimeWithAnimations.animations[ 0 ].name;
        return animationName ?? null;
    }

    // 依 Symbol 套用對應 skin；找不到對應 skin 時保持 Spine 預設 skin
    private applySymbolSkin( rewardEffectSkeleton: sp.Skeleton, symbolType: SymbolType, spineData: sp.SkeletonData ): void
    {
        const symbolSkinName: string = SymbolType[ symbolType ];
        const runtimeData: unknown = spineData.getRuntimeData();

        if ( typeof runtimeData !== 'object' || runtimeData === null )
        {
            return;
        }

        const runtimeWithSkins = runtimeData as { skins?: { name?: string }[] };

        if ( !runtimeWithSkins.skins || runtimeWithSkins.skins.length === 0 )
        {
            return;
        }

        const hasSkin: boolean = runtimeWithSkins.skins.some( ( skinData: { name?: string } ): boolean => skinData.name === symbolSkinName );

        if ( hasSkin )
        {
            rewardEffectSkeleton.setSkin( symbolSkinName );
        }
    }

    // 清除本輪 Reward 狀態與暫存資料
    private resetRewardEffect(): void
    {
        this.unscheduleAllCallbacks();
        this._rewardEffectTargets = [];
        this._rewardEffectIndex = 0;
        const rewardEffectSkeleton: sp.Skeleton | null = this.getRewardEffectSkeleton();

        if ( rewardEffectSkeleton )
        {
            rewardEffectSkeleton.clearTracks();
            rewardEffectSkeleton.enabled = false;
        }
    }
}
