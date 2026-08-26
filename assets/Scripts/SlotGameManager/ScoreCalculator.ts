import { ISymbolMultiplier } from '../GameData/SymbolMultiplier';
import { ILineResultData } from '../GameData/LineResultData';
import { GameConfig } from '../GameUtility/GameConfig';

// 根據單注與 Symbol 倍率計算各中獎線得分及單局總得分
export class ScoreCalculator
{
    // 回填每條中獎線的 Score，並回傳累加後的 TotalScore
    public CalculateTotalScore( bet: number, lineResults: ILineResultData[] ): number
    {
        const symbolMultipliers: ISymbolMultiplier[] = GameConfig.GetInstance().SymbolMultipliers;
        let totalScore: number = 0;

        for ( const lineResult of lineResults )
        {
            const symbolMultiplier: ISymbolMultiplier | undefined = symbolMultipliers.find( ( configuredMultiplier: ISymbolMultiplier ): boolean => configuredMultiplier.SymbolType === lineResult.SymbolType );

            if ( symbolMultiplier === undefined )
            {
                throw new Error( `[ScoreCalculator] 找不到 ${lineResult.SymbolType} 的倍率設定。` );
            }

            const multiplier: number = symbolMultiplier.Multipliers[ lineResult.MatchCount ];

            if ( typeof multiplier !== 'number' )
            {
                throw new Error( `[ScoreCalculator] 找不到 ${lineResult.SymbolType} 的 ${lineResult.MatchCount} 連倍率。` );
            }

            lineResult.Score = bet * multiplier;
            totalScore += lineResult.Score;
        }

        return totalScore;
    }
}
