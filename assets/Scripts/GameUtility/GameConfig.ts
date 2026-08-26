import { JsonAsset } from 'cc';
import { GameUtility } from './GameUtility';
import { SYMBOL_TYPE_LIST, SymbolType } from '../GameData/SymbolType';
import { ISymbolMultiplier } from '../GameData/SymbolMultiplier';

export interface IGameConfig
{
    readonly SpinSpeed: number;
    readonly ShockDistance: number;
    readonly ShockDuration: number;
    readonly ReelStopInterval: number;
    readonly SpinDuration: number;
    readonly Paylines: number[][];
    readonly SymbolMultipliers: ISymbolMultiplier[];
}

export class GameConfig
{
    private static _instance: GameConfig | null = null;
    private _config: IGameConfig | null = null;

    private constructor()
    {
    }

    public static GetInstance(): GameConfig
    {
        if ( GameConfig._instance === null )
        {
            GameConfig._instance = new GameConfig();
        }

        return GameConfig._instance;
    }

    // 載入並檢查遊戲設定
    public SetConfig( configJson: JsonAsset ): void
    {
        if ( !configJson || !configJson.json )
        {
            throw new Error( '[GameConfig] 找不到 config.json。' );
        }

        const config = configJson.json as IGameConfig;

        // 避免速度或時間設定造成 Reel 無法正常運作
        if ( config.SpinSpeed <= 0 || config.ShockDistance < 0 || config.ShockDuration <= 0 || config.ReelStopInterval < 0 || config.SpinDuration < 0 )
        {
            throw new Error( '[GameConfig] Reel 的速度、距離或時間設定不合法。' );
        }

        this.validatePaylines( config.Paylines );
        this.validateSymbolMultipliers( config.SymbolMultipliers );

        this._config = config;
    }

    public get SpinSpeed(): number
    {
        return this.getConfig().SpinSpeed;
    }

    public get ShockDistance(): number
    {
        return this.getConfig().ShockDistance;
    }

    public get ShockDuration(): number
    {
        return this.getConfig().ShockDuration;
    }

    public get ReelStopInterval(): number
    {
        return this.getConfig().ReelStopInterval;
    }

    public get SpinDuration(): number
    {
        return this.getConfig().SpinDuration;
    }

    // 回傳副本，避免外部直接修改 Config 內的 Payline
    public get Paylines(): number[][]
    {
        return this.getConfig().Paylines.map( ( payline: number[] ): number[] => [ ...payline ] );
    }

    // 回傳副本，避免外部直接修改 Config 內的倍率資料
    public get SymbolMultipliers(): ISymbolMultiplier[]
    {
        return this.getConfig().SymbolMultipliers.map( ( symbolMultiplier: ISymbolMultiplier ): ISymbolMultiplier => ( { ...symbolMultiplier, Multipliers: { ...symbolMultiplier.Multipliers } } ) );
    }

    // 取得已載入的遊戲設定
    private getConfig(): IGameConfig
    {
        if ( this._config === null )
        {
            throw new Error( '[GameConfig] config.json 尚未載入。' );
        }

        return this._config;
    }

    // 確認每條 Payline 都能正確對應目前的 Slot 盤面
    private validatePaylines( paylines: number[][] ): void
    {
        if ( !Array.isArray( paylines ) || paylines.length === 0 )
        {
            throw new Error( '[GameConfig] 至少需要設定一條 Payline。' );
        }

        const configuredPaylineKeys: Set<string> = new Set<string>();

        for ( const payline of paylines )
        {
            // 一條 Payline 必須包含每一軸的 Row Index
            if ( !Array.isArray( payline ) || payline.length !== GameUtility.GetSlotColumnCount() )
            {
                throw new Error( '[GameConfig] Payline 的長度必須與 Reel 數量相同。' );
            }

            // Row Index 必須落在目前盤面的有效範圍內
            for ( const rowIndex of payline )
            {
                if ( !Number.isInteger( rowIndex ) || rowIndex < 0 || rowIndex >= GameUtility.GetSlotRowCount() )
                {
                    throw new Error( '[GameConfig] Payline 包含無效的 Row Index。' );
                }
            }

            const paylineKey: string = payline.join( ',' );

            if ( configuredPaylineKeys.has( paylineKey ) )
            {
                throw new Error( `[GameConfig] Payline 設定重複：${paylineKey}。` );
            }

            configuredPaylineKeys.add( paylineKey );
        }
    }

    // 確認每種 Symbol 都有從最低連線數到最大軸數的完整倍率
    private validateSymbolMultipliers( symbolMultipliers: ISymbolMultiplier[] ): void
    {
        if ( !Array.isArray( symbolMultipliers ) || symbolMultipliers.length !== SYMBOL_TYPE_LIST.length )
        {
            throw new Error( '[GameConfig] Symbol 倍率設定數量不正確。' );
        }

        for ( const symbolType of SYMBOL_TYPE_LIST )
        {
            const symbolMultiplier: ISymbolMultiplier | undefined = symbolMultipliers.find( ( multiplier: ISymbolMultiplier ): boolean => multiplier.SymbolType === symbolType );

            // 每種 Symbol 都必須有對應的倍率設定
            if ( symbolMultiplier === undefined )
            {
                throw new Error( `[GameConfig] 缺少 ${SymbolType[ symbolType ]} 的倍率設定。` );
            }

            if ( !symbolMultiplier.Multipliers || typeof symbolMultiplier.Multipliers !== 'object' || Array.isArray( symbolMultiplier.Multipliers ) )
            {
                throw new Error( `[GameConfig] ${SymbolType[ symbolType ]} 的倍率設定格式不合法。` );
            }

            const matchCounts: number[] = Object.keys( symbolMultiplier.Multipliers ).map( ( matchCount: string ): number => Number( matchCount ) ).sort( ( firstCount: number, secondCount: number ): number => firstCount - secondCount );

            if ( matchCounts.length === 0 )
            {
                throw new Error( `[GameConfig] ${SymbolType[ symbolType ]} 至少需要一組連線倍率。` );
            }

            const configuredMatchCounts: Set<number> = new Set<number>();

            for ( const matchCount of matchCounts )
            {
                const multiplier: number = symbolMultiplier.Multipliers[ matchCount ];

                if ( !Number.isInteger( matchCount ) || matchCount <= 0 || matchCount > GameUtility.GetSlotColumnCount() || !Number.isFinite( multiplier ) || multiplier < 0 )
                {
                    throw new Error( `[GameConfig] ${SymbolType[ symbolType ]} 的 ${matchCount} 連倍率設定不合法。` );
                }

                configuredMatchCounts.add( matchCount );
            }

            const minimumMatchCount: number = matchCounts[ 0 ];

            for ( let matchCount: number = minimumMatchCount; matchCount <= GameUtility.GetSlotColumnCount(); matchCount++ )
            {
                if ( !configuredMatchCounts.has( matchCount ) )
                {
                    throw new Error( `[GameConfig] ${SymbolType[ symbolType ]} 缺少 ${matchCount} 連倍率設定。` );
                }
            }
        }
    }
}
