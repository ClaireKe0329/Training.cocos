import { JsonAsset } from 'cc';
import { GameUtility } from './GameUtility';
import { SYMBOL_TYPE_LIST, SymbolType } from '../GameData/SymbolType';
import { ISymbolMultiplier } from '../GameData/SymbolMultiplier';
import { IReelSpeedSettings, IReelSpeedSetting } from '../Reel/ReelSpeed';

// 共用選擇型設定；未來 Bet 選單可沿用同一份資料結構
export interface ISelectionSettings
{
    readonly SelectionOptions: number[];
}

// Auto 除了可選局數之外，還需要知道哪個值代表 Infinite
export interface IAutoSpinSettings extends ISelectionSettings
{
    readonly InfiniteCount: number;
}

// 定義 config.json 載入後必須提供的遊戲設定
export interface IGameConfig
{
    // Reel 的 Normal、Turbo、Skip 三種速度設定
    readonly ReelSpeedSettings: IReelSpeedSettings;

    // Reel 停止時 Shock 的最大位移距離
    readonly ShockDistance: number;

    // Reel Shock 動畫持續時間
    readonly ShockDuration: number;

    // 遊戲啟動時的初始 Balance
    readonly InitialBalance: number;

    // 遊戲啟動時的初始 Bet
    readonly InitialBet: number;

    // Win 表現播放後等待 Round 繼續的時間
    readonly RewardShowDuration: number;

    // Auto 可選局數與 Infinite sentinel
    readonly AutoSpinSettings: IAutoSpinSettings;

    // 所有 Payline，每個值代表該 Reel 對應的 Row Index
    readonly Paylines: number[][];

    // 每種 Symbol 在不同連線數量下的得分倍率
    readonly SymbolMultipliers: ISymbolMultiplier[];
}

// 集中載入、驗證並提供整台 Slot 共用的遊戲設定
export class GameConfig
{
    // 全專案共用的 GameConfig Instance
    private static _instance: GameConfig | null = null;

    // 已通過驗證、可供下游使用的設定
    private _config: IGameConfig | null = null;

    // GameConfig 只允許透過 GetInstance() 取得
    private constructor()
    {
    }

    // 取得全專案共用的 GameConfig
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

        // 檢查 Reel 運作所需的基本數值設定
        if ( config.ShockDistance < 0 || config.ShockDuration <= 0 )
        {
            throw new Error( '[GameConfig] Reel 的 Shock 設定不合法。' );
        }
        this.validateReelSpeedSettings( config.ReelSpeedSettings );

        // 檢查遊戲初始資料與 Reward 顯示時間
        if (
            typeof config.InitialBalance !== 'number' || config.InitialBalance < 0 ||
            typeof config.InitialBet !== 'number' || config.InitialBet <= 0 ||
            typeof config.RewardShowDuration !== 'number' || config.RewardShowDuration < 0
        )
        {
            throw new Error( '[GameConfig] Balance、Bet 或 Reward 顯示時間設定不合法。' );
        }

        this.validateAutoSpinSettings( config.AutoSpinSettings );
        this.validatePaylines( config.Paylines );
        this.validateSymbolMultipliers( config.SymbolMultipliers );

