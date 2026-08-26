import { ISymbolMultiplier } from '../GameData/WinRule';
import { IWinResultData } from '../GameData/WinResultData';
import { GameConfig } from '../GameUtility/GameConfig';

// 根據單注、各中獎線與 Symbol 倍率計算單局總得分
export class ScoreCalculator
{
    public CalculateTotalScore( bet: number, winResults: IWinResultData[] ): number
    {
        const symbolMultipliers: ISymbolMultiplier[] = GameConfig.GetInstance().SymbolMultipliers;
        let totalScore: number = 0;

        for ( const winResult of winResults )
        {
            const symbolMultiplier: ISymbolMultiplier | undefined = symbolMultipliers.find( ( configuredMultiplier: ISymbolMultiplier ): boolean => configuredMultiplier.SymbolType === winResult.SymbolType );

            if ( symbolMultiplier === undefined )
            {
                throw new Error( `[ScoreCalculator] SymbolMultiplier for ${winResult.SymbolType} was not found.` );
            }

            const multiplier: number = symbolMultiplier.Multipliers[ winResult.MatchCount ];
            totalScore += bet * multiplier;
        }

        return totalScore;
    }
}
