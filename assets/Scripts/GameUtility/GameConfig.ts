import { JsonAsset } from 'cc';
import { GameUtility } from './GameUtility';
import { SYMBOL_TYPE_LIST, SymbolType } from '../GameData/SymbolType';
import { ISymbolMultiplier, WIN_MATCH_COUNTS, WinMatchCount } from '../GameData/WinRule';

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

    public SetConfig( configJson: JsonAsset ): void
    {
        if ( !configJson || !configJson.json )
        {
            throw new Error( '[GameConfig] SetConfig failed: config.json is missing.' );
        }

        const config = configJson.json as unknown as IGameConfig;

        if ( typeof config.SpinSpeed !== 'number' || !Number.isFinite( config.SpinSpeed ) || config.SpinSpeed < 1 )
        {
            throw new Error( '[GameConfig] SpinSpeed must be a number greater than or equal to 1.' );
        }

        if ( typeof config.ShockDistance !== 'number' || !Number.isFinite( config.ShockDistance ) || config.ShockDistance < 0 )
        {
            throw new Error( '[GameConfig] ShockDistance must be a number greater than or equal to 0.' );
        }

        if ( typeof config.ShockDuration !== 'number' || !Number.isFinite( config.ShockDuration ) || config.ShockDuration < 0.01 )
        {
            throw new Error( '[GameConfig] ShockDuration must be a number greater than or equal to 0.01.' );
        }

        if ( typeof config.ReelStopInterval !== 'number' || !Number.isFinite( config.ReelStopInterval ) || config.ReelStopInterval < 0 )
        {
            throw new Error( '[GameConfig] ReelStopInterval must be a number greater than or equal to 0.' );
        }

        if ( typeof config.SpinDuration !== 'number' || !Number.isFinite( config.SpinDuration ) || config.SpinDuration < 0.1 )
        {
            throw new Error( '[GameConfig] SpinDuration must be a number greater than or equal to 0.1.' );
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

    public get Paylines(): number[][]
    {
        return this.getConfig().Paylines.map( ( payline: number[] ): number[] => [ ...payline ] );
    }

    public get SymbolMultipliers(): ISymbolMultiplier[]
    {
        return this.getConfig().SymbolMultipliers.map( ( symbolMultiplier: ISymbolMultiplier ): ISymbolMultiplier => ( { ...symbolMultiplier, Multipliers: { ...symbolMultiplier.Multipliers } } ) );
    }

    private getConfig(): IGameConfig
    {
        if ( this._config === null )
        {
            throw new Error( '[GameConfig] config.json has not been set.' );
        }

        return this._config;
    }

    // 驗證每條 Payline 的軸數、Row Index 與重複設定
    private validatePaylines( paylines: unknown ): void
    {
        if ( !Array.isArray( paylines ) || paylines.length === 0 )
        {
            throw new Error( '[GameConfig] Paylines must be a non-empty array.' );
        }

        const configuredPaylineKeys: Set<string> = new Set<string>();

        for ( const payline of paylines )
        {
            if ( !Array.isArray( payline ) )
            {
                throw new Error( '[GameConfig] Each payline must be an array.' );
            }

            if ( payline.length !== GameUtility.GetSlotColumnCount() )
            {
                throw new Error( '[GameConfig] Each payline must have the same length as the number of slot columns.' );
            }

            for ( const rowIndex of payline )
            {
                if ( typeof rowIndex !== 'number' || !Number.isInteger( rowIndex ) || rowIndex < 0 || rowIndex >= GameUtility.GetSlotRowCount() )
                {
                    throw new Error( '[GameConfig] Each row index in a payline must be an integer between 0 and ' + ( GameUtility.GetSlotRowCount() - 1 ) + '.' );
                }
            }

            const paylineKey: string = payline.join( ',' );

            if ( configuredPaylineKeys.has( paylineKey ) )
            {
                throw new Error( `[GameConfig] Payline ${paylineKey} is duplicated.` );
            }

            configuredPaylineKeys.add( paylineKey );
        }
    }

    // 驗證每種 Symbol 的 3、4、5 軸連線倍率設定
    private validateSymbolMultipliers( symbolMultipliers: unknown ): void
    {
        if ( !Array.isArray( symbolMultipliers ) || symbolMultipliers.length === 0 )
        {
            throw new Error( '[GameConfig] SymbolMultipliers must be a non-empty array.' );
        }

        const configuredSymbolTypes: Set<SymbolType> = new Set<SymbolType>();
        const validMatchCountsText: string = WIN_MATCH_COUNTS.join( ', ' );

        for ( const symbolMultiplier of symbolMultipliers )
        {
            if ( typeof symbolMultiplier !== 'object' || symbolMultiplier === null || Array.isArray( symbolMultiplier ) )
            {
                throw new Error( '[GameConfig] Each SymbolMultiplier must be an object.' );
            }

            const symbolMultiplierData = symbolMultiplier as Partial<ISymbolMultiplier>;
            const symbolType: SymbolType | undefined = symbolMultiplierData.SymbolType;

            if ( typeof symbolType !== 'number' || !SYMBOL_TYPE_LIST.includes( symbolType ) )
            {
                throw new Error( '[GameConfig] SymbolMultiplier contains an invalid SymbolType.' );
            }

            if ( configuredSymbolTypes.has( symbolType ) )
            {
                throw new Error( `[GameConfig] SymbolMultiplier for ${SymbolType[ symbolType ]} is duplicated.` );
            }

            configuredSymbolTypes.add( symbolType );

            const multipliers = symbolMultiplierData.Multipliers;

            if ( typeof multipliers !== 'object' || multipliers === null || Array.isArray( multipliers ) )
            {
                throw new Error( `[GameConfig] Multipliers for ${SymbolType[ symbolType ]} must be an object.` );
            }

            for ( const matchCount of WIN_MATCH_COUNTS )
            {
                const multiplier: number | undefined = multipliers[ matchCount ];

                if ( typeof multiplier !== 'number' || !Number.isFinite( multiplier ) || multiplier < 0 )
                {
                    throw new Error( `[GameConfig] ${SymbolType[ symbolType ]} Match${matchCount} multiplier must be a number greater than or equal to 0.` );
                }
            }

            const multiplierKeys: string[] = Object.keys( multipliers );

            if ( multiplierKeys.length !== WIN_MATCH_COUNTS.length || multiplierKeys.some( ( matchCount: string ): boolean => !WIN_MATCH_COUNTS.includes( Number( matchCount ) as WinMatchCount ) ) )
            {
                throw new Error( `[GameConfig] Multipliers for ${SymbolType[ symbolType ]} must contain only: ${validMatchCountsText}.` );
            }
        }

        if ( configuredSymbolTypes.size !== SYMBOL_TYPE_LIST.length )
        {
            throw new Error( '[GameConfig] SymbolMultipliers must contain multiplier settings for every SymbolType.' );
        }
    }
}