        this._config = config;
    }

    public get ShockDistance(): number
    {
        return this.getConfig().ShockDistance;
    }

    public get ShockDuration(): number
    {
        return this.getConfig().ShockDuration;
    }

    // 回傳副本，避免外部直接修改 Config 內的 ReelSpeedSettings
    public get ReelSpeedSettings(): IReelSpeedSettings
    {
        const reelSpeedSettings: IReelSpeedSettings = this.getConfig().ReelSpeedSettings;

        return {
            Normal: { ...reelSpeedSettings.Normal },
            Turbo: { ...reelSpeedSettings.Turbo },
            Skip: { ...reelSpeedSettings.Skip },
        };
    }

    public get InitialBalance(): number
    {
        return this.getConfig().InitialBalance;
    }

    public get InitialBet(): number
    {
        return this.getConfig().InitialBet;
    }

    public get RewardShowDuration(): number
    {
        return this.getConfig().RewardShowDuration;
    }

    // 回傳副本，避免外部直接修改 Config 保存的 Auto 選項
    public get AutoSpinSelectionOptions(): number[]
    {
        return [ ...this.getConfig().AutoSpinSettings.SelectionOptions ];
    }

    public get AutoSpinInfiniteCount(): number
    {
        return this.getConfig().AutoSpinSettings.InfiniteCount;
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

    // 確認三種 Reel Speed 設定存在，且各自的速度與時間可正常使用
    private validateReelSpeedSettings( reelSpeedSettings: IReelSpeedSettings ): void
    {
        if ( !reelSpeedSettings?.Normal || !reelSpeedSettings.Turbo || !reelSpeedSettings.Skip )
        {
            throw new Error( '[GameConfig] 缺少 Normal、Turbo 或 Skip 的 Reel Speed 設定。' );
        }

        const speedSettings: IReelSpeedSetting[] = [ reelSpeedSettings.Normal, reelSpeedSettings.Turbo, reelSpeedSettings.Skip ];

        for ( const speedSetting of speedSettings )
        {
            if ( speedSetting.SpinSpeed <= 0 || speedSetting.SpinDuration < 0 || speedSetting.ReelStopInterval < 0 )
            {
                throw new Error( '[GameConfig] Reel Speed 設定不合法。' );
            }
        }
    }

    // Config 只保證 Auto 必要設定存在且數值可使用；實際選項內容由 config.json 維護者負責
    private validateAutoSpinSettings( autoSpinSettings: IAutoSpinSettings ): void
    {
        if ( !autoSpinSettings?.SelectionOptions || autoSpinSettings.SelectionOptions.length === 0 )
        {
            throw new Error( '[GameConfig] 缺少 Auto Spin 選項設定。' );
        }

        for ( const option of autoSpinSettings.SelectionOptions )
        {
            if ( option <= 0 )
            {
                throw new Error( '[GameConfig] Auto Spin 選項必須大於 0。' );
            }
        }

        if ( !autoSpinSettings.InfiniteCount || autoSpinSettings.InfiniteCount <= 0 )
        {
            throw new Error( '[GameConfig] 缺少有效的 Auto Spin Infinite 設定。' );
        }
    }

    // 確認每條 Payline 都能正確對應目前的 Slot 盤面
    private validatePaylines( paylines: number[][] ): void
    {
        if ( !Array.isArray( paylines ) || paylines.length === 0 )
        {
            throw new Error( '[GameConfig] 至少需要設定一條 Payline。' );
        }

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
        }
    }

    // 確認每種 Symbol 都有可使用的連線倍率
    private validateSymbolMultipliers( symbolMultipliers: ISymbolMultiplier[] ): void
    {
        for ( const symbolType of SYMBOL_TYPE_LIST )
        {
            const symbolMultiplier: ISymbolMultiplier | undefined = symbolMultipliers.find( ( multiplier: ISymbolMultiplier ): boolean => multiplier.SymbolType === symbolType );

            // 每種 Symbol 都必須有對應的倍率設定
            if ( symbolMultiplier === undefined || !symbolMultiplier.Multipliers )
            {
                throw new Error( `[GameConfig] 缺少 ${SymbolType[ symbolType ]} 的倍率設定。` );
            }

            // 最小倍率 Key 代表此 Symbol 的最低中獎連線數
            const matchCounts: number[] = Object.keys( symbolMultiplier.Multipliers ).map( Number );

            if ( matchCounts.length === 0 )
            {
                throw new Error( `[GameConfig] 缺少 ${SymbolType[ symbolType ]} 的倍率設定。` );
            }

            const minimumMatchCount: number = Math.min( ...matchCounts );

            // 從最低中獎連線數到最大 Reel 數都必須有倍率
            for ( let matchCount: number = minimumMatchCount; matchCount <= GameUtility.GetSlotColumnCount(); matchCount++ )
            {
                const multiplier: number = symbolMultiplier.Multipliers[ matchCount ];

                if ( typeof multiplier !== 'number' || multiplier < 0 )
                {
                    throw new Error( `[GameConfig] ${SymbolType[ symbolType ]} 缺少 ${matchCount} 連的有效倍率。` );
                }
            }
        }
    }
}
