import { ISymbolMultiplier } from '../GameData/SymbolMultiplier';
import { ILineResultData } from '../GameData/LineResultData';
import { GameConfig } from '../GameUtility/GameConfig';

// 根據單注與 Symbol 倍率計算各中獎線得分及單局總得分
export class ScoreCalculator
{
    // 回填每條中獎線的 Score，並回傳累加後的 TotalScore
    public CalculateScores( bet: number, lineResults: ILineResultData[] ): number
    {
        const symbolMultipliers: ISymbolMultiplier[] = GameConfig.GetInstance().SymbolMultipliers;
        let totalScore: number = 0;

        for ( const lineResult of lineResults )
        {
            // Symbol 倍率完整性已由 GameConfig 保證，LineResult 的 MatchCount 則由 Checker 產生
            const symbolMultiplier: ISymbolMultiplier = symbolMultipliers.find( ( configuredMultiplier: ISymbolMultiplier ): boolean => configuredMultiplier.SymbolType === lineResult.SymbolType )!;
            const multiplier: number = symbolMultiplier.Multipliers[ lineResult.MatchCount ];
            lineResult.Score = bet * multiplier;
            totalScore += lineResult.Score;
        }

        return totalScore;
    }
}
